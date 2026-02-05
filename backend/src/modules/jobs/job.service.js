// src/modules/jobs/job.service.js
const jobDb = require("./job.mysql");

const validateCreate = (body) => {
    const title = String(body.title || "").trim();
    const category = String(body.category || "").trim();
    const salary = body.salary !== undefined ? String(body.salary).trim() : null;
    const location = String(body.location || "").trim();
    const contact_phone = String(body.contact_phone || "").trim();
    const image_url = body.image_url ? String(body.image_url).trim() : null;

    if (!title || title.length > 120)
        throw codeErr("VALIDATION_ERROR", "Invalid title");
    if (!category || category.length > 60)
        throw codeErr("VALIDATION_ERROR", "Invalid category");
    if (!location || location.length > 120)
        throw codeErr("VALIDATION_ERROR", "Invalid location");
    if (!contact_phone || contact_phone.length > 30)
        throw codeErr("VALIDATION_ERROR", "Invalid contact_phone");
    if (image_url && image_url.length > 500)
        throw codeErr("VALIDATION_ERROR", "Invalid image_url");

    return { title, category, salary, location, contact_phone, image_url };
};

const validateUpdate = (body) => {
    const out = {};
    if (body.title !== undefined) out.title = String(body.title || "").trim();
    if (body.category !== undefined)
        out.category = String(body.category || "").trim();
    if (body.salary !== undefined)
        out.salary = body.salary === null ? null : String(body.salary).trim();
    if (body.location !== undefined)
        out.location = String(body.location || "").trim();
    if (body.contact_phone !== undefined)
        out.contact_phone = String(body.contact_phone || "").trim();
    if (body.image_url !== undefined)
        out.image_url = body.image_url ? String(body.image_url).trim() : null;
    if (body.status !== undefined) out.status = String(body.status).trim();

    if (out.title !== undefined && (!out.title || out.title.length > 120))
        throw codeErr("VALIDATION_ERROR", "Invalid title");
    if (out.category !== undefined && (!out.category || out.category.length > 60))
        throw codeErr("VALIDATION_ERROR", "Invalid category");
    if (
        out.location !== undefined &&
        (!out.location || out.location.length > 120)
    )
        throw codeErr("VALIDATION_ERROR", "Invalid location");
    if (
        out.contact_phone !== undefined &&
        (!out.contact_phone || out.contact_phone.length > 30)
    )
        throw codeErr("VALIDATION_ERROR", "Invalid contact_phone");
    if (
        out.image_url !== undefined &&
        out.image_url &&
        out.image_url.length > 500
    )
        throw codeErr("VALIDATION_ERROR", "Invalid image_url");
    if (out.status !== undefined && !["active", "closed"].includes(out.status))
        throw codeErr("VALIDATION_ERROR", "Invalid status");

    return out;
};

function codeErr(code, message) {
    const e = new Error(message);
    e.code = code;
    return e;
}

function isAdmin(reqUser) {
    return reqUser?.role === "admin";
}

async function createJob(reqUser, body) {
    if (!reqUser?.id && !reqUser?.userId)
        throw codeErr("UNAUTHORIZED", "Auth required");
    const userId = reqUser.id ?? reqUser.userId;

    const data = validateCreate(body);
    const id = await jobDb.insertJob({ created_by: userId, ...data });
    const job = await jobDb.findJobById(id);
    return job;
}

async function getJob(id) {
    const job = await jobDb.findJobById(id);
    if (!job) throw codeErr("NOT_FOUND", "Job not found");
    return job;
}

async function list(reqQuery) {
    return jobDb.listJobs(reqQuery);
}

async function search(reqQuery) {
    return jobDb.searchJobs(reqQuery);
}

async function update(reqUser, jobId, body) {
    const userId = reqUser.id ?? reqUser.userId;
    const job = await jobDb.findJobById(jobId);
    if (!job) throw codeErr("NOT_FOUND", "Job not found");

    if (!isAdmin(reqUser) && String(job.created_by) !== String(userId)) {
        throw codeErr("FORBIDDEN", "Not allowed");
    }

    const fields = validateUpdate(body);
    await jobDb.updateJob(jobId, fields);
    return jobDb.findJobById(jobId);
}

async function remove(reqUser, jobId) {
    const userId = reqUser.id ?? reqUser.userId;
    const job = await jobDb.findJobById(jobId);
    if (!job) throw codeErr("NOT_FOUND", "Job not found");

    if (!isAdmin(reqUser) && String(job.created_by) !== String(userId)) {
        throw codeErr("FORBIDDEN", "Not allowed");
    }

    await jobDb.closeJob(jobId);
    return true;
}

module.exports = {
    createJob,
    getJob,
    list,
    search,
    update,
    remove,
};
