// src/modules/jobs/job.service.js
const jobDb = require("./job.mysql");
const userDb = require("../users/user.mysql");
const fraudService = require("../../services/fraudPrevention.service");

const validateCreate = (body) => {
    const title = String(body.title || "").trim();
    const description = body.description != null ? String(body.description || "").trim() : null;
    const category = String(body.category || "").trim();
    const salary = body.salary !== undefined ? String(body.salary).trim() : null;
    const location = String(body.location || "").trim();
    const contact_phone = String(body.contact_phone || "").trim();
    const image_url = body.image_url ? String(body.image_url).trim() : null;

    if (!title || title.length > 120)
        throw codeErr("VALIDATION_ERROR", "Invalid title");
    if (description != null && description.length > 2000)
        throw codeErr("VALIDATION_ERROR", "Description too long");
    if (!category || category.length > 60)
        throw codeErr("VALIDATION_ERROR", "Invalid category");
    if (!location || location.length > 120)
        throw codeErr("VALIDATION_ERROR", "Invalid location");
    if (!contact_phone || contact_phone.length > 30)
        throw codeErr("VALIDATION_ERROR", "Invalid contact_phone");
    if (image_url && image_url.length > 500)
        throw codeErr("VALIDATION_ERROR", "Invalid image_url");

    return { title, description: description || null, category, salary, location, contact_phone, image_url };
};

const validateUpdate = (body) => {
    const out = {};
    if (body.title !== undefined) out.title = String(body.title || "").trim();
    if (body.description !== undefined)
        out.description = body.description == null ? null : String(body.description || "").trim();
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
    if (out.description !== undefined && out.description != null && out.description.length > 2000)
        throw codeErr("VALIDATION_ERROR", "Description too long");
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
    const kycVerified = !!(user.kyc_face_verified || (user.kyc_status === "verified" && (user.kyc_level || 0) >= 2));
    if (!kycVerified) throw codeErr("FORBIDDEN", "Identity verification required. Complete verification in Profile before posting jobs.");
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

    const trustScoreService = require("../../services/trustScore.service");
    const trustScore = await trustScoreService.getTrustScore(userId);
    if (trustScoreService.shouldRestrictPosting(trustScore)) {
        throw codeErr("FORBIDDEN", "Your behavior trust score is too low. Maintain positive interactions to post jobs.");
    }

    const data = validateCreate(body);
    const content = { title: data.title, description: data.description, location: data.location };
    const risk = await fraudService.computeRiskScoreWithML(userId, content, "JOB");

    const rule = risk.rule || {};
    const ml = risk.ml || {};
    const final = risk.final || {};
    const ruleScore = rule.score ?? 0;

    const weakLabel = ruleScore >= 80 ? "SCAM" : ruleScore <= 20 ? "LEGIT" : "UNKNOWN";
    const scamTraining = require("../../services/scamML/scamTraining.mysql");
    const text = scamTraining.normalizeText(data.title, data.description, data.location);

    const id = await jobDb.insertJob({
        created_by: userId,
        ...data,
        risk_score: final.combinedScore ?? rule.score,
        matched_keywords: (rule.matchedKeywords || []).length ? JSON.stringify(rule.matchedKeywords) : null,
        ai_scam_score: ml.scamProbability != null ? Math.round(ml.scamProbability * 100) : null,
        ai_scam_labels: (ml.labels || []).length ? ml.labels : null,
        ai_confidence: ml.confidence ?? null,
        ai_provider: ml.modelVersion ? "ml" : "rules-only",
        ai_explanation: null,
        ml_score: ml.scamProbability ?? null,
        ml_model_version: ml.modelVersion ?? null,
        ml_confidence: ml.confidence ?? null,
        status: final.status || "active",
    });

    await scamTraining.insertSample({ targetType: "JOB", targetId: id, userId, text, weakLabel, labelSource: "RULES" }).catch(() => {});

    if (final.status === "PENDING_REVIEW") {
        const ModerationQueue = require("../unifiedReports/moderationQueue.model");
        const reasonSummary = `ML scam score ${Math.round((ml?.scamProbability ?? 0) * 100) || ruleScore}. Matched: ${(rule.matchedKeywords || []).join(", ") || "none"}`;
        await ModerationQueue.updateOne(
            { targetType: "JOB", targetId: String(id) },
            { $set: { targetType: "JOB", targetId: String(id), priority: "HIGH", reasonSummary, reportCount24h: 0, status: "PENDING", updatedAt: new Date() } },
            { upsert: true }
        );
    }

    fraudService.enqueueDeepScan({ targetType: "JOB", targetId: id, userId, content }).catch(() => {});

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
