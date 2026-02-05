// src/modules/jobs/job.mysql.js
const { pool } = require("../../config/mysql");

const insertJob = async ({
    created_by,
    title,
    category,
    salary,
    location,
    contact_phone,
    image_url,
}) => {
    const [result] = await pool.query(
        `
    INSERT INTO jobs
    (created_by, title, category, salary, location, contact_phone, image_url, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `,
        [
            created_by,
            title,
            category,
            salary || null,
            location,
            contact_phone,
            image_url || null,
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

module.exports = {
    insertJob,
    findJobById,
    listJobs,
    searchJobs,
    updateJob,
    closeJob,
};
