// src/app.js
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const errorHandler = require("./middlewares/error.middleware");
const routes = require("./routes");

const app = express();

// Global Middlewares
app.use(cors());
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
