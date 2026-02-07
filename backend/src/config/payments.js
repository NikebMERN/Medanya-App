// src/config/payments.js
module.exports = {
    platformCommissionBps: 2000,
    hostShareBps: 8000, // keep for readability but computeSplit uses platformCommissionBps
    gifts: [
        { giftId: "rose", name: "Rose", coinCost: 10 },
        { giftId: "heart", name: "Heart", coinCost: 50 },
        { giftId: "crown", name: "Crown", coinCost: 500 },
    ],
    platformWalletUserId: "platform", // special internal account id in MySQL (see note below)
};
