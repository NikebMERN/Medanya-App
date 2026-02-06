const express = require("express");
const router = express.Router();
const authRoutes = require("./modules/auth/auth.routes");
const authMiddleware = require("./middlewares/auth.middleware");
const adminRoutes = require("./modules/admin/admin.routes");
const chatRoutes = require("./modules/chats/chat.routes");
const jobRoutes = require("./modules/jobs/job.routes");
const reportRoutes = require("./modules/reports/report.routes");
const missingRoutes = require("./modules/missingPersons/missing.routes");
const marketRoutes = require("./modules/marketplace/market.routes");
const feedRoutes = require("./modules/feed/feed.routes");

router.use("/auth", authRoutes);

// STEP 4: Mount admin routes under /admin
router.use("/admin", adminRoutes);

// ✅ Step-6
router.use("/chats", chatRoutes);

// ✅ JOBS
router.use("/jobs", jobRoutes);

// ✅ REPORTS
router.use("/", reportRoutes);

// ✅ MISSING PERSONS
router.use("/", missingRoutes);

// ✅ MARKETPLACE
router.use("/", marketRoutes);

// ✅ FEED
router.use("/", feedRoutes);

router.get("/protected", authMiddleware, (req, res) => {
    res.json({
        message: "Protected access granted",
        user: req.user,
    });
});

module.exports = router;
