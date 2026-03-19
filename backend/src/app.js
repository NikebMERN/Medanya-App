// src/app.js
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const errorHandler = require("./middlewares/error.middleware");
const routes = require("./routes");
const env = require("./config/env");

const app = express();

// CORS: allow app origins (web, Expo, native). Set CORS_ORIGIN in .env to restrict in prod (e.g. https://yourapp.com).
const corsOrigin = env.CORS_ORIGIN;
const corsOptions = {
  origin: corsOrigin === "*" || !corsOrigin ? true : corsOrigin.split(",").map((o) => o.trim()).filter(Boolean),
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Device-ID", "X-Requested-With", "Accept"],
  credentials: true,
};
app.use(cors(corsOptions));
// Body parser: webhooks need RAW body for HMAC - must NOT parse JSON before verification
app.use((req, res, next) => {
    const p = req.path;
    const rawPaths = ["/api/webhooks/veriff/decision", "/api/webhooks/veriff/events", "/api/webhooks/stripe"];
    if (rawPaths.includes(p)) {
        return express.raw({ type: "application/json" })(req, res, next);
    }
    return express.json({ limit: "10mb" })(req, res, next);
});
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Routes
app.use("/api", routes);

// Health check
app.get("/", (req, res) => res.json({ status: "ok" }));

// Error middleware (always last)
app.use(errorHandler);

module.exports = app;
