// src/config/redis.js
// Redis caching strategy stubs. Replace with real redis client when available.
const logger = require("../utils/logger.util");

let client = null;
let redisUnavailable = false; // when true, always fall back to in-memory and never try Redis again this process

async function getRedis() {
    if (redisUnavailable) return null;
    if (client) return client;
    try {
        const Redis = require("ioredis");
        const url = process.env.REDIS_URL || "redis://localhost:6379";
        client = new Redis(url, {
            maxRetriesPerRequest: 1,
            lazyConnect: true,
            retryStrategy: () => null, // do not keep retrying forever
        });

        // Try a single connect; on failure, disable Redis for this process and use in-memory fallback.
        await client.connect().catch((e) => {
            logger.warn("Redis connect failed, using in-memory fallback", e?.message || e);
            redisUnavailable = true;
            try {
                client.disconnect();
            } catch {}
            client = null;
        });

        if (redisUnavailable) {
            return null;
        }

        return client;
    } catch (e) {
        logger.warn("Redis not available, using in-memory fallback", e?.message || e);
        redisUnavailable = true;
        client = null;
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

/** Bootstrap: connect to Redis (or use in-memory fallback). Does not throw. */
async function connectRedis() {
    await getRedis();
}

/** In-memory fallback for Redis when client is unavailable. Supports get, setEx, incr, expire, del. */
const memStore = new Map();
const memExpiry = new Map();

async function memGet(key) {
    const exp = memExpiry.get(key);
    if (exp && Date.now() > exp) {
        memStore.delete(key);
        memExpiry.delete(key);
        return null;
    }
    return memStore.get(key) ?? null;
}

async function memSetEx(key, ttlSeconds, val) {
    memStore.set(key, val);
    memExpiry.set(key, Date.now() + ttlSeconds * 1000);
}

async function memIncr(key) {
    const v = (Number(memStore.get(key)) || 0) + 1;
    memStore.set(key, String(v));
    return v;
}

async function memExpire(key, ttlSeconds) {
    memExpiry.set(key, Date.now() + ttlSeconds * 1000);
}

async function memDel(key) {
    memStore.delete(key);
    memExpiry.delete(key);
}

/**
 * Redis client proxy for auth/OTP flows.
 * Uses real Redis when available, otherwise in-memory fallback.
 */
const redisClient = {
    async get(key) {
        const redis = await getRedis();
        if (redis) {
            try {
                return await redis.get(key);
            } catch {
                return null;
            }
        }
        return memGet(key);
    },
    async setEx(key, ttlSeconds, val) {
        const redis = await getRedis();
        if (redis) {
            try {
                return await redis.setex(key, ttlSeconds, val);
            } catch {
                return memSetEx(key, ttlSeconds, val);
            }
        }
        return memSetEx(key, ttlSeconds, val);
    },
    async incr(key) {
        const redis = await getRedis();
        if (redis) {
            try {
                return await redis.incr(key);
            } catch {
                return memIncr(key);
            }
        }
        return memIncr(key);
    },
    async expire(key, ttlSeconds) {
        const redis = await getRedis();
        if (redis) {
            try {
                return await redis.expire(key, ttlSeconds);
            } catch {
                return memExpire(key, ttlSeconds);
            }
        }
        return memExpire(key, ttlSeconds);
    },
    async del(key) {
        const redis = await getRedis();
        if (redis) {
            try {
                return await redis.del(key);
            } catch {
                return memDel(key);
            }
        }
        return memDel(key);
    },
};

module.exports = {
    connectRedis,
    getRedis,
    get,
    set,
    del,
    redisClient,
    feedCandidatesKey,
    trendingKey,
    eventRateLimitKey,
};
