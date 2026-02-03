const { pool } = require("../../src/config/mysql");

const seedAdmin = async () => {
    try {
        await pool.query(
            "INSERT INTO users (phone_number, role, is_verified) VALUES (?, ?, ?)",
            ["+251900000001", "admin", 1]
        );
        console.log("✅ Admin seeded");
        process.exit(0);
    } catch (err) {
        console.error("❌ Admin seed failed:", err);
        process.exit(1);
    }
};

seedAdmin();
