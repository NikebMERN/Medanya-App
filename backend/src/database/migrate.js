// database/migrate.js
const fs = require("fs");
const path = require("path");
const { pool } = require("../config/mysql");

const runMigrations = async () => {
  try {
    const files = fs.readdirSync(path.join(__dirname, "migrations")).sort();
    for (const file of files) {
      const sql = fs.readFileSync(path.join(__dirname, "migrations", file), "utf8");
      await pool.query(sql);
      console.log(`✅ Migration executed: ${file}`);
    }
    console.log("🎉 All migrations executed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
};

runMigrations();
