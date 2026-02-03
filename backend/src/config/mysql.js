// src/config/mysql.js
const mysql = require("mysql2/promise");
const env = require("./env");

const pool = mysql.createPool({
    host: env.MYSQL_HOST,
    port: Number(env.MYSQL_PORT),
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DB,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

const testMySQLConnection = async () => {
    try {
        const [rows] = await pool.query("SELECT 1");
        console.log("✅ MySQL connected");
    } catch (err) {
        console.error("❌ MySQL connection failed:", err);
        process.exit(1);
    }
};

module.exports = { pool, testMySQLConnection };
