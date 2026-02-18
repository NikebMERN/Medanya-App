// src/modules/jobs/job.service.js
const jobDb = require("./job.mysql");
const userDb = require("../users/user.mysql");
const fraudService = require("../../services/fraudPrevention.service");

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

    const user = await userDb.getById(userId);
    if (!user) throw codeErr("UNAUTHORIZED", "User not found");
    if (!user.kyc_face_verified) throw codeErr("FORBIDDEN", "Face verification required. Complete identity verification and have your face matched to your document before posting jobs.");
    if (user.dob) {
        const today = new Date();
        const dob = new Date(user.dob);
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
        if (age < 18) throw codeErr("FORBIDDEN", "You must be at least 18 years old to post jobs.");
    }

    await fraudService.requireOtpVerified(userId);
    await fraudService.checkJobRateLimit(userId);

    const data = validateCreate(body);
    const { score, matchedKeywords, status } = await fraudService.computeRiskScore(userId, {
        title: data.title,
        description: null,
        location: data.location,
    });

    const id = await jobDb.insertJob({
        created_by: userId,
        ...data,
        risk_score: score,
        matched_keywords: matchedKeywords.length ? JSON.stringify(matchedKeywords) : null,
        status: status || "active",
    });
    const job = await jobDb.findJobById(id);
    return job;
}

async function getJob(id, includeRating = true) {
    const job = await jobDb.findJobById(id);
    if (!job) throw codeErr("NOT_FOUND", "Job not found");
    if (includeRating) {
        const rating = await jobDb.getAverageRatingByJobId(id);
        job.avgRating = rating.avgRating;
        job.ratingCount = rating.count;
    }
    if (job.created_by) {
        const creator = await userDb.getById(job.created_by);
        if (creator) {
            job.creator_otp_verified = !!creator.otp_verified;
            job.creator_kyc_verified = creator.kyc_status === "verified";
        }
    }
    return job;
}

async function apply(reqUser, jobId, body) {
    const applicantId = reqUser.id ?? reqUser.userId;
    if (!applicantId) throw codeErr("UNAUTHORIZED", "Auth required");
    const job = await jobDb.findJobById(jobId);
    if (!job) throw codeErr("NOT_FOUND", "Job not found");
    if (job.status !== "active") throw codeErr("VALIDATION_ERROR", "Job is not open for applications");
    if (String(job.created_by) === String(applicantId)) throw codeErr("FORBIDDEN", "Cannot apply to your own job");
    const existing = await jobDb.findApplicationByJobAndApplicant(jobId, applicantId);
    if (existing) throw codeErr("VALIDATION_ERROR", "Already applied");
    const message = body.message ? String(body.message).trim().slice(0, 500) : null;
    const id = await jobDb.insertApplication(jobId, applicantId, message);
    return { id, jobId, applicantId, status: "pending", message };
}

async function listApplicationsForJob(reqUser, jobId, query) {
    const userId = reqUser.id ?? reqUser.userId;
    const job = await jobDb.findJobById(jobId);
    if (!job) throw codeErr("NOT_FOUND", "Job not found");
    if (!isAdmin(reqUser) && String(job.created_by) !== String(userId)) throw codeErr("FORBIDDEN", "Not allowed");
    return jobDb.listApplicationsByJobId(jobId, query);
}

async function listMyApplications(reqUser, query) {
    const applicantId = reqUser.id ?? reqUser.userId;
    if (!applicantId) throw codeErr("UNAUTHORIZED", "Auth required");
    return jobDb.listApplicationsByApplicantId(applicantId, query);
}

async function updateApplicationStatus(reqUser, applicationId, status) {
    const userId = reqUser.id ?? reqUser.userId;
    const app = await jobDb.findApplicationById(applicationId);
    if (!app) throw codeErr("NOT_FOUND", "Application not found");
    if (!isAdmin(reqUser) && String(app.job_owner_id) !== String(userId)) throw codeErr("FORBIDDEN", "Not allowed");
    if (!["pending", "accepted", "rejected"].includes(status)) throw codeErr("VALIDATION_ERROR", "Invalid status");
    await jobDb.updateApplicationStatus(applicationId, status);
    return { id: applicationId, status };
}

async function rateJob(reqUser, jobId, body) {
    const raterId = reqUser.id ?? reqUser.userId;
    if (!raterId) throw codeErr("UNAUTHORIZED", "Auth required");
    const job = await jobDb.findJobById(jobId);
    if (!job) throw codeErr("NOT_FOUND", "Job not found");
    const rating = Math.min(5, Math.max(1, parseInt(body.rating, 10) || 0));
    if (rating < 1 || rating > 5) throw codeErr("VALIDATION_ERROR", "Rating must be 1-5");
    await jobDb.insertJobRating(jobId, raterId, rating);
    const avg = await jobDb.getAverageRatingByJobId(jobId);
    return { rating, avgRating: avg.avgRating, ratingCount: avg.count };
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
    apply,
    listApplicationsForJob,
    listMyApplications,
    updateApplicationStatus,
    rateJob,
};
