/**
 * Seed analytics test data — events and daily aggregates.
 */
const mongoose = require("mongoose");
require("dotenv").config();

const AnalyticsEvent = require("../../modules/analytics/analytics_events.model");
const AnalyticsDaily = require("../../modules/analytics/analytics_daily.model");

const TEST_USER_ID = "test-analytics-user-1";

async function seed() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const today = new Date();
    const dates = [];
    for (let i = 0; i < 35; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
    }

    // Create sample daily aggregates
    for (const date of dates) {
        const views = Math.floor(Math.random() * 300) + 50;
        const likes = Math.floor(Math.random() * 20) + 2;
        const comments = Math.floor(Math.random() * 10);
        await AnalyticsDaily.findOneAndUpdate(
            { userId: TEST_USER_ID, date },
            {
                $set: {
                    metrics: {
                        videoViews: views,
                        engagedViews: Math.floor(views * 0.15),
                        videoLikes: likes,
                        videoComments: comments,
                        follows: Math.floor(Math.random() * 5),
                        livestreamMinutes: Math.floor(Math.random() * 60),
                        giftsCoins: Math.floor(Math.random() * 100),
                        marketSalesCount: Math.random() > 0.7 ? 1 : 0,
                        marketSalesUSD: Math.random() > 0.8 ? Math.floor(Math.random() * 50) : 0,
                        jobPosts: 0,
                        reportsCount: 0,
                        videoUploads: Math.random() > 0.9 ? 1 : 0,
                        boosts: Math.floor(Math.random() * 5),
                    },
                },
            },
            { upsert: true }
        );
    }

    // Create sample events
    const eventTypes = ["video_view", "video_like", "video_comment", "follow", "livestream_gift", "market_purchase"];
    for (let i = 0; i < 100; i++) {
        const d = new Date();
        d.setDate(d.getDate() - Math.floor(Math.random() * 30));
        await AnalyticsEvent.create({
            userId: TEST_USER_ID,
            type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
            entityType: "video",
            entityId: `vid-${i}`,
            meta: { watchTime: Math.random() * 60 },
            createdAt: d,
        });
    }

    console.log("Analytics seed complete. Test userId:", TEST_USER_ID);
    await mongoose.disconnect();
}

seed().catch((e) => {
    console.error(e);
    process.exit(1);
});
