/**
 * Compute user risk/safety score 0-5 bars.
 * Uses: OTP, KYC, Behavior Trust Score, Device Fingerprint, Account Age, Reports.
 * Replaces face matched safe score with trust_score + device_risk.
 */
async function computeUserRiskScore(user, options = {}) {
    const opts = typeof options === "number" ? { reportsCount: options } : options;
    const reportsCount = opts.reportsCount ?? 0;
    const trustScore = opts.trustScore ?? (user?.trust_score != null ? user.trust_score : 50);
    const deviceRisk = opts.deviceRisk ?? 0;
    if (!user) return 0;
    let score = 0;
    if (user.otp_verified) score += 1;
    const kycVerified = ["verified_auto", "verified_manual", "verified"].includes(user.kyc_status || "");
    if (kycVerified) score += 1;
    if (Number(trustScore) >= 60) score += 1;
    if (deviceRisk <= 1) score += 1;
    const createdAt = user.created_at ? new Date(user.created_at) : null;
    const daysSinceCreated = createdAt
        ? (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
        : 0;
    if (daysSinceCreated >= 30) score += 1;
    if (reportsCount < 2) score += 1;
    return Math.min(5, Math.max(0, score));
}

function getRiskLabel(bars) {
    if (bars < 3) return "risky";
    if (bars === 3) return "half-safe";
    return "safe";
}

/**
 * Get detailed breakdown. Replaces face matched with Behavior Trust Score + Device Fingerprint.
 */
function getRiskBreakdown(user, options = {}) {
    const opts = typeof options === "number" ? { reportsCount: options } : options;
    const reportsCount = opts.reportsCount ?? 0;
    const trustScore = opts.trustScore ?? (user?.trust_score ?? 50);
    const deviceRisk = opts.deviceRisk ?? 0;
    if (!user) return { score: 0, label: "risky", items: [], daysToFullVerify: 0 };
    const createdAt = user.created_at ? new Date(user.created_at) : null;
    const daysSinceCreated = createdAt
        ? Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
    const daysLeftForAccountAge = Math.max(0, 30 - daysSinceCreated);
    const kycVerified = ["verified_auto", "verified_manual", "verified"].includes(user.kyc_status || "");

    const items = [
        {
            id: "otp",
            met: !!user.otp_verified,
            label: "Phone verified",
            tip: "Verify your phone number with OTP to get this point.",
            action: "Complete phone verification when signing in.",
            daysLeft: 0,
        },
        {
            id: "kyc",
            met: kycVerified,
            label: "Identity verified",
            tip: "Complete KYC identity verification (document upload).",
            action: "Go to Identity Verification and submit your document.",
            daysLeft: 0,
        },
        {
            id: "trust",
            met: Number(trustScore) >= 60,
            label: "Behavior Trust Score",
            tip: "Build trust through successful interactions, fast replies, and clean record.",
            action: "Maintain positive behavior. Reports and scam keywords lower your score.",
            daysLeft: 0,
        },
        {
            id: "device",
            met: deviceRisk <= 1,
            label: "Device Fingerprint",
            tip: "Low device risk: same device not shared by many accounts, no banned device.",
            action: "Use a clean device. Avoid sharing devices with banned accounts.",
            daysLeft: 0,
        },
        {
            id: "account_age",
            met: daysSinceCreated >= 30,
            label: "Account age (30+ days)",
            tip: daysSinceCreated >= 30
                ? `Your account is ${daysSinceCreated} days old.`
                : `${daysLeftForAccountAge} days left to reach 30 days.`,
            action: daysSinceCreated >= 30 ? "You've met this requirement." : `Keep your account in good standing for ${daysLeftForAccountAge} more days.`,
            daysLeft: daysLeftForAccountAge,
        },
        {
            id: "low_reports",
            met: reportsCount < 2,
            label: "Clean record",
            tip: reportsCount < 2
                ? "No significant reports against you."
                : "You need fewer than 2 reports to get this point.",
            action: reportsCount < 2 ? "Maintain a positive reputation." : "Behave responsibly to avoid reports from other users.",
            daysLeft: 0,
        },
    ];

    let score = items.filter((i) => i.met).length;
    score = Math.min(5, Math.max(0, score));
    return {
        score,
        label: getRiskLabel(score),
        items,
        daysToFullVerify: daysLeftForAccountAge,
    };
}

module.exports = { computeUserRiskScore, getRiskLabel, getRiskBreakdown };
