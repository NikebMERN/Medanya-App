// src/config/redis.js
// Redis caching strategy stubs. Replace with real redis client when available.
const logger = require("../utils/logger.util");

let client = null;

async function getRedis() {
    if (client) return client;
    try {
        const Redis = require("ioredis");
        const url = process.env.REDIS_URL || "redis://localhost:6379";
        client = new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: true });
        await client.connect().catch(() => {});
        return client;
    } catch (e) {
        logger.warn("Redis not available, using in-memory fallback", e?.message);
        return null;
    }
}

const memory = new Map();

async function get(key) {
    const redis = await getRedis();
    if (redis) {
        try {
            const v = await redis.get(key);
            return v != null ? JSON.parse(v) : null;
        } catch {
            return null;
        }
    }
    const entry = memory.get(key);
    if (!entry) return null;
    if (entry.exp && Date.now() > entry.exp) {
        memory.delete(key);
        return null;
    }
    return entry.val;
}

async function set(key, val, ttlSeconds = 300) {
    const redis = await getRedis();
    if (redis) {
        try {
            await redis.setex(key, ttlSeconds, JSON.stringify(val));
            return true;
        } catch {
            return false;
        }
    }
    memory.set(key, { val, exp: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null });
    return true;
}

async function del(key) {
    const redis = await getRedis();
    if (redis) {
        try {
            await redis.del(key);
            return true;
        } catch {
            return false;
        }
    }
    memory.delete(key);
    return true;
}

/** Cache key for user feed candidates (1–5 min TTL). */
function feedCandidatesKey(userId, region, language) {
    return `rec:feed:${userId || "anon"}:${region || "default"}:${language || "en"}`;
}

/** Cache key for trending list. */
function trendingKey(region, language) {
    return `rec:trending:${region || "default"}:${language || "en"}`;
}

/** Rate limit key for event ingestion. */
function eventRateLimitKey(userId) {
    return `rec:events:rl:${userId}`;
}

module.exports = {
    getRedis,
    get,
    set,
    del,
    feedCandidatesKey,
    trendingKey,
    eventRateLimitKey,
};
