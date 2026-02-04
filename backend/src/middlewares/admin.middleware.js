// src/middlewares/admin.middleware.js
const { ROLES } = require("../utils/roles.util");

/**
 * requireRole(...roles)
 * Requires req.user to exist (auth.middleware must run before).
 * - 401 if no req.user
 * - 403 if role not allowed
 * - next() if allowed
 */
const requireRole = (...roles) => {
    const allowed = roles.flat();

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: { code: "UNAUTHORIZED", message: "Authentication required" },
            });
        }

        const role = req.user.role;
        if (!role || !allowed.includes(role)) {
            return res.status(403).json({
                error: { code: "FORBIDDEN", message: "Insufficient permissions" },
            });
        }

        return next();
    };
};

module.exports = { requireRole, ROLES };
