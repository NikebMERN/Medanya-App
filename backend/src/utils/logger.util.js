// src/utils/logger.util.js
// Lightweight console logger for development (info/warn/error).
const logger = {
    info: (...args) => console.log("[INFO]", ...args),
    warn: (...args) => console.warn("[WARN]", ...args),
    error: (...args) => console.error("[ERROR]", ...args),
};

module.exports = logger;
