// src/modules/jobs/job.controller.js
const jobService = require("./job.service");
const {
    enqueueNotificationJob,
} = require("../../utils/notificationQueue.util");

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

const createJob = async (req, res) => {
    try {
        const job = await jobService.createJob(req.user, req.body);

        // ✅ 1) Emit Socket.IO event for realtime refresh
        const io = req.app.get("io");
        if (io) {
            io.emit("jobs:new", {
                job: {
                    id: job.id,
                    title: job.title,
                    category: job.category,
                    salary: job.salary,
                    location: job.location,
                    contact_phone: job.contact_phone,
                    image_url: job.image_url,
                    status: job.status,
                    created_at: job.created_at,
                },
            });
        }

        // ✅ 2) Enqueue background job for future notification module
        await enqueueNotificationJob("jobs:new", {
            jobId: job.id,
            category: job.category,
            location: job.location,
            title: job.title,
        });

        return res.status(201).json({ success: true, job });
    } catch (err) {
        return sendErr(res, err);
    }
};

const listJobs = async (req, res) => {
    try {
        const userId = req.user?.id ?? req.user?.userId;
        const data = await jobService.list({ ...req.query, userId });
        return res.json({ success: true, ...data });
    } catch (err) {
        return sendErr(res, err);
    }
};

const getJob = async (req, res) => {
    try {
        const job = await jobService.getJob(req.params.id);
        return res.json({ success: true, job });
    } catch (err) {
        return sendErr(res, err);
    }
};

const updateJob = async (req, res) => {
    try {
        const job = await jobService.update(req.user, req.params.id, req.body);
        return res.json({ success: true, job });
    } catch (err) {
        return sendErr(res, err);
    }
};

const deleteJob = async (req, res) => {
    try {
        await jobService.remove(req.user, req.params.id);
        return res.json({ success: true });
    } catch (err) {
        return sendErr(res, err);
    }
};

const searchJobs = async (req, res) => {
    try {
        const userId = req.user?.id ?? req.user?.userId;
        const data = await jobService.search({ ...req.query, userId });
        return res.json({ success: true, ...data });
    } catch (err) {
        return sendErr(res, err);
    }
};

const applyToJob = async (req, res) => {
    try {
        const application = await jobService.apply(req.user, req.params.id, req.body);
        return res.status(201).json({ success: true, application });
    } catch (err) {
        return sendErr(res, err);
    }
};

const listJobApplications = async (req, res) => {
    try {
        const data = await jobService.listApplicationsForJob(req.user, req.params.id, req.query);
        return res.json({ success: true, ...data });
    } catch (err) {
        return sendErr(res, err);
    }
};

const listMyApplications = async (req, res) => {
    try {
        const data = await jobService.listMyApplications(req.user, req.query);
        return res.json({ success: true, ...data });
    } catch (err) {
        return sendErr(res, err);
    }
};

const patchApplicationStatus = async (req, res) => {
    try {
        const result = await jobService.updateApplicationStatus(req.user, req.params.applicationId, req.body.status);
        return res.json({ success: true, ...result });
    } catch (err) {
        return sendErr(res, err);
    }
};

const rateJob = async (req, res) => {
    try {
        const result = await jobService.rateJob(req.user, req.params.id, req.body);
        return res.json({ success: true, ...result });
    } catch (err) {
        return sendErr(res, err);
    }
};

module.exports = {
    createJob,
    listJobs,
    getJob,
    updateJob,
    deleteJob,
    searchJobs,
    applyToJob,
    listJobApplications,
    listMyApplications,
    patchApplicationStatus,
    rateJob,
};
