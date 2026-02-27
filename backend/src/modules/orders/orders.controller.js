// src/modules/orders/orders.controller.js
const service = require("./orders.service");

function sendErr(res, err) {
    const code = err.code || "SERVER_ERROR";
    let status = 500;
    if (code === "UNAUTHORIZED") status = 401;
    else if (code === "FORBIDDEN") status = 403;
    else if (code === "NOT_FOUND") status = 404;
    else if (code === "VALIDATION_ERROR" || code === "INVALID_CODE") status = 400;
    else if (code === "BAD_STATE") status = 409;

    return res
        .status(status)
        .json({ error: { code, message: err.message || code } });
}

const create = async (req, res) => {
    try {
        const data = await service.createOrder(req.user, req.body);
        return res.status(201).json({ success: true, ...data });
    } catch (err) {
        return sendErr(res, err);
    }
};

const confirmDelivery = async (req, res) => {
    try {
        const order = await service.confirmDelivery(req.user, req.params.id, req.body?.code);
        return res.json({ success: true, order });
    } catch (err) {
        return sendErr(res, err);
    }
};

const getOrder = async (req, res) => {
    try {
        const order = await service.getOrder(req.user, req.params.id);
        return res.json({ success: true, order });
    } catch (err) {
        return sendErr(res, err);
    }
};

const listMy = async (req, res) => {
    try {
        const role = req.query.role === "seller" ? "seller" : "buyer";
        const data = await service.listMyOrders(req.user, req.query, role);
        return res.json({ success: true, ...data });
    } catch (err) {
        return sendErr(res, err);
    }
};

module.exports = { create, confirmDelivery, getOrder, listMy };
