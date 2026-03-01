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
const ordersRoutes = require("./modules/orders/orders.routes");
const feedRoutes = require("./modules/feed/feed.routes");
const videoRoutes = require("./modules/videos/video.routes");
const healthRoutes = require("./modules/health/health.routes");
const streamRoutes = require("./modules/livestream/stream.routes");
const walletRoutes = require("./modules/wallet/wallet.routes");
const stripeRoutes = require("./modules/payments/stripe.routes");
const stripeWebhook = require("./webhooks/stripe.webhook");
const veriffWebhook = require("./webhooks/veriff.webhook");
const sumsubWebhook = require("./webhooks/sumsub.webhook");
const notificationRoutes = require("./modules/notifications/notification.routes");
const severeAbuseRoutes = require("./modules/severeAbuse/abuse.routes");
const userRoutes = require("./modules/users/user.routes");
const roomRoutes = require("./modules/communityRooms/room.routes");
const kycRoutes = require("./modules/kyc/kyc.routes");
const moderationRoutes = require("./modules/moderation/moderation.routes");
const recommendationRoutes = require("./modules/recommendations/recommendation.routes");
const activityRoutes = require("./modules/activity/activity.routes");
const unifiedReportRoutes = require("./modules/unifiedReports/report.routes");
const analyticsRoutes = require("./modules/analytics/analytics.routes");

router.use("/auth", authRoutes);

// STEP 4: Mount admin routes under /admin
router.use("/admin", adminRoutes);

// ✅ Step-6
router.use("/chats", chatRoutes);

// ✅ JOBS
router.use("/jobs", jobRoutes);

// ✅ ACTIVITY (for report context - last 20 min)
router.use("/", activityRoutes);

// ✅ ANALYTICS (events, user insights, admin overview)
router.use("/analytics", analyticsRoutes);

// ✅ UNIFIED REPORTS (POST /reports) — must be before legacy report routes
router.use("/", unifiedReportRoutes);

// ✅ REPORTS (blacklist, listings, admin)
router.use("/", reportRoutes);

// ✅ MISSING PERSONS
router.use("/", missingRoutes);

// ✅ MARKETPLACE
router.use("/", marketRoutes);

// ✅ ORDERS
router.use("/", ordersRoutes);

// ✅ FEED
router.use("/", feedRoutes);

// ✅ VIDEO RECOMMENDATIONS (mount before video routes so /videos/recommendations is matched first)
router.use("/", recommendationRoutes);

// ✅ VIDEOS
router.use("/", videoRoutes);

// HEALTH CHECK
router.use("/", healthRoutes);

// ✅ LIVESTREAM
router.use("/", streamRoutes);

// ✅ WALLET
router.use("/", walletRoutes);

// ✅ STRIPE PAYMENTS
router.use("/", stripeRoutes);
router.use("/", stripeWebhook);
router.use("/", veriffWebhook);
router.use("/", sumsubWebhook);

// ✅ NOTIFICATIONS
router.use("/", notificationRoutes);

// ✅ SEVERE ABUSE
router.use("/", severeAbuseRoutes);

// ✅ USERS
router.use("/", userRoutes);

// ✅ KYC
router.use("/kyc", kycRoutes);

// ✅ COMMUNITY ROOMS (posts + comments + moderation)
router.use("/", roomRoutes);

// ✅ Moderation: content reports + admin queue + video/stream actions
router.use("/", moderationRoutes);

router.get("/protected", authMiddleware, (req, res) => {
    res.json({
        message: "Protected access granted",
        user: req.user,
    });
});

module.exports = router;
