/**
 * hash.util — Privacy-safe hashing for analytics.
 * Uses SHA256 with server-side salt. Never store raw IP or deviceId.
 */
const crypto = require("crypto");

const SALT = process.env.ANALYTICS_SALT || "medanya-analytics-default-salt-change-in-prod";

/**
 * Hash a value with server-side salt.
 * @param {string} value - Raw value (IP, deviceId) — never stored.
 * @returns {string} - Hex-encoded SHA256 hash.
 */
function hash(value) {
    if (!value || typeof value !== "string") return "";
    return crypto.createHash("sha256").update(SALT + value.trim()).digest("hex");
}

/**
 * Hash IP for analytics meta.
 */
function hashIp(ip) {
    return hash(String(ip || "").trim());
}

/**
 * Hash deviceId — use when client sends raw deviceId.
 * If client already sends hashed, store as-is (or re-hash for consistency).
 */
function hashDeviceId(deviceId) {
    return hash(String(deviceId || "").trim());
}

module.exports = { hash, hashIp, hashDeviceId };
