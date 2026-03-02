// database/migrate.js
const fs = require("fs");
const path = require("path");
const { pool } = require("../config/mysql");

// ER_DUP_FIELDNAME = column already exists (MySQL errno 1060)
// ER_DUP_KEYNAME = index already exists (MySQL errno 1061)
const ER_DUP_FIELDNAME = 1060;
const ER_DUP_KEYNAME = 1061;

function getStatements(sql) {
  return sql
    .split(/;\s*\n/)
    .map((s) => s.replace(/--.*$/gm, "").trim())
    .filter((s) => s.length > 0);
}

const runMigrations = async () => {
  try {
    const files = fs.readdirSync(path.join(__dirname, "migrations")).sort();
    for (const file of files) {
      const sql = fs.readFileSync(path.join(__dirname, "migrations", file), "utf8");
      const statements = getStatements(sql);
      if (statements.length === 0) {
        console.log(`✅ Migration executed (no statements): ${file}`);
        continue;
      }
      for (const stmt of statements) {
        try {
          await pool.query(stmt);
        } catch (err) {
          if (err.errno === ER_DUP_FIELDNAME || err.errno === ER_DUP_KEYNAME) {
            console.log(`⏭️  Skipped (already applied): ${file}`);
          } else {
            throw err;
          }
        }
      }
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
