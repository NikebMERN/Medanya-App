const {
    verifyFirebaseToken,
    findOrCreateUser,
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

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                phone: user.phone_number,
                role: user.role,
                display_name: user.display_name ?? null,
                email: user.email ?? null,
                neighborhood: user.neighborhood ?? null,
                avatar_url: user.avatar_url ?? null,
                otp_verified: !!user.otp_verified,
                kyc_face_verified: !!(user.kyc_face_verified),
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
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                phone: user.phone_number,
                role: user.role,
                display_name: user.display_name ?? null,
                email: user.email ?? null,
                neighborhood: user.neighborhood ?? null,
                avatar_url: user.avatar_url ?? null,
                otp_verified: !!user.otp_verified,
                kyc_face_verified: !!(user.kyc_face_verified),
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
        next(err);
    }
};

module.exports = {
    verifyOtpAndLogin,
    sendOtpHandler,
    verifyOtpAndLoginServer,
};
