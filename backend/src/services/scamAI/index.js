/**
 * Scam AI module entry.
 */
const localRules = require("./scamAI.localRules");
const provider = require("./scamAI.provider");
const policy = require("./scamAI.policy");
const ensemble = require("./scamAI.ensemble");
const store = require("./scamAI.store");

module.exports = {
    localRules,
    provider,
    policy,
    ensemble,
    store,
};
