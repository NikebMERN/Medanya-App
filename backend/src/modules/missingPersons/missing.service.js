// src/modules/missingPersons/missing.service.js
const mongoose = require("mongoose");
const MissingPerson = require("./missing.model");
const MissingPersonComment = require("./missingComment.model");

const MAX_LIMIT = 50;

function codeErr(code, message) {
    const e = new Error(message || code);
    e.code = code;
    return e;
}

function toId(x) {
    return x === null || x === undefined ? "" : String(x);
}

function cleanStr(v, max = 500) {
    const s = String(v || "").trim();
    if (!s) return "";
    return s.length > max ? s.slice(0, max) : s;
}

function isAdmin(user) {
    return user?.role === "admin";
}

function validateCreate(body) {
    const photoUrl = cleanStr(body.photoUrl, 600);
    const fullName = cleanStr(body.fullName, 120);
    const contactPhone = cleanStr(body.contactPhone, 40);
    const voiceUrl = cleanStr(body.voiceUrl, 600);
    const lastKnownLocationText = cleanStr(body.lastKnownLocationText, 200);
    const description = cleanStr(body.description, 1500);

    if (!photoUrl) throw codeErr("VALIDATION_ERROR", "photoUrl is required");
    if (!contactPhone)
        throw codeErr("VALIDATION_ERROR", "contactPhone is required");
    if (!lastKnownLocationText)
        throw codeErr("VALIDATION_ERROR", "lastKnownLocationText is required");
    if (!description)
        throw codeErr("VALIDATION_ERROR", "description is required");

    const gps =
        body.gps && typeof body.gps === "object"
            ? { lat: Number(body.gps.lat), lng: Number(body.gps.lng) }
            : null;

    return {
        photoUrl,
        fullName,
        contactPhone,
        voiceUrl,
        lastKnownLocationText,
        gps:
            gps && Number.isFinite(gps.lat) && Number.isFinite(gps.lng) ? gps : null,
        description,
    };
}

function validateUpdate(body) {
    const out = {};
    if (body.photoUrl !== undefined) out.photoUrl = cleanStr(body.photoUrl, 600);
    if (body.fullName !== undefined) out.fullName = cleanStr(body.fullName, 120);
    if (body.contactPhone !== undefined)
        out.contactPhone = cleanStr(body.contactPhone, 40);
    if (body.voiceUrl !== undefined) out.voiceUrl = cleanStr(body.voiceUrl, 600);
    if (body.lastKnownLocationText !== undefined)
        out.lastKnownLocationText = cleanStr(body.lastKnownLocationText, 200);
    if (body.description !== undefined)
        out.description = cleanStr(body.description, 1500);

    if (out.photoUrl !== undefined && !out.photoUrl)
        throw codeErr("VALIDATION_ERROR", "photoUrl invalid");
    if (out.contactPhone !== undefined && !out.contactPhone)
        throw codeErr("VALIDATION_ERROR", "contactPhone invalid");
    if (out.lastKnownLocationText !== undefined && !out.lastKnownLocationText)
        throw codeErr("VALIDATION_ERROR", "lastKnownLocationText invalid");
    if (out.description !== undefined && !out.description)
        throw codeErr("VALIDATION_ERROR", "description invalid");

    if (body.gps !== undefined) {
        const gps =
            body.gps && typeof body.gps === "object"
                ? { lat: Number(body.gps.lat), lng: Number(body.gps.lng) }
                : null;
        out.gps =
            gps && Number.isFinite(gps.lat) && Number.isFinite(gps.lng) ? gps : null;
    }

    return out;
}

async function create(user, body) {
    const createdBy = toId(user?.id ?? user?.userId);
    if (!createdBy) throw codeErr("UNAUTHORIZED", "Auth required");

    const data = validateCreate(body);

    const doc = await MissingPerson.create({
        createdBy,
        ...data,
        status: "active",
    });

    return doc.toObject();
}

async function list({ page = 1, limit = 20, q, location, status } = {}) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), MAX_LIMIT);
    const skip = (p - 1) * l;

    const query = {};
    query.status = status ? String(status) : "active";

    if (q) {
        const re = new RegExp(String(q).trim(), "i");
        query.$or = [{ fullName: re }, { description: re }];
    }
    if (location) {
        query.lastKnownLocationText = new RegExp(String(location).trim(), "i");
    }

    const [items, total] = await Promise.all([
        MissingPerson.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(l)
            .lean(),
        MissingPerson.countDocuments(query),
    ]);

    return { page: p, limit: l, total, results: items };
}

async function getById(id) {
    if (!mongoose.isValidObjectId(id)) throw codeErr("NOT_FOUND", "Not found");
    const doc = await MissingPerson.findById(id).lean();
    if (!doc) throw codeErr("NOT_FOUND", "Not found");
    return doc;
}

async function update(user, id, body) {
    const userId = toId(user?.id ?? user?.userId);
    if (!mongoose.isValidObjectId(id)) throw codeErr("NOT_FOUND", "Not found");

    const doc = await MissingPerson.findById(id);
    if (!doc) throw codeErr("NOT_FOUND", "Not found");

    if (!isAdmin(user) && String(doc.createdBy) !== String(userId)) {
        throw codeErr("FORBIDDEN", "Not allowed");
    }

    const fields = validateUpdate(body);
    Object.assign(doc, fields);
    await doc.save();

    return doc.toObject();
}

async function close(user, id, status = "closed") {
    const userId = toId(user?.id ?? user?.userId);
    if (!mongoose.isValidObjectId(id)) throw codeErr("NOT_FOUND", "Not found");

    const doc = await MissingPerson.findById(id);
    if (!doc) throw codeErr("NOT_FOUND", "Not found");

    if (!isAdmin(user) && String(doc.createdBy) !== String(userId)) {
        throw codeErr("FORBIDDEN", "Not allowed");
    }

    const s = String(status || "").trim();
    if (!["found", "closed"].includes(s))
        throw codeErr("VALIDATION_ERROR", "status must be found or closed");

    doc.status = s;
    await doc.save();
    return doc.toObject();
}

async function addComment(user, missingPersonId, body) {
    const authorId = toId(user?.id ?? user?.userId);
    if (!authorId) throw codeErr("UNAUTHORIZED", "Auth required");
    if (!mongoose.isValidObjectId(missingPersonId)) throw codeErr("NOT_FOUND", "Not found");

    const alert = await MissingPerson.findOne({ _id: missingPersonId }).lean();
    if (!alert) throw codeErr("NOT_FOUND", "Not found");

    const text = cleanStr(body.text, 1000);
    const voiceUrl = body.voiceUrl ? cleanStr(body.voiceUrl, 600) : null;
    if (!text && !voiceUrl) throw codeErr("VALIDATION_ERROR", "text or voiceUrl required");

    const doc = await MissingPersonComment.create({
        missingPersonId: alert._id,
        authorId,
        text: text || undefined,
        voiceUrl: voiceUrl || undefined,
    });
    return doc.toObject();
}

async function listComments(missingPersonId, { page = 1, limit = 50 } = {}) {
    if (!mongoose.isValidObjectId(missingPersonId)) throw codeErr("NOT_FOUND", "Not found");
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const skip = (p - 1) * l;

    const alert = await MissingPerson.findById(missingPersonId).lean();
    if (!alert) throw codeErr("NOT_FOUND", "Not found");

    const [items, total] = await Promise.all([
        MissingPersonComment.find({ missingPersonId })
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(l)
            .lean(),
        MissingPersonComment.countDocuments({ missingPersonId }),
    ]);
    return { page: p, limit: l, total, comments: items };
}

module.exports = {
    create,
    list,
    getById,
    update,
    close,
    addComment,
    listComments,
};
