const admin = require("../../config/firebase");
const jwt = require("jsonwebtoken");
const { pool } = require("../../config/mysql");
const { redisClient } = require("../../config/redis");
const { sendVerificationCode, signInWithPhoneNumber } = require("./firebase-phone");

const OTP_SESSION_TTL_SEC = 5 * 60;
const OTP_SEND_WINDOW_SEC = 5 * 60;
const OTP_SEND_MAX_PER_WINDOW = 3;
const OTP_VERIFY_ATTEMPTS_WINDOW_SEC = 15 * 60;
const OTP_VERIFY_MAX_ATTEMPTS = 5;
const OTP_COOLDOWN_SEC = 15 * 60;

function normalizePhone(phone) {
    const s = String(phone || "").replace(/\D/g, "");
    return s || null;
}

const normalizeIdToken = (raw) => {
    if (!raw) return raw;
    if (typeof raw !== "string") return "";
    const token = raw.trim();
    if (token.toLowerCase().startsWith("bearer ")) return token.slice(7).trim();
    return token;
};

const verifyFirebaseToken = async (idToken) => {
    const normalized = normalizeIdToken(idToken);
    const decoded = await admin.auth().verifyIdToken(normalized);

    return {
        phone: decoded.phone_number || null,
        email: decoded.email || null,
        firebaseUid: decoded.uid,
        provider: decoded.firebase?.sign_in_provider,
    };
};

const findOrCreateUser = async ({ phone, email, firebaseUid }) => {
    const [rows] = await pool.query(
        "SELECT * FROM users WHERE firebase_uid = ?",
        [firebaseUid]
    );

    if (rows.length) return rows[0];

    const [result] = await pool.query(
        `
    INSERT INTO users (phone_number, email, firebase_uid, is_verified)
    VALUES (?, ?, ?, ?)
    `,
        [phone, email, firebaseUid, 1]
    );

    const [user] = await pool.query("SELECT * FROM users WHERE id = ?", [
        result.insertId,
    ]);

    return user[0];
};

const issueJWT = (user) => {
    return jwt.sign(
        {
            userId: user.id,
            role: user.role,
            phone: user.phone_number,
        },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
    );
};

async function findOrCreateUserByPhone(phone) {
    const normalized = normalizePhone(phone);
    const [rows] = await pool.query("SELECT * FROM users WHERE phone_number = ?", [normalized]);
    if (rows.length) return rows[0];
    const [result] = await pool.query(
        "INSERT INTO users (phone_number, is_verified) VALUES (?, 1)",
        [normalized]
    );
    const [user] = await pool.query("SELECT * FROM users WHERE id = ?", [result.insertId]);
    return user[0];
}

/**
 * Send OTP via Firebase Phone Auth.
 * Two supported flows:
 * 1. Client sends sessionInfo (e.g. from Firebase signInWithPhoneNumber in app) -> we just store it (SMS already sent by client).
 * 2. Client sends recaptchaToken -> we call Firebase sendVerificationCode (Firebase sends SMS).
 * If neither is sent, we try calling Firebase without recaptchaToken; Firebase may reject or accept (e.g. test numbers).
 */
async function sendOtp(phone, recaptchaToken, sessionInfoFromClient) {
    const normalized = normalizePhone(phone);
    if (!normalized || normalized.length < 9) {
        const err = new Error("Invalid phone number");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const cooldownKey = `otp_cooldown:${normalized}`;
    const inCooldown = await redisClient.get(cooldownKey);
    if (inCooldown) {
        const err = new Error("Too many failed attempts. Try again later.");
        err.code = "OTP_COOLDOWN";
        err.status = 429;
        throw err;
    }

    const sendKey = `otp_send:${normalized}`;
    const sendCount = await redisClient.incr(sendKey);
    if (sendCount === 1) await redisClient.expire(sendKey, OTP_SEND_WINDOW_SEC);
    if (sendCount > OTP_SEND_MAX_PER_WINDOW) {
        const err = new Error("Too many OTP requests. Try again later.");
        err.code = "OTP_SEND_LIMIT";
        err.status = 429;
        throw err;
    }

    const sessionKey = `otp_session:${normalized}`;
    let sessionInfo;

    if (sessionInfoFromClient) {
        sessionInfo = sessionInfoFromClient;
    } else {
        const e164 = normalized.startsWith("+") ? normalized : `+${normalized}`;
        try {
            const result = await sendVerificationCode(e164, recaptchaToken);
            sessionInfo = result.sessionInfo;
        } catch (e) {
            const needsClientVerification =
                e.code === "FIREBASE_PHONE_ERROR" ||
                e.message?.includes("recaptcha") ||
                e.message?.includes("RECAPTCHA") ||
                e.message === "MISSING_CLIENT_IDENTIFIER";
            if (needsClientVerification) {
                const err = new Error(
                    "Phone verification requires app verification. Add your number as a test number in Firebase Console (Authentication > Sign-in method > Phone > Phone numbers for testing) and use that code, or use Google/Facebook sign-in."
                );
                err.code = "RECAPTCHA_REQUIRED";
                err.status = 400;
                throw err;
            }
            throw e;
        }
    }

    await redisClient.setEx(sessionKey, OTP_SESSION_TTL_SEC, sessionInfo);
    return { sent: true, expiresIn: OTP_SESSION_TTL_SEC };
}

/**
 * Verify OTP with Firebase (signInWithPhoneNumber), then find/create user and return user for JWT.
 */
async function verifyOtp(phone, code) {
    const normalized = normalizePhone(phone);
    if (!normalized || normalized.length < 9) {
        const err = new Error("Invalid phone number");
        err.code = "VALIDATION_ERROR";
        throw err;
    }
    const codeStr = String(code || "").trim();
    if (!codeStr || codeStr.length !== 6) {
        const err = new Error("Invalid OTP code");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const cooldownKey = `otp_cooldown:${normalized}`;
    const inCooldown = await redisClient.get(cooldownKey);
    if (inCooldown) {
        const err = new Error("Too many failed attempts. Try again later.");
        err.code = "OTP_COOLDOWN";
        err.status = 429;
        throw err;
    }

    const sessionKey = `otp_session:${normalized}`;
    const sessionInfo = await redisClient.get(sessionKey);
    if (!sessionInfo) {
        const err = new Error("Invalid or expired OTP. Request a new code.");
        err.code = "INVALID_OTP";
        err.status = 400;
        throw err;
    }

    const attemptsKey = `otp_verify_attempts:${normalized}`;
    let user;

    try {
        const { idToken, phoneNumber } = await signInWithPhoneNumber(sessionInfo, codeStr);
        const phoneFromFirebase = phoneNumber ? normalizePhone(phoneNumber) : normalized;
        user = await findOrCreateUserByPhone(phoneFromFirebase);
    } catch (e) {
        const attempts = await redisClient.incr(attemptsKey);
        if (attempts === 1) await redisClient.expire(attemptsKey, OTP_VERIFY_ATTEMPTS_WINDOW_SEC);
        if (attempts >= OTP_VERIFY_MAX_ATTEMPTS) {
            await redisClient.setEx(cooldownKey, OTP_COOLDOWN_SEC, "1");
            await redisClient.del(sessionKey);
        }
        const err = new Error(e.message || "Invalid or expired OTP");
        err.code = "INVALID_OTP";
        err.status = 400;
        throw err;
    }

    await redisClient.del(sessionKey);
    await redisClient.del(attemptsKey);
    return user;
}

module.exports = {
    verifyFirebaseToken,
    findOrCreateUser,
    findOrCreateUserByPhone,
    issueJWT,
    sendOtp,
    verifyOtp,
};
