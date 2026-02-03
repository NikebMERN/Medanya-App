// src/app.js
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const errorHandler = require("./middlewares/error.middleware");

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Health check
app.get("/", (req, res) => res.json({ status: "ok" }));

// Error middleware (always last)
app.use(errorHandler);

module.exports = app;
