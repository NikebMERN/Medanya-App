// src/config/payments.js
// COD Option A: small online deposit at checkout; rest paid cash on delivery. Set COD_OPTION_B=1 for no deposit (cannot pay seller via Stripe).
const codOptionB = process.env.COD_OPTION_B === "1" || process.env.COD_OPTION_B === "true";

module.exports = {
    platformCommissionBps: 2000,
    hostShareBps: 8000,
    gifts: [
        { giftId: "rose", name: "Rose", coinCost: 10 },
        { giftId: "heart", name: "Heart", coinCost: 50 },
        { giftId: "crown", name: "Crown", coinCost: 500 },
    ],
    platformWalletUserId: "platform",

    // COD deposit (Option A): deposit taken online, released to seller on delivery confirm
    codOptionB,
    codDepositFixedCents: parseInt(process.env.COD_DEPOSIT_FIXED_CENTS || "200", 10) || 0,   // e.g. 200 = 2 AED
    codDepositPercentBps: parseInt(process.env.COD_DEPOSIT_PERCENT_BPS || "500", 10) || 0,  // e.g. 500 = 5%
    codDepositMinCents: parseInt(process.env.COD_DEPOSIT_MIN_CENTS || "100", 10) || 0,
    codDepositMaxCents: parseInt(process.env.COD_DEPOSIT_MAX_CENTS || "5000", 10) || 5000,
};
