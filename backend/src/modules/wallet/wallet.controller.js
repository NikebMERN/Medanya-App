// src/modules/wallet/wallet.controller.js
const service = require("./wallet.service");

function sendErr(res, err) {
    const code = err.code || "SERVER_ERROR";
    const status =
        code === "UNAUTHORIZED"
            ? 401
            : code === "FORBIDDEN"
                ? 403
                : code === "VALIDATION_ERROR"
                    ? 400
                    : code === "INSUFFICIENT_FUNDS"
                        ? 409
                        : 500;

    return res
        .status(status)
        .json({ error: { code, message: err.message || code } });
}

const me = async (req, res) => {
    try {
        const userId = req.user.id ?? req.user.userId;
        const data = await service.getMyWallet(String(userId), {
            last: req.query.last || 10,
        });
        return res.json({ success: true, ...data });
    } catch (e) {
        return sendErr(res, e);
    }
};

const myTransactions = async (req, res) => {
    try {
        const userId = req.user.id ?? req.user.userId;
        const data = await service.listMyTransactions(String(userId), req.query);
        return res.json({ success: true, ...data });
    } catch (e) {
        return sendErr(res, e);
    }
};

const adminCredit = async (req, res) => {
    try {
        const { userId, amount, reason } = req.body || {};
        const result = await service.credit(String(userId), amount, {
            type: "admin_credit",
            id: null,
            meta: { reason, byAdmin: String(req.user.id ?? req.user.userId) },
        });
        return res.status(201).json({ success: true, ...result });
    } catch (e) {
        return sendErr(res, e);
    }
};

const adminDebit = async (req, res) => {
    try {
        const { userId, amount, reason } = req.body || {};
        const result = await service.debit(String(userId), amount, {
            type: "admin_debit",
            id: null,
            meta: { reason, byAdmin: String(req.user.id ?? req.user.userId) },
        });
        return res.status(201).json({ success: true, ...result });
    } catch (e) {
        return sendErr(res, e);
    }
};

module.exports = { me, myTransactions, adminCredit, adminDebit };
