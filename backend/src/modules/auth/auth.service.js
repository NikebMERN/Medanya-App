const admin = require("../../config/firebase");
const jwt = require("jsonwebtoken");
const { pool } = require("../../config/mysql");

const normalizeIdToken = (raw) => {
    if (!raw) return raw;
    if (typeof raw !== "string") return "";
    const token = raw.trim();
    // Allow either the raw JWT or "Bearer <JWT>"
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

module.exports = {
    verifyFirebaseToken,
    findOrCreateUser,
    issueJWT,
};
