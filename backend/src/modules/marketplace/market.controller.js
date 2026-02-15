// src/modules/marketplace/market.controller.js
const service = require("./market.service");

function sendErr(res, err) {
    const code = err.code || "SERVER_ERROR";
    let status = 500;
    if (code === "UNAUTHORIZED") status = 401;
    else if (code === "OTP_REQUIRED" || code === "FORBIDDEN") status = 403;
    else if (code === "RATE_LIMIT") status = 429;
    else if (code === "NOT_FOUND") status = 404;
    else if (code === "VALIDATION_ERROR") status = 400;

    return res
        .status(err.status || status)
        .json({ error: { code, message: err.message || code } });
}

const createItem = async (req, res) => {
    try {
        const item = await service.create(req.user, req.body);
        return res.status(201).json({ success: true, item });
    } catch (err) {
        return sendErr(res, err);
    }
};

const listItems = async (req, res) => {
    try {
        const data = await service.list(req.query);
        return res.json({ success: true, ...data });
    } catch (err) {
        return sendErr(res, err);
    }
};

const getItem = async (req, res) => {
    try {
        const item = req.user
            ? await service.detailWithFavorite(req.user, req.params.id)
            : await service.detail(req.params.id);
        return res.json({ success: true, item });
    } catch (err) {
        return sendErr(res, err);
    }
};

const addFavorite = async (req, res) => {
    try {
        const result = await service.addFavorite(req.user, req.params.id);
        return res.json({ success: true, ...result });
    } catch (err) {
        return sendErr(res, err);
    }
};

const removeFavorite = async (req, res) => {
    try {
        const result = await service.removeFavorite(req.user, req.params.id);
        return res.json({ success: true, ...result });
    } catch (err) {
        return sendErr(res, err);
    }
};

const listFavorites = async (req, res) => {
    try {
        const data = await service.listFavorites(req.user, req.query);
        return res.json({ success: true, ...data });
    } catch (err) {
        return sendErr(res, err);
    }
};

const updateItem = async (req, res) => {
    try {
        const item = await service.update(req.user, req.params.id, req.body);
        return res.json({ success: true, item });
    } catch (err) {
        return sendErr(res, err);
    }
};

const markSold = async (req, res) => {
    try {
        const item = await service.markSold(req.user, req.params.id);
        return res.json({ success: true, item });
    } catch (err) {
        return sendErr(res, err);
    }
};

const deleteItem = async (req, res) => {
    try {
        await service.remove(req.user, req.params.id);
        return res.json({ success: true });
    } catch (err) {
        return sendErr(res, err);
    }
};

const search = async (req, res) => {
    try {
        const data = await service.search(req.query);
        return res.json({ success: true, ...data });
    } catch (err) {
        return sendErr(res, err);
    }
};

module.exports = {
    createItem,
    listItems,
    getItem,
    updateItem,
    markSold,
    deleteItem,
    search,
    addFavorite,
    removeFavorite,
    listFavorites,
};
