const {
    verifyFirebaseToken,
    findOrCreateUser,
    issueJWT,
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
            },
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { verifyOtpAndLogin };
