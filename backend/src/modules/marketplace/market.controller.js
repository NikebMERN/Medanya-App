// src/modules/marketplace/market.controller.js
const service = require("./market.service");

function sendErr(res, err) {
    const code = err.code || "SERVER_ERROR";
    const status =
        code === "UNAUTHORIZED"
            ? 401
            : code === "FORBIDDEN"
                ? 403
                : code === "NOT_FOUND"
                    ? 404
                    : code === "VALIDATION_ERROR"
                        ? 400
                        : 500;

    return res
        .status(status)
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
        const item = await service.detail(req.params.id);
        return res.json({ success: true, item });
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
};
