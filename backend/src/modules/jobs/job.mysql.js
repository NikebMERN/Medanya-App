// src/modules/jobs/job.mysql.js
const { pool } = require("../../config/mysql");

const insertJob = async ({
    created_by,
    title,
    description,
    category,
    salary,
    location,
    contact_phone,
    image_url,
    risk_score,
    matched_keywords,
    ai_scam_score,
    ai_scam_labels,
    ai_confidence,
    ai_provider,
    ai_explanation,
    ml_score,
    ml_model_version,
    ml_confidence,
    status: statusVal,
}) => {
    const status = statusVal || "active";
    const [result] = await pool.query(
        `INSERT INTO jobs
        (created_by, title, description, category, salary, location, contact_phone, image_url, risk_score, matched_keywords, ai_scam_score, ai_scam_labels, ai_confidence, ai_provider, ai_explanation, ml_score, ml_model_version, ml_confidence, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            created_by,
            title,
            description || null,
            category,
            salary || null,
            location,
            contact_phone,
            image_url || null,
            risk_score ?? null,
            matched_keywords ?? null,
            ai_scam_score ?? null,
            ai_scam_labels ? JSON.stringify(ai_scam_labels) : null,
            ai_confidence ?? null,
            ai_provider ?? null,
            ai_explanation ?? null,
            ml_score ?? null,
            ml_model_version ?? null,
            ml_confidence ?? null,
            status,
        ],
    );
    return result.insertId;
};

const findJobById = async (id) => {
    const [rows] = await pool.query(`SELECT * FROM jobs WHERE id = ? LIMIT 1`, [
        id,
    ]);
    return rows[0] || null;
};

const listJobs = async ({
    page = 1,
    limit = 20,
    category,
    location,
    status,
}) => {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const offset = (p - 1) * l;

    const where = [];
    const params = [];

    if (category) {
        where.push("category = ?");
        params.push(category);
    }
    if (location) {
        where.push("location LIKE ?");
        params.push(`%${location}%`);
    }
    if (status) {
        where.push("status = ?");
        params.push(status);
    } else {
        where.push("status = 'active'");
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [[countRow]] = await pool.query(
        `SELECT COUNT(*) AS total FROM jobs ${whereSql}`,
        params,
    );

    const [rows] = await pool.query(
        `
    SELECT *
    FROM jobs
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
    `,
        [...params, l, offset],
    );

    return { page: p, limit: l, total: countRow.total, jobs: rows };
};

const searchJobs = async ({ q, category, location, page = 1, limit = 20 }) => {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const offset = (p - 1) * l;

    const where = ["status = 'active'"];
    const params = [];

    if (category) {
        where.push("category = ?");
        params.push(category);
    }
    if (location) {
        where.push("location LIKE ?");
        params.push(`%${location}%`);
    }

    if (q) {
        // Prefer FULLTEXT if available; fallback to LIKE
        where.push("(title LIKE ? OR location LIKE ?)");
        params.push(`%${q}%`, `%${q}%`);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    const [[countRow]] = await pool.query(
        `SELECT COUNT(*) AS total FROM jobs ${whereSql}`,
        params,
    );

    const [rows] = await pool.query(
        `
    SELECT *
    FROM jobs
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
    `,
        [...params, l, offset],
    );

    return { page: p, limit: l, total: countRow.total, jobs: rows };
};

const updateJob = async (id, fields) => {
    const allowed = [
        "title",
        "description",
        "category",
        "salary",
        "location",
        "contact_phone",
        "image_url",
        "status",
    ];
    const set = [];
    const params = [];

    for (const key of allowed) {
        if (fields[key] !== undefined) {
            set.push(`${key} = ?`);
            params.push(fields[key]);
        }
    }

    if (set.length === 0) return 0;

    const [result] = await pool.query(
        `UPDATE jobs SET ${set.join(", ")} WHERE id = ?`,
        [...params, id],
    );

    return result.affectedRows;
};

const closeJob = async (id) => {
    const [result] = await pool.query(
        `UPDATE jobs SET status='closed' WHERE id = ?`,
        [id],
    );
    return result.affectedRows;
};

const listRecentJobsForFeed = async ({ limit = 25 } = {}) => {
    const l = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
    const [rows] = await pool.query(
        `
    SELECT id, title, category, salary, location, image_url, status, created_at
    FROM jobs
    WHERE status = 'active'
    ORDER BY created_at DESC
    LIMIT ?
    `,
        [l],
    );
    return rows;
};

const insertApplication = async (jobId, applicantId, message = null) => {
    const [result] = await pool.query(
        `INSERT INTO job_applications (job_id, applicant_id, message, status) VALUES (?, ?, ?, 'pending')`,
        [jobId, applicantId, message || null],
    );
    return result.insertId;
};

const findApplicationByJobAndApplicant = async (jobId, applicantId) => {
    const [rows] = await pool.query(
        `SELECT * FROM job_applications WHERE job_id = ? AND applicant_id = ? LIMIT 1`,
        [jobId, applicantId],
    );
    return rows[0] || null;
};

const listApplicationsByJobId = async (jobId, { page = 1, limit = 20 } = {}) => {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const offset = (p - 1) * l;
    const [rows] = await pool.query(
        `SELECT ja.*, u.display_name, u.phone_number FROM job_applications ja
         LEFT JOIN users u ON u.id = ja.applicant_id
         WHERE ja.job_id = ? ORDER BY ja.created_at DESC LIMIT ? OFFSET ?`,
        [jobId, l, offset],
    );
    const [[c]] = await pool.query(`SELECT COUNT(*) AS total FROM job_applications WHERE job_id = ?`, [jobId]);
    return { page: p, limit: l, total: c.total, applications: rows };
};

const listApplicationsByApplicantId = async (applicantId, { page = 1, limit = 20 } = {}) => {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const offset = (p - 1) * l;
    const [rows] = await pool.query(
        `SELECT ja.*, j.title, j.category, j.location, j.status AS job_status FROM job_applications ja
         LEFT JOIN jobs j ON j.id = ja.job_id
         WHERE ja.applicant_id = ? ORDER BY ja.created_at DESC LIMIT ? OFFSET ?`,
        [applicantId, l, offset],
    );
    const [[c]] = await pool.query(`SELECT COUNT(*) AS total FROM job_applications WHERE applicant_id = ?`, [applicantId]);
    return { page: p, limit: l, total: c.total, applications: rows };
};

const findApplicationById = async (id) => {
    const [rows] = await pool.query(
        `SELECT ja.*, j.created_by AS job_owner_id FROM job_applications ja JOIN jobs j ON j.id = ja.job_id WHERE ja.id = ?`,
        [id],
    );
    return rows[0] || null;
};

const updateApplicationStatus = async (id, status) => {
    const [result] = await pool.query(
        `UPDATE job_applications SET status = ? WHERE id = ?`,
        [status, id],
    );
    return result.affectedRows;
};

const insertJobRating = async (jobId, raterId, rating) => {
    const [result] = await pool.query(
        `INSERT INTO job_ratings (job_id, rater_id, rating) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE rating = VALUES(rating)`,
        [jobId, raterId, rating],
    );
    return result.affectedRows;
};

const incrementReportsAndMaybeHide = async (_type, jobId, newCount) => {
    const status = newCount >= 3 ? "HIDDEN_PENDING_REVIEW" : "active";
    await pool.query(
        `UPDATE jobs SET reports_count = ?, status = ? WHERE id = ?`,
        [newCount, status, jobId],
    );
};

const getAverageRatingByJobId = async (jobId) => {
    const [[row]] = await pool.query(
        `SELECT COALESCE(AVG(rating), 0) AS avgRating, COUNT(*) AS count FROM job_ratings WHERE job_id = ?`,
        [jobId],
    );
    return { avgRating: Number(Number(row.avgRating).toFixed(1)), count: row.count || 0 };
};

module.exports = {
    insertJob,
    findJobById,
    incrementReportsAndMaybeHide,
    listJobs,
    searchJobs,
    updateJob,
    closeJob,
    listRecentJobsForFeed,
    insertApplication,
    findApplicationByJobAndApplicant,
    listApplicationsByJobId,
    listApplicationsByApplicantId,
    findApplicationById,
    updateApplicationStatus,
    insertJobRating,
    getAverageRatingByJobId,
};
