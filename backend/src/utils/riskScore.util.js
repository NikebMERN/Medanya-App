/**
 * Compute user risk/safety score 0-5 bars.
 * risky: 0-2, half-safe: 3, safe: 4-5
 */
async function computeUserRiskScore(user, reportsCount = 0) {
    if (!user) return 0;
    let score = 0;
    if (user.otp_verified) score += 1;
    const kycVerified = ["verified_auto", "verified_manual"].includes(user.kyc_status || "");
    if (kycVerified) score += 1;
    if (user.kyc_face_verified) score += 1;
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
 * Get detailed breakdown of each safety criterion for profile checklist.
 */
function getRiskBreakdown(user, reportsCount = 0) {
    if (!user) return { score: 0, label: "risky", items: [] };
    const createdAt = user.created_at ? new Date(user.created_at) : null;
    const daysSinceCreated = createdAt
        ? Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
    const kycVerified = ["verified_auto", "verified_manual"].includes(user.kyc_status || "");

    const items = [
        {
            id: "otp",
            met: !!user.otp_verified,
            label: "Phone verified",
            tip: "Verify your phone number with OTP to get this point.",
            action: "Complete phone verification when signing in.",
        },
        {
            id: "kyc",
            met: kycVerified,
            label: "Identity verified",
            tip: "Complete KYC identity verification (document upload).",
            action: "Go to Identity Verification and submit your document.",
        },
        {
            id: "face",
            met: !!user.kyc_face_verified,
            label: "Face matched",
            tip: "Your selfie must match your ID document.",
            action: "Complete the selfie step in Identity Verification.",
        },
        {
            id: "account_age",
            met: daysSinceCreated >= 30,
            label: "Account age (30+ days)",
            tip: daysSinceCreated >= 30
                ? `Your account is ${daysSinceCreated} days old.`
                : `Your account is ${daysSinceCreated} days old. Need 30 days.`,
            action: daysSinceCreated >= 30 ? "You've met this requirement." : "Keep your account in good standing for 30 days.",
        },
        {
            id: "low_reports",
            met: reportsCount < 2,
            label: "Clean record",
            tip: reportsCount < 2
                ? "No significant reports against you."
                : "You need fewer than 2 reports to get this point.",
            action: reportsCount < 2 ? "Maintain a positive reputation." : "Behave responsibly to avoid reports from other users.",
        },
    ];

    let score = items.filter((i) => i.met).length;
    score = Math.min(5, Math.max(0, score));
    return {
        score,
        label: getRiskLabel(score),
        items,
    };
}

module.exports = { computeUserRiskScore, getRiskLabel, getRiskBreakdown };
