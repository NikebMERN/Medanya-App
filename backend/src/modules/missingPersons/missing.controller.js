// src/modules/missingPersons/missing.controller.js
const service = require("./missing.service");
const { maskPhone, maskLocation, maskName } = require("../../utils/mask.util");

function sendError(res, err) {
    const code = err.code || "SERVER_ERROR";
    const status =
        code === "UNAUTHORIZED"
            ? 401
            : code === "FORBIDDEN"
                ? 403
                : code === "VALIDATION_ERROR"
                    ? 400
                    : code === "NOT_FOUND"
                        ? 404
                        : 500;
    return res
        .status(status)
        .json({ error: { code, message: err.message || code } });
}

function maskListItem(x) {
    return {
        ...x,
        contactPhone: maskPhone(x.contactPhone),
        fullName: maskName(x.fullName),
        lastKnownLocationText: maskLocation(x.lastKnownLocationText),
        gps: null, // hide exact GPS in list
    };
}

const create = async (req, res) => {
    try {
        const doc = await service.create(req.user, req.body);
        return res.status(201).json({ success: true, missingPerson: doc });
    } catch (err) {
        return sendError(res, err);
    }
};

const list = async (req, res) => {
    try {
        const data = await service.list(req.query);
        const masked = data.results.map(maskListItem);
        return res.json({
            success: true,
            page: data.page,
            limit: data.limit,
            total: data.total,
            results: masked,
        });
    } catch (err) {
        return sendError(res, err);
    }
};

const detail = async (req, res) => {
    try {
        const doc = await service.getById(req.params.id);
        // Detail can show full phone (since it’s public alert). If you want masked too, mask here.
        return res.json({ success: true, missingPerson: doc });
    } catch (err) {
        return sendError(res, err);
    }
};

const update = async (req, res) => {
    try {
        const doc = await service.update(req.user, req.params.id, req.body);
        return res.json({ success: true, missingPerson: doc });
    } catch (err) {
        return sendError(res, err);
    }
};

const close = async (req, res) => {
    try {
        const status = req.body?.status || "closed";
        const doc = await service.close(req.user, req.params.id, status);
        return res.json({ success: true, missingPerson: doc });
    } catch (err) {
        return sendError(res, err);
    }
};

const addComment = async (req, res) => {
    try {
        const comment = await service.addComment(req.user, req.params.id, req.body);
        return res.status(201).json({ success: true, comment });
    } catch (err) {
        return sendError(res, err);
    }
};

const listComments = async (req, res) => {
    try {
        const data = await service.listComments(req.params.id, req.query);
        return res.json({ success: true, ...data });
    } catch (err) {
        return sendError(res, err);
    }
};

module.exports = { create, list, detail, update, close, addComment, listComments };
