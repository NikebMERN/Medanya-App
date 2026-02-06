// src/modules/marketplace/market.mysql.js
const { pool } = require("../../config/mysql");

const insertItem = async ({
    seller_id,
    title,
    description,
    price,
    category,
    location,
    image_urls,
}) => {
    const [result] = await pool.query(
        `
    INSERT INTO marketplace_items
    (seller_id, title, description, price, category, location, image_urls, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `,
        [
            seller_id,
            title,
            description,
            price,
            category,
            location,
            image_urls ? JSON.stringify(image_urls) : null,
        ],
    );
    return result.insertId;
};

const findById = async (id) => {
    const [rows] = await pool.query(
        `SELECT * FROM marketplace_items WHERE id = ? LIMIT 1`,
        [id],
    );
    if (!rows[0]) return null;
    return normalizeRow(rows[0]);
};

const listItems = async ({
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
        `SELECT COUNT(*) AS total FROM marketplace_items ${whereSql}`,
        params,
    );

    const [rows] = await pool.query(
        `
    SELECT *
    FROM marketplace_items
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
    `,
        [...params, l, offset],
    );

    return {
        page: p,
        limit: l,
        total: countRow.total,
        items: rows.map(normalizeRow),
    };
};

const searchItems = async ({ q, category, location, page = 1, limit = 20 }) => {
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
        // LIKE fallback (works everywhere)
        where.push("(title LIKE ? OR description LIKE ?)");
        params.push(`%${q}%`, `%${q}%`);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    const [[countRow]] = await pool.query(
        `SELECT COUNT(*) AS total FROM marketplace_items ${whereSql}`,
        params,
    );

    const [rows] = await pool.query(
        `
    SELECT *
    FROM marketplace_items
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
    `,
        [...params, l, offset],
    );

    return {
        page: p,
        limit: l,
        total: countRow.total,
        items: rows.map(normalizeRow),
    };
};

const updateItem = async (id, fields) => {
    const allowed = [
        "title",
        "description",
        "price",
        "category",
        "location",
        "image_urls",
        "status",
    ];
    const set = [];
    const params = [];

    for (const key of allowed) {
        if (fields[key] !== undefined) {
            set.push(`${key} = ?`);
            if (key === "image_urls")
                params.push(fields[key] ? JSON.stringify(fields[key]) : null);
            else params.push(fields[key]);
        }
    }

    if (set.length === 0) return 0;

    const [result] = await pool.query(
        `UPDATE marketplace_items SET ${set.join(", ")} WHERE id = ?`,
        [...params, id],
    );

    return result.affectedRows;
};

const markSold = async (id) => {
    const [result] = await pool.query(
        `UPDATE marketplace_items SET status='sold' WHERE id = ?`,
        [id],
    );
    return result.affectedRows;
};

const softRemove = async (id) => {
    const [result] = await pool.query(
        `UPDATE marketplace_items SET status='removed' WHERE id = ?`,
        [id],
    );
    return result.affectedRows;
};

function normalizeRow(row) {
    let image_urls = [];
    try {
        image_urls = row.image_urls ? JSON.parse(row.image_urls) : [];
    } catch {
        image_urls = [];
    }

    return { ...row, image_urls };
}

const listRecentMarketplaceForFeed = async ({ limit = 25 } = {}) => {
    const l = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
    const [rows] = await pool.query(
        `
    SELECT id, title, price, category, location, image_urls, status, created_at
    FROM marketplace_items
    WHERE status = 'active'
    ORDER BY created_at DESC
    LIMIT ?
    `,
        [l],
    );

    return rows.map(normalizeRow);
};

module.exports = {
    insertItem,
    findById,
    listItems,
    searchItems,
    updateItem,
    markSold,
    softRemove,
    listRecentMarketplaceForFeed,
};
