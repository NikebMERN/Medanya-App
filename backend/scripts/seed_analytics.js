#!/usr/bin/env node
/**
 * Seed analytics_daily for instant graph testing.
 * Usage: node scripts/seed_analytics.js [days=30] [users=50] [creators=10]
 * Or: npm run seed:analytics -- 30 50 10
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

const AnalyticsDaily = require("../src/modules/analytics/analytics_daily.model");

const DEFAULTS = { days: 30, users: 50, creators: 10 };

function parseArgs() {
    const args = process.argv.slice(2);
    return {
        days: parseInt(args[0], 10) || DEFAULTS.days,
        users: parseInt(args[1], 10) || DEFAULTS.users,
        creators: parseInt(args[2], 10) || DEFAULTS.creators,
    };
}

function spikePattern(dayIndex, totalDays) {
    const x = dayIndex / totalDays;
    const base = 50 + Math.sin(x * Math.PI * 2) * 30;
    const weekend = dayIndex % 7 >= 5 ? 1.3 : 1;
    const trend = 1 + (1 - x) * 0.5;
    return Math.max(10, Math.round(base * weekend * trend));
}

async function seed() {
    const { days, users, creators } = parseArgs();
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("MONGO_URI required");
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB. Seeding:", { days, users, creators });

    const today = new Date();
    const dates = [];
    for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
    }

    for (let u = 0; u < users; u++) {
        const userId = `seed-user-${u + 1}`;
        const isCreator = u < creators;

        for (let i = 0; i < dates.length; i++) {
            const date = dates[i];
            const baseViews = isCreator ? spikePattern(i, dates.length) * (2 + Math.floor(u / 3)) : Math.floor(Math.random() * 20);
            const likes = Math.floor(baseViews * (0.02 + Math.random() * 0.05));
            const comments = Math.floor(baseViews * (0.005 + Math.random() * 0.02));
            const engagedViews = Math.floor(baseViews * (0.1 + Math.random() * 0.2));

            await AnalyticsDaily.findOneAndUpdate(
                { userId, date },
                {
                    $set: {
                        metrics: {
                            videoViews: baseViews,
                            engagedViews: Math.min(engagedViews, baseViews),
                            videoLikes: likes,
                            videoComments: comments,
                            follows: Math.floor(Math.random() * 5),
                            livestreamMinutes: Math.floor(Math.random() * 120),
                            giftsCoins: Math.floor(Math.random() * 500),
                            marketSalesCount: Math.random() > 0.85 ? 1 : 0,
                            marketSalesUSD: Math.random() > 0.9 ? Math.floor(Math.random() * 100) : 0,
                            jobPosts: Math.random() > 0.95 ? 1 : 0,
                            reportsCount: 0,
                            videoUploads: isCreator && Math.random() > 0.7 ? 1 : 0,
                            boosts: Math.floor(Math.random() * 3),
                        },
                    },
                },
                { upsert: true }
            );
        }
    }

    console.log("Analytics seed complete. Users:", users, "Creators:", creators, "Days:", days);
    await mongoose.disconnect();
}

seed().catch((e) => {
    console.error(e);
    process.exit(1);
});
