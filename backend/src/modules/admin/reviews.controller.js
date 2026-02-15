// src/modules/admin/reviews.controller.js
const reviewsService = require("./reviews.service");

function sendErr(res, err) {
    const code = err.code || "SERVER_ERROR";
    const status =
        code === "VALIDATION_ERROR" ? 400 : code === "NOT_FOUND" ? 404 : 500;
    return res.status(status).json({ error: { code, message: err.message || code } });
}

const listFlaggedListings = async (req, res) => {
    try {
        const data = await reviewsService.listFlaggedListings({
            status: req.query.status,
            type: req.query.type,
            page: req.query.page,
            limit: req.query.limit,
        });
        return res.json({ success: true, ...data });
    } catch (e) {
        return sendErr(res, e);
    }
};

const updateListingStatus = async (req, res) => {
    try {
        const { type, id } = req.params;
        const action = req.body?.action || "approve";
        const result = await reviewsService.updateListingStatus(type, id, action);
        return res.json({ success: true, ...result });
    } catch (e) {
        return sendErr(res, e);
    }
};

module.exports = { listFlaggedListings, updateListingStatus };
