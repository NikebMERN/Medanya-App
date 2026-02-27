/**
 * Scam AI: constants and label enums.
 * All AI classifier labels must match these values.
 */
const LABELS = Object.freeze([
    "UPFRONT_PAYMENT",
    "DEPOSIT_REQUIRED",
    "PASSPORT_REQUEST",
    "OFF_PLATFORM_CONTACT",
    "WIRE_TRANSFER",
    "CRYPTO_PAYMENT",
    "TOO_GOOD_TO_BE_TRUE",
    "JOB_SCAM_PATTERN",
    "MARKET_SCAM_PATTERN",
    "SUSPICIOUS_LANGUAGE",
    "PERSONAL_DATA_REQUEST",
]);

const LABEL_SET = new Set(LABELS);

const TARGET_TYPES = Object.freeze({
    JOB: "JOB",
    MARKET: "MARKET",
});

const DECISIONS = Object.freeze({
    ALLOW: "ALLOW",
    PENDING_REVIEW: "PENDING_REVIEW",
    BLOCK: "BLOCK",
});

const STATUSES = Object.freeze({
    ACTIVE: "active",
    PENDING_REVIEW: "PENDING_REVIEW",
    HIDDEN_PENDING_REVIEW: "HIDDEN_PENDING_REVIEW",
    CLOSED: "closed",
    REMOVED: "removed",
});

/** Labels that trigger hard block when probability + confidence are high */
const SEVERE_LABELS = new Set(["WIRE_TRANSFER", "CRYPTO_PAYMENT", "PASSPORT_REQUEST"]);

function isValidLabel(label) {
    return typeof label === "string" && LABEL_SET.has(label);
}

function filterValidLabels(labels) {
    if (!Array.isArray(labels)) return [];
    return labels.filter((l) => isValidLabel(l));
}

module.exports = {
    LABELS,
    LABEL_SET,
    TARGET_TYPES,
    DECISIONS,
    STATUSES,
    SEVERE_LABELS,
    isValidLabel,
    filterValidLabels,
};
