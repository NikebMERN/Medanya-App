// src/utils/socketAuth.util.js
const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwt");
const { pool } = require("../config/mysql");

/**
 * Extract token from:
 *  - socket.handshake.auth.token
 *  - Authorization header: "Bearer <token>"
 */
function extractToken(socket) {
    const authToken = socket?.handshake?.auth?.token;
    if (authToken && typeof authToken === "string") return authToken;

    const header = socket?.handshake?.headers?.authorization;
    if (header && typeof header === "string") {
        const parts = header.split(" ");
        if (parts.length === 2 && parts[0].toLowerCase() === "bearer")
            return parts[1];
    }
    return null;
}

async function verifySocketJWT(socket) {
    const token = extractToken(socket);
    if (!token) throw new Error("Missing token");

    let decoded;
    try {
        decoded = jwt.verify(token, jwtConfig.secret, jwtConfig.verifyOptions);
    } catch {
        throw new Error("Invalid token");
    }

    const id = decoded.id ?? decoded.userId;
    const phone_number = decoded.phone_number ?? decoded.phone ?? null;
    const role = decoded.role ?? "user";

    if (!id) throw new Error("Invalid token payload");

    // ✅ Ban + active check (same rule as HTTP)
    const [rows] = await pool.query(
        "SELECT is_banned, is_active FROM users WHERE id = ? LIMIT 1",
        [id],
    );
    if (!rows.length) throw new Error("Invalid user");
    if (rows[0].is_active === 0) throw new Error("Inactive user");
    if (rows[0].is_banned) throw new Error("BANNED");

    return { id, phone_number, role };
}

module.exports = { verifySocketJWT };
