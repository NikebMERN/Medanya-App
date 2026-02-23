const {
    verifyFirebaseToken,
    findOrCreateUser,
    findOrCreateGuestUser,
    issueJWT,
    sendOtp,
    verifyOtp,
} = require("./auth.service");

const verifyOtpAndLogin = async (req, res, next) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({ message: "Firebase ID token required" });
        }

        const firebaseUser = await verifyFirebaseToken(idToken);
        const user = await findOrCreateUser(firebaseUser);

        if (user.is_banned) {
            return res.status(403).json({ message: "User banned" });
        }

        const token = issueJWT(user);

        const dobVal = user.dob;
        const dobStr = dobVal instanceof Date ? dobVal.toISOString().slice(0, 10) : (dobVal ? String(dobVal) : null);
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                phone: user.phone_number,
                role: user.role,
                display_name: user.display_name ?? null,
                full_name: user.full_name ?? null,
                email: user.email ?? null,
                neighborhood: user.neighborhood ?? null,
                avatar_url: user.avatar_url ?? null,
                dob: dobStr,
                otp_verified: !!user.otp_verified,
                kyc_face_verified: !!(user.kyc_face_verified),
                account_private: !!user.account_private,
            },
        });
    } catch (err) {
        next(err);
    }
};

const sendOtpHandler = async (req, res, next) => {
    try {
        const { phone, recaptchaToken, sessionInfo } = req.body;
        await sendOtp(phone, recaptchaToken, sessionInfo);
        res.json({ success: true, message: "OTP sent", expiresIn: 300 });
    } catch (err) {
        if (err.code === "OTP_COOLDOWN" || err.code === "OTP_SEND_LIMIT") {
            return res.status(err.status || 429).json({
                success: false,
                message: err.message,
                code: err.code,
            });
        }
        if (err.code === "RECAPTCHA_REQUIRED") {
            return res.status(400).json({
                success: false,
                message: err.message,
                code: err.code,
            });
        }
        next(err);
    }
};

const verifyOtpAndLoginServer = async (req, res, next) => {
    try {
        const { phone, code } = req.body;
        const user = await verifyOtp(phone, code);

        if (user.is_banned) {
            return res.status(403).json({ success: false, message: "User banned" });
        }

        const token = issueJWT(user);
        const dobVal = user.dob;
        const dobStr = dobVal instanceof Date ? dobVal.toISOString().slice(0, 10) : (dobVal ? String(dobVal) : null);
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                phone: user.phone_number,
                role: user.role,
                display_name: user.display_name ?? null,
                full_name: user.full_name ?? null,
                email: user.email ?? null,
                neighborhood: user.neighborhood ?? null,
                avatar_url: user.avatar_url ?? null,
                dob: dobStr,
                otp_verified: !!user.otp_verified,
                kyc_face_verified: !!(user.kyc_face_verified),
                account_private: !!user.account_private,
            },
        });
    } catch (err) {
        if (err.code === "INVALID_OTP" || err.code === "OTP_COOLDOWN") {
            return res.status(err.status || 400).json({
                success: false,
                message: err.message,
                code: err.code,
            });
        }
        if (err.code === "PHONE_BANNED" || err.code === "USER_BANNED") {
            return res.status(err.status || 403).json({
                success: false,
                message: err.message,
                code: err.code,
            });
        }
        next(err);
    }
};

const guestLogin = async (req, res, next) => {
    try {
        const user = await findOrCreateGuestUser();
        if (user.is_banned) {
            return res.status(403).json({ success: false, message: "Guest access is disabled" });
        }
        const token = issueJWT(user);
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                phone: user.phone_number,
                role: "guest",
                display_name: "Guest",
                email: null,
                neighborhood: null,
                avatar_url: null,
                otp_verified: false,
                kyc_face_verified: false,
                isGuest: true,
            },
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    verifyOtpAndLogin,
    sendOtpHandler,
    verifyOtpAndLoginServer,
    guestLogin,
};
