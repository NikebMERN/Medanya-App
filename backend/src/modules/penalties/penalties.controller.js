const penaltiesService = require("./penalties.service");

function mapError(res, err) {
    const code = err.code || "SERVER_ERROR";
    const status =
        code === "FORBIDDEN" ? 403
        : code === "NOT_FOUND" ? 404
        : code === "UNAUTHORIZED" ? 401
        : code === "VALIDATION_ERROR" || code === "BAD_STATE" ? 400
        : 500;
    return res.status(status).json({
        error: { code, message: err.message || code },
    });
}

async function listMy(req, res) {
    try {
        const list = await penaltiesService.listMyPenalties(req.user);
        return res.json({ penalties: list });
    } catch (err) {
        return mapError(res, err);
    }
}

async function getById(req, res) {
    try {
        const p = await penaltiesService.getPenalty(req.user, req.params.id);
        return res.json({ penalty: p });
    } catch (err) {
        return mapError(res, err);
    }
}

async function createPayment(req, res) {
    try {
        const { clientSecret } = await penaltiesService.createPaymentIntent(req.user, req.params.id);
        return res.json({ clientSecret });
    } catch (err) {
        return mapError(res, err);
    }
}

module.exports = { listMy, getById, createPayment };
