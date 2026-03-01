/**
 * analytics.meta — Sanitize and limit analytics meta payload.
 * Privacy: hash IP/deviceId, enforce size limits, whitelist keys.
 */
const { hashIp, hashDeviceId } = require("../../utils/hash.util");

const MAX_META_BYTES = 2048; // 2KB
const MAX_ENTITY_ID_LENGTH = 64;

const META_WHITELIST = new Set([
    "watchTime",
    "watchTimeSec",
    "amountCoins",
    "amountUSD",
    "deviceId",
    "country",
    "creatorId",
    "engaged",
]);

/**
 * Sanitize meta object: whitelist keys, hash sensitive fields, enforce limits.
 * @param {object} meta - Raw meta from client
 * @param {string} ip - Request IP (will be hashed)
 * @returns {object} - Sanitized meta
 */
function sanitizeMeta(meta, ip) {
    if (!meta || typeof meta !== "object") return {};

    const out = {};
    for (const k of META_WHITELIST) {
        if (meta[k] === undefined || meta[k] === null) continue;
        if (k === "deviceId") {
            const raw = String(meta[k]).trim();
            if (raw) out.deviceIdHash = hashDeviceId(raw);
        } else if (k === "watchTime" || k === "watchTimeSec") {
            out[k] = Math.max(0, Math.floor(Number(meta[k]) || 0));
        } else if (k === "amountCoins" || k === "amountUSD") {
            out[k] = Math.max(0, Number(meta[k]) || 0);
        } else if (k === "creatorId") {
            out[k] = String(meta[k]).slice(0, MAX_ENTITY_ID_LENGTH);
        } else if (k === "engaged") {
            out[k] = Boolean(meta[k]);
        } else if (k === "country") {
            out[k] = String(meta[k]).slice(0, 32);
        }
    }

    if (ip) out.ipHash = hashIp(ip);

    const str = JSON.stringify(out);
    if (Buffer.byteLength(str, "utf8") > MAX_META_BYTES) {
        const trimmed = { ipHash: out.ipHash, deviceIdHash: out.deviceIdHash };
        if (out.watchTimeSec != null) trimmed.watchTimeSec = out.watchTimeSec;
        if (out.watchTime != null) trimmed.watchTime = out.watchTime;
        if (out.creatorId) trimmed.creatorId = out.creatorId;
        if (out.engaged != null) trimmed.engaged = out.engaged;
        return trimmed;
    }
    return out;
}

/**
 * Validate entityId length.
 */
function validateEntityId(entityId) {
    const s = String(entityId || "").trim();
    return s.length <= MAX_ENTITY_ID_LENGTH ? s : s.slice(0, MAX_ENTITY_ID_LENGTH);
}

module.exports = { sanitizeMeta, validateEntityId, MAX_ENTITY_ID_LENGTH };
