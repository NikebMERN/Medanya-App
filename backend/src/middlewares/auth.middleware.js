const jwt = require("jsonwebtoken");
const { pool } = require("../config/mysql");

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== "string") {
        return res.status(401).json({
            error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
    }

    const parts = authHeader.trim().split(/\s+/);
    const token = parts[0] === "Bearer" ? parts[1] : parts[0];
    if (!token || typeof token !== "string") {
        return res.status(401).json({
            error: { code: "UNAUTHORIZED", message: "Invalid authorization header" },
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // JWT payload from auth.service.issueJWT: { userId, role, phone }
        const userId = decoded.userId ?? decoded.id;
        if (!userId) {
            return res.status(401).json({
                error: { code: "UNAUTHORIZED", message: "Invalid token" },
            });
        }
        const [rows] = await pool.query(
            "SELECT is_banned FROM users WHERE id = ?",
            [userId],
        );
        if (!rows.length) {
            return res.status(401).json({
                error: { code: "UNAUTHORIZED", message: "Invalid user" },
            });
        }
        if (rows[0].is_banned) {
            return res.status(403).json({
                error: { code: "BANNED", message: "User is banned" },
            });
        }

        req.user = {
            id: String(userId),
            userId: String(userId),
            role: decoded.role,
            phone_number: decoded.phone ?? decoded.phone_number,
        };
        return next();
    } catch (err) {
        return res.status(401).json({
            error: { code: "UNAUTHORIZED", message: "Invalid token" },
        });
    }
};

module.exports = authMiddleware;
