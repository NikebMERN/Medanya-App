// src/utils/revenue.util.js
const payments = require("../config/payments");

function computeSplit(totalCoins) {
    const platform = Math.floor(
        (totalCoins * payments.platformCommissionBps) / 10000,
    );
    const host = totalCoins - platform; // ensures sum == total
    return { total: totalCoins, host, platform };
}

module.exports = { computeSplit };
