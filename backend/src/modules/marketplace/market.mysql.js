// src/modules/marketplace/market.mysql.js
const { pool } = require("../../config/mysql");

const insertItem = async ({
    seller_id,
    title,
    description,
    price,
    currency,
    category,
    location,
    image_urls,
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
    const cur = currency || "AED";
    const [result] = await pool.query(
        `INSERT INTO marketplace_items
        (seller_id, title, description, price, currency, category, location, image_urls, risk_score, matched_keywords, ai_scam_score, ai_scam_labels, ai_confidence, ai_provider, ai_explanation, ml_score, ml_model_version, ml_confidence, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            seller_id,
            title,
            description,
            price,
            cur,
            category,
            location,
            image_urls ? JSON.stringify(image_urls) : null,
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
    sort = "newest",
    includeCreatorPending,
    userId,
    sellerId,
}) => {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const offset = (p - 1) * l;

    const where = [];
    const params = [];

    if (sellerId) {
        where.push("seller_id = ?");
        params.push(sellerId);
    }
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
    } else if (includeCreatorPending && userId) {
        where.push("(status = 'active' OR (status IN ('pending_review', 'hidden_pending_review') AND seller_id = ?))");
        params.push(userId);
    } else {
        where.push("status = 'active'");
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    let orderBy = "ORDER BY created_at DESC";
    if (sort === "price_low") orderBy = "ORDER BY price IS NULL, price ASC, created_at DESC";
    else if (sort === "price_high") orderBy = "ORDER BY price IS NULL, price DESC, created_at DESC";

    const [[countRow]] = await pool.query(
        `SELECT COUNT(*) AS total FROM marketplace_items ${whereSql}`,
        params,
    );

    const [rows] = await pool.query(
        `SELECT * FROM marketplace_items ${whereSql} ${orderBy} LIMIT ? OFFSET ?`,
        [...params, l, offset],
    );

    return {
        page: p,
        limit: l,
        total: countRow.total,
        items: rows.map(normalizeRow),
    };
};

const searchItems = async ({ q, category, location, page = 1, limit = 20, sort = "newest", includeCreatorPending, userId, sellerId }) => {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const offset = (p - 1) * l;

    const where = [];
    const params = [];
    if (includeCreatorPending && userId) {
        where.push("(status = 'active' OR (status IN ('pending_review', 'hidden_pending_review') AND seller_id = ?))");
        params.push(userId);
    } else {
        where.push("status = 'active'");
    }
    if (sellerId) {
        where.push("seller_id = ?");
        params.push(sellerId);
    }
    if (category) {
        where.push("category = ?");
        params.push(category);
    }
    if (location) {
        where.push("location LIKE ?");
        params.push(`%${location}%`);
    }
    if (q) {
        where.push("(title LIKE ? OR description LIKE ?)");
        params.push(`%${q}%`, `%${q}%`);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    let orderBy = "ORDER BY created_at DESC";
    if (sort === "price_low") orderBy = "ORDER BY price IS NULL, price ASC, created_at DESC";
    else if (sort === "price_high") orderBy = "ORDER BY price IS NULL, price DESC, created_at DESC";

    const [[countRow]] = await pool.query(
        `SELECT COUNT(*) AS total FROM marketplace_items ${whereSql}`,
        params,
    );

    const [rows] = await pool.query(
        `SELECT * FROM marketplace_items ${whereSql} ${orderBy} LIMIT ? OFFSET ?`,
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

const incrementReportsAndMaybeHide = async (_type, itemId, newCount) => {
    const status = newCount >= 3 ? "HIDDEN_PENDING_REVIEW" : "active";
    const [result] = await pool.query(
        `UPDATE marketplace_items SET reports_count = ?, status = ? WHERE id = ?`,
        [newCount, status, itemId],
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

function toJsonSafeNumber(v) {
    if (v == null) return v;
    if (typeof v === "bigint") return Number(v);
    return v;
}

function normalizeRow(row) {
    let image_urls = [];
    try {
        image_urls = row.image_urls ? JSON.parse(row.image_urls) : [];
    } catch {
        image_urls = [];
    }
    const out = { ...row, image_urls };
    if (out.id !== undefined) out.id = toJsonSafeNumber(out.id);
    if (out.seller_id !== undefined) out.seller_id = toJsonSafeNumber(out.seller_id);
    return out;
}

const addFavorite = async (userId, itemId) => {
    const [result] = await pool.query(
        `INSERT IGNORE INTO marketplace_favorites (user_id, item_id) VALUES (?, ?)`,
        [userId, itemId],
    );
    return result.affectedRows > 0;
};

const removeFavorite = async (userId, itemId) => {
    const [result] = await pool.query(
        `DELETE FROM marketplace_favorites WHERE user_id = ? AND item_id = ?`,
        [userId, itemId],
    );
    return result.affectedRows > 0;
};

const listFavoriteItemIdsByUserId = async (userId) => {
    const [rows] = await pool.query(
        `SELECT item_id FROM marketplace_favorites WHERE user_id = ? ORDER BY created_at DESC`,
        [userId],
    );
    return rows.map((r) => r.item_id);
};

const isFavorite = async (userId, itemId) => {
    const [rows] = await pool.query(
        `SELECT 1 FROM marketplace_favorites WHERE user_id = ? AND item_id = ? LIMIT 1`,
        [userId, itemId],
    );
    return rows.length > 0;
};

const listRecentMarketplaceForFeed = async ({ limit = 25 } = {}) => {
    const l = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
    const [rows] = await pool.query(
        `
    SELECT m.id, m.seller_id, m.title, m.price, m.currency, m.category, m.location, m.image_urls, m.status, m.created_at
    FROM marketplace_items m
    LEFT JOIN users u ON u.id = m.seller_id
    WHERE m.status = 'active' AND (u.id IS NULL OR (u.is_banned = 0 AND u.is_active = 1))
    ORDER BY m.created_at DESC
    LIMIT ?
    `,
        [l],
    );

    return rows.map(normalizeRow);
};

module.exports = {
    insertItem,
    findById,
    incrementReportsAndMaybeHide,
    listItems,
    searchItems,
    updateItem,
    markSold,
    softRemove,
    listRecentMarketplaceForFeed,
    addFavorite,
    removeFavorite,
    listFavoriteItemIdsByUserId,
    isFavorite,
};
