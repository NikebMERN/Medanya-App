// src/modules/feed/feed.controller.js
const feedService = require("./feed.service");

function sendErr(res, err) {
    return res
        .status(500)
        .json({
            error: { code: "SERVER_ERROR", message: err.message || "SERVER_ERROR" },
        });
}

const getFeed = async (req, res) => {
    try {
        const data = await feedService.getFeed({
            cursor: req.query.cursor,
            limit: req.query.limit,
            types: req.query.types, // "job,report,missing_person,marketplace"
        });
        return res.json({ success: true, ...data });
    } catch (err) {
        return sendErr(res, err);
    }
};

const highlights = async (req, res) => {
    try {
        const data = await feedService.getHighlights({ limit: req.query.limit });
        return res.json({ success: true, ...data });
    } catch (err) {
        return sendErr(res, err);
    }
};

module.exports = { getFeed, highlights };
