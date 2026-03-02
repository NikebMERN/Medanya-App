// src/modules/orders/orders.controller.js
const service = require("./orders.service");

function sendErr(res, err) {
    const code = err.code || "SERVER_ERROR";
    let status = 500;
    if (code === "UNAUTHORIZED") status = 401;
    else if (code === "FORBIDDEN") status = 403;
    else if (code === "NOT_FOUND") status = 404;
    else if (code === "VALIDATION_ERROR" || code === "INVALID_CODE" || code === "NOT_APPLICABLE" || code === "PAYOUTS_NOT_SETUP") status = 400;
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

const getDeliveryCode = async (req, res) => {
    try {
        const result = await service.getDeliveryCode(req.user, req.params.id);
        return res.json({ success: true, ...result });
    } catch (err) {
        return sendErr(res, err);
    }
};

const getDeliveryQrToken = async (req, res) => {
    try {
        const result = await service.getDeliveryQrToken(req.user, req.params.id);
        return res.json({ success: true, ...result });
    } catch (err) {
        return sendErr(res, err);
    }
};

const getConfirmation = async (req, res) => {
    try {
        const result = await service.getOrderConfirmation(req.user, req.params.id);
        return res.json({ success: true, ...result });
    } catch (err) {
        return sendErr(res, err);
    }
};

const notifyPaymentReceived = async (req, res) => {
    try {
        await service.notifyPaymentReceived(req.user, req.params.id);
        return res.json({ success: true });
    } catch (err) {
        return sendErr(res, err);
    }
};

const sellerAccept = async (req, res) => {
    try {
        const order = await service.sellerAcceptOrder(req.user, req.params.id, req.body || {});
        return res.json({ success: true, order });
    } catch (err) {
        return sendErr(res, err);
    }
};

const sellerReject = async (req, res) => {
    try {
        const order = await service.sellerRejectOrder(req.user, req.params.id);
        return res.json({ success: true, order });
    } catch (err) {
        return sendErr(res, err);
    }
};

const sellerStatus = async (req, res) => {
    try {
        const { status } = req.body || {};
        if (!status) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "status required" } });
        const order = await service.sellerUpdateStatus(req.user, req.params.id, status);
        return res.json({ success: true, order });
    } catch (err) {
        return sendErr(res, err);
    }
};

const confirmDeliveryByQr = async (req, res) => {
    try {
        const order = await service.confirmDeliveryByQr(req.user, req.params.id, req.body?.token);
        return res.json({ success: true, order });
    } catch (err) {
        return sendErr(res, err);
    }
};

const cancelCod = async (req, res) => {
    try {
        const order = await service.cancelCodOrder(req.user, req.params.id, req.body || {});
        return res.json({ success: true, order });
    } catch (err) {
        return sendErr(res, err);
    }
};

const proposeDeliveryFee = async (req, res) => {
    try {
        const order = await service.proposeDeliveryFee(req.user, req.params.id, req.body || {});
        return res.json({ success: true, order });
    } catch (err) {
        return sendErr(res, err);
    }
};

const acceptDeliveryFee = async (req, res) => {
    try {
        const order = await service.acceptDeliveryFee(req.user, req.params.id);
        return res.json({ success: true, order });
    } catch (err) {
        return sendErr(res, err);
    }
};

const declineDeliveryFee = async (req, res) => {
    try {
        const order = await service.declineDeliveryFee(req.user, req.params.id);
        return res.json({ success: true, order });
    } catch (err) {
        return sendErr(res, err);
    }
};

const confirmDeliveryFee = async (req, res) => {
    try {
        const order = await service.confirmDeliveryFee(req.user, req.params.id, req.body?.action);
        return res.json({ success: true, order });
    } catch (err) {
        return sendErr(res, err);
    }
};

const sellerMarkDelivered = async (req, res) => {
    try {
        const order = await service.sellerMarkDelivered(req.user, req.params.id);
        return res.json({ success: true, order });
    } catch (err) {
        return sendErr(res, err);
    }
};

module.exports = {
    create,
    confirmDelivery,
    confirmDeliveryByQr,
    confirmDeliveryFee,
    sellerMarkDelivered,
    getOrder,
    listMy,
    getDeliveryCode,
    getDeliveryQrToken,
    getConfirmation,
    notifyPaymentReceived,
    cancelCod,
    proposeDeliveryFee,
    acceptDeliveryFee,
    declineDeliveryFee,
    sellerAccept,
    sellerReject,
    sellerStatus,
};
