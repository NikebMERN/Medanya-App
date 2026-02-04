const jwt = require("jsonwebtoken");
const { pool } = require("../config/mysql");

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({
            error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // decoded should include: { id, phone_number, role }
        // Ban check (DB)
        const [rows] = await pool.query(
            "SELECT is_banned FROM users WHERE id = ?",
            [decoded.id],
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

        req.user = decoded;
        return next();
    } catch (err) {
        return res.status(401).json({
            error: { code: "UNAUTHORIZED", message: "Invalid token" },
        });
    }
};

module.exports = authMiddleware;
