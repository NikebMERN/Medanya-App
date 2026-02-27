/**
 * Scam ML module entry.
 */
const scamMLService = require("./scamML.service");
const scamMLEnsemble = require("./scamML.ensemble");
const scamTraining = require("./scamTraining.mysql");

module.exports = {
    scamMLService,
    scamMLEnsemble,
    scamTraining,
};
