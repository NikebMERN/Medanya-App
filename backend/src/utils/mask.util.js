// src/utils/mask.util.js
function maskPhone(phone) {
    const s = String(phone || "");
    if (s.length <= 4) return "****";
    const last4 = s.slice(-4);
    return `***-***-${last4}`;
}

function maskName(name) {
    const s = String(name || "").trim();
    if (!s) return "";
    if (s.length <= 2) return s[0] + "*";
    return s[0] + "*".repeat(Math.min(6, s.length - 2)) + s[s.length - 1];
}

function maskLocation(loc) {
    // Keep it readable but not too precise
    const s = String(loc || "").trim();
    if (!s) return "";
    return s.length > 40 ? s.slice(0, 40) + "…" : s;
}

module.exports = { maskPhone, maskName, maskLocation };
