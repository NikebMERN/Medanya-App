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

/**
 * Find or create a shared guest user. Guest users can only watch videos.
 */
async function findOrCreateGuestUser() {
    const [rows] = await pool.query(
        "SELECT * FROM users WHERE phone_number = ? LIMIT 1",
        ["guest_medanya"]
    );
    if (rows.length) return rows[0];
    try {
        const [result] = await pool.query(
            "INSERT INTO users (phone_number, display_name, role, is_verified) VALUES (?, ?, ?, 1)",
            ["guest_medanya", "Guest", "guest", 1]
        );
        const [user] = await pool.query("SELECT * FROM users WHERE id = ?", [result.insertId]);
        return user[0];
    } catch (e) {
        if (e.code === "ER_DUP_ENTRY") {
            const [r] = await pool.query("SELECT * FROM users WHERE phone_number = ? LIMIT 1", ["guest_medanya"]);
            return r[0];
        }
        throw e;
    }
}

function toE164(normalized) {
    if (!normalized) return normalized;
    return normalized.startsWith("+") ? normalized : `+${normalized}`;
}

async function findOrCreateUserByPhone(phone) {
    const normalized = normalizePhone(phone);
    const e164 = toE164(normalized);
    // Match DB whether phone is stored as +251... or 251... (e.g. seed uses +251...)
    const [rows] = await pool.query(
        "SELECT * FROM users WHERE phone_number = ? OR phone_number = ?",
        [normalized, e164]
    );
    if (rows.length) return rows[0];
    const [result] = await pool.query(
        "INSERT INTO users (phone_number, is_verified) VALUES (?, 1)",
        [e164]
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
function getAdminTestPhones() {
    const raw = process.env.ADMIN_TEST_PHONES;
    if (!raw || typeof raw !== "string") return new Set();
    return new Set(
        raw
            .split(",")
            .map((s) => String(s).replace(/\D/g, ""))
            .filter((s) => s.length >= 9)
    );
}

async function sendOtp(phone, recaptchaToken, sessionInfoFromClient) {
    const normalized = normalizePhone(phone);
    if (!normalized || normalized.length < 9) {
        const err = new Error("Invalid phone number");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const isDevBypass =
        process.env.NODE_ENV === "development" &&
        getAdminTestPhones().has(normalized);

    if (!isDevBypass) {
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
    }

    const sessionKey = `otp_session:${normalized}`;
    let sessionInfo;

    if (sessionInfoFromClient) {
        sessionInfo = sessionInfoFromClient;
    } else if (isDevBypass) {
        sessionInfo = `dev-bypass:${normalized}`;
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
                    "Phone verification requires app verification. Add your number as a test number in Firebase Console (Authentication > Sign-in method > Phone > Phone numbers for testing) and use that code, or set ADMIN_TEST_PHONES in .env for development."
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
    const { isPhoneBanned } = require("../moderation/moderation.service");
    if (await isPhoneBanned(normalized)) {
        const err = new Error("This phone number is banned and cannot sign in.");
        err.code = "PHONE_BANNED";
        err.status = 403;
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

    const devOtpCode = process.env.ADMIN_TEST_OTP_CODE || "123456";
    const isDevBypassSession = sessionInfo.startsWith("dev-bypass:");

    if (isDevBypassSession && codeStr === devOtpCode) {
        user = await findOrCreateUserByPhone(normalized);
        if (user && user.is_banned) {
            const err = new Error("This account is banned.");
            err.code = "USER_BANNED";
            err.status = 403;
            throw err;
        }
    } else if (isDevBypassSession) {
        const attempts = await redisClient.incr(attemptsKey);
        if (attempts === 1) await redisClient.expire(attemptsKey, OTP_VERIFY_ATTEMPTS_WINDOW_SEC);
        if (attempts >= OTP_VERIFY_MAX_ATTEMPTS) {
            await redisClient.setEx(cooldownKey, OTP_COOLDOWN_SEC, "1");
            await redisClient.del(sessionKey);
        }
        const err = new Error("Invalid OTP code");
        err.code = "INVALID_OTP";
        err.status = 400;
        throw err;
    } else {
    try {
        const { idToken, phoneNumber } = await signInWithPhoneNumber(sessionInfo, codeStr);
        const phoneFromFirebase = phoneNumber ? normalizePhone(phoneNumber) : normalized;
        user = await findOrCreateUserByPhone(phoneFromFirebase);
        if (user && user.is_banned) {
            const err = new Error("This account is banned.");
            err.code = "USER_BANNED";
            err.status = 403;
            throw err;
        }
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
    }

    await redisClient.del(sessionKey);
    await redisClient.del(attemptsKey);

    // Mark user as OTP verified (required for posting jobs/listings)
    try {
        await pool.query("UPDATE users SET otp_verified = 1 WHERE id = ?", [user.id]);
        user.otp_verified = 1;
    } catch (e) {
        // Column may not exist yet; migration 016 adds it
    }
    return user;
}

module.exports = {
    verifyFirebaseToken,
    findOrCreateUser,
    findOrCreateUserByPhone,
    findOrCreateGuestUser,
    issueJWT,
    sendOtp,
    verifyOtp,
};
