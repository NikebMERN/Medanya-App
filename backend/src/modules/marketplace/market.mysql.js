const { pool } = require("../../config/mysql");

/**
 * Create marketplace item
 */
const createItem = async ({
    title,
    description,
    price,
    category,
    location,
    images,
    user_id,
}) => {
    const [result] = await pool.query(
        `
    INSERT INTO marketplace_items
    (title, description, price, category, location, images, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
        [
            title,
            description,
            price,
            category,
            location,
            JSON.stringify(images || []),
            user_id,
        ]
    );

    return result.insertId;
};

/**
 * Get item by ID
 */
const getItemById = async (id) => {
    const [rows] = await pool.query(
        `SELECT * FROM marketplace_items WHERE id = ?`,
        [id]
    );
    return rows[0];
};

/**
 * List marketplace items (basic pagination)
 */
const listItems = async ({ limit = 20, offset = 0 }) => {
    const [rows] = await pool.query(
        `
    SELECT *
    FROM marketplace_items
    WHERE status = 'active'
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
    `,
        [Number(limit), Number(offset)]
    );

    return rows.map((row) => ({
        ...row,
        images: JSON.parse(row.images || "[]"),
    }));
};

/**
 * Update item status (sold / removed)
 */
const updateItemStatus = async (id, status) => {
    const [result] = await pool.query(
        `
    UPDATE marketplace_items
    SET status = ?
    WHERE id = ?
    `,
        [status, id]
    );

    return result.affectedRows > 0;
};

module.exports = {
    createItem,
    getItemById,
    listItems,
    updateItemStatus,
};
