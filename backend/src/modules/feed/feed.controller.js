// src/modules/feed/feed.controller.js
const feedService = require("./feed.service");
const feedRankingService = require("./feedRanking.service");

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
            types: req.query.types,
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

const getHomeFeed = async (req, res) => {
    try {
        const data = await feedService.getHomeFeed({
            tab: req.query.tab || "feeds",
            cursor: req.query.cursor,
            limit: req.query.limit,
        });
        return res.json({ success: true, ...data });
    } catch (err) {
        return sendErr(res, err);
    }
};

const getPersonalizedFeed = async (req, res) => {
    try {
        const userId = req.user?.id ?? req.user?.userId ?? null;
        const data = await feedRankingService.getPersonalizedFeed({
            userId,
            tab: req.query.tab || "feeds",
            cursor: req.query.cursor,
            limit: req.query.limit,
        });
        return res.json({ success: true, ...data });
    } catch (err) {
        return sendErr(res, err);
    }
};

const getReportsFeed = async (req, res) => {
    try {
        const data = await feedService.getReportsFeed({
            cursor: req.query.cursor,
            limit: req.query.limit ?? 20,
        });
        return res.json({ success: true, ...data });
    } catch (err) {
        return sendErr(res, err);
    }
};

const getLiveStreams = async (req, res) => {
    try {
        const streams = await feedService.getLiveStreamsForHome({ limit: req.query.limit });
        return res.json({ success: true, streams });
    } catch (err) {
        return sendErr(res, err);
    }
};

module.exports = { getFeed, highlights, getHomeFeed, getPersonalizedFeed, getReportsFeed, getLiveStreams };
