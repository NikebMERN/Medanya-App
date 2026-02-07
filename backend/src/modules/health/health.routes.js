// src/modules/health/health.routes.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { pool } = require("../../config/mysql");
const redis = require("../../config/redis");
const env = require("../../config/env");

router.get("/config", (req, res) => {
    return res.json({
        success: true,
        emergencyPhone: env.EMERGENCY_PHONE || null,
        emergencyLabel: env.EMERGENCY_LABEL || "Direct Community Liaison Line",
    });
});

router.get("/health", async (req, res) => {
    const out = {
        ok: true,
        time: new Date().toISOString(),
        services: {
            mysql: false,
            mongo: false,
            redis: false,
        },
    };

    try {
        const [rows] = await pool.query("SELECT 1 AS ok");
        out.services.mysql = rows?.[0]?.ok === 1;
    } catch { }

    try {
        out.services.mongo = mongoose.connection.readyState === 1;
    } catch { }

    try {
        const pong = await redis.ping();
        out.services.redis = pong === "PONG";
    } catch { }

    return res.json(out);
});

module.exports = router;
