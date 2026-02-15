// src/database/seeds/admin.seed.js
const path = require("path");
// Load .env from backend root so seed works when run from any directory
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

const { pool } = require("../../config/mysql");

const seedAdmin = async () => {
    try {
        // Upsert-like behavior: if phone exists, ensure it is admin
        const phone = "+251900000001";

        const [rows] = await pool.query(
            "SELECT id FROM users WHERE phone_number = ?",
            [phone],
        );

        if (rows.length === 0) {
            await pool.query(
                "INSERT INTO users (phone_number, role, is_verified, is_banned) VALUES (?, ?, ?, ?)",
                [phone, "admin", 1, 0],
            );
            console.log("✅ Admin created");
        } else {
            await pool.query(
                "UPDATE users SET role='admin', is_banned=0, is_verified=1 WHERE phone_number = ?",
                [phone],
            );
            console.log("✅ Admin ensured");
        }

        process.exit(0);
    } catch (err) {
        console.error("❌ Admin seed failed:", err);
        process.exit(1);
    }
};

seedAdmin();
