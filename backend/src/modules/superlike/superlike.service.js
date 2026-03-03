const mongoose = require("mongoose");
const superlikeDb = require("./superlike.mysql");
const userDb = require("../users/user.mysql");
const Video = require("../videos/video.model");
const Stream = require("../livestream/stream.model");

const WELCOME_AMOUNT = 5;
const AD_AMOUNT = 1;
const REFERRAL_AMOUNT = 3;
const SPEND_AMOUNT = 1;
const DAILY_AD_LIMIT = 10;
const DAILY_REFERRAL_LIMIT = 20;

function err(code, message) {
    const e = new Error(message || code);
    e.code = code;
    return e;
}

function toId(u) {
    return String(u?.id ?? u?.userId ?? "");
}

function isCreatorVerified(user) {
    return !!(user?.kyc_face_verified || (user?.kyc_status === "verified" && (user?.kyc_level || 0) >= 2));
}

async function getBalance(user) {
    const userId = toId(user);
    if (!userId) throw err("UNAUTHORIZED", "Auth required");
    const conn = await superlikeDb.pool.getConnection();
    try {
        return await superlikeDb.getBalance(conn, userId);
    } finally {
        conn.release();
    }
}

async function earnWelcome(user) {
    const userId = toId(user);
    if (!userId) throw err("UNAUTHORIZED", "Auth required");
    const conn = await superlikeDb.pool.getConnection();
    try {
        await conn.beginTransaction();
        const claimed = await superlikeDb.hasClaimedWelcome(conn, userId);
        if (claimed) throw err("ALREADY_CLAIMED", "Welcome reward already claimed");
        const bal = await superlikeDb.getBalanceForUpdate(conn, userId);
        const newBal = bal.balance + WELCOME_AMOUNT;
        await superlikeDb.setBalance(conn, userId, newBal);
        await superlikeDb.insertTx(conn, { user_id: userId, type: "WELCOME", amount: WELCOME_AMOUNT });
        await conn.commit();
        return { balance: newBal, earned: WELCOME_AMOUNT };
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}

async function earnAd(user) {
    const userId = toId(user);
    if (!userId) throw err("UNAUTHORIZED", "Auth required");
    const conn = await superlikeDb.pool.getConnection();
    try {
        await conn.beginTransaction();
        const count = await superlikeDb.getDailyEarnCount(conn, userId, "AD");
        if (count >= DAILY_AD_LIMIT) throw err("DAILY_LIMIT", `Max ${DAILY_AD_LIMIT} ad rewards per day`);
        const bal = await superlikeDb.getBalanceForUpdate(conn, userId);
        const newBal = bal.balance + AD_AMOUNT;
        await superlikeDb.setBalance(conn, userId, newBal);
        await superlikeDb.insertTx(conn, { user_id: userId, type: "AD", amount: AD_AMOUNT });
        await conn.commit();
        return { balance: newBal, earned: AD_AMOUNT };
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}

async function earnReferral(user, { referredUserId } = {}) {
    const referrerId = toId(user);
    if (!referrerId) throw err("UNAUTHORIZED", "Auth required");
    if (!referredUserId) throw err("VALIDATION_ERROR", "referredUserId required");
    if (String(referrerId) === String(referredUserId)) throw err("VALIDATION_ERROR", "Cannot self-refer");
    const conn = await superlikeDb.pool.getConnection();
    try {
        await conn.beginTransaction();
        const count = await superlikeDb.getDailyEarnCount(conn, referrerId, "REFERRAL");
        if (count >= DAILY_REFERRAL_LIMIT) throw err("DAILY_LIMIT", "Referral limit reached");
        const bal = await superlikeDb.getBalanceForUpdate(conn, referrerId);
        const newBal = bal.balance + REFERRAL_AMOUNT;
        await superlikeDb.setBalance(conn, referrerId, newBal);
        await superlikeDb.insertTx(conn, {
            user_id: referrerId,
            type: "REFERRAL",
            amount: REFERRAL_AMOUNT,
            meta: JSON.stringify({ referredUserId }),
        });
        await conn.commit();
        return { balance: newBal, earned: REFERRAL_AMOUNT };
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}

async function spendOnVideo(user, videoId) {
    const userId = toId(user);
    if (!userId) throw err("UNAUTHORIZED", "Auth required");
    if (!mongoose.isValidObjectId(videoId)) throw err("NOT_FOUND", "Video not found");
    const video = await Video.findById(videoId).lean();
    if (!video) throw err("NOT_FOUND", "Video not found");
    const creatorId = String(video.uploaderId || video.createdBy || "");
    if (creatorId === userId) throw err("FORBIDDEN", "Cannot send SuperLike to your own content");

    const conn = await superlikeDb.pool.getConnection();
    try {
        await conn.beginTransaction();
        const bal = await superlikeDb.getBalanceForUpdate(conn, userId);
        if (bal.balance < SPEND_AMOUNT) throw err("INSUFFICIENT_SUPERLIKES", "Not enough SuperLikes");
        const newBal = bal.balance - SPEND_AMOUNT;
        await superlikeDb.setBalance(conn, userId, newBal);
        await superlikeDb.insertTx(conn, {
            user_id: userId,
            type: "SPEND",
            amount: -SPEND_AMOUNT,
            video_id: videoId,
        });
        await conn.commit();
        await Video.updateOne({ _id: videoId }, { $inc: { "stats.superlikes": 1 } }).catch(() => {});
        return { balance: newBal, spent: SPEND_AMOUNT };
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}

async function spendOnLive(user, streamId) {
    const userId = toId(user);
    if (!userId) throw err("UNAUTHORIZED", "Auth required");
    if (!mongoose.isValidObjectId(streamId)) throw err("NOT_FOUND", "Stream not found");
    const stream = await Stream.findById(streamId).lean();
    if (!stream) throw err("NOT_FOUND", "Stream not found");
    const creatorId = String(stream.hostId || "");
    if (creatorId === userId) throw err("FORBIDDEN", "Cannot send SuperLike to your own content");
    if (stream.status !== "live") throw err("STREAM_NOT_LIVE", "Stream not live");

    const conn = await superlikeDb.pool.getConnection();
    try {
        await conn.beginTransaction();
        const bal = await superlikeDb.getBalanceForUpdate(conn, userId);
        if (bal.balance < SPEND_AMOUNT) throw err("INSUFFICIENT_SUPERLIKES", "Not enough SuperLikes");
        const newBal = bal.balance - SPEND_AMOUNT;
        await superlikeDb.setBalance(conn, userId, newBal);
        await superlikeDb.insertTx(conn, {
            user_id: userId,
            type: "SPEND",
            amount: -SPEND_AMOUNT,
            livestream_id: streamId,
        });
        await conn.commit();
        return { balance: newBal, spent: SPEND_AMOUNT };
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}

async function getCreatorEarningsMonthly(user, { month } = {}) {
    const userId = toId(user);
    if (!userId) throw err("UNAUTHORIZED", "Auth required");
    const m = month || new Date().toISOString().slice(0, 7);
    const conn = await superlikeDb.pool.getConnection();
    try {
        const [rows] = await conn.execute(
            "SELECT * FROM creator_monthly WHERE creator_id = ? AND month = ?",
            [userId, m],
        );
        return rows[0] || null;
    } finally {
        conn.release();
    }
}

module.exports = {
    getBalance,
    earnWelcome,
    earnAd,
    earnReferral,
    spendOnVideo,
    spendOnLive,
    getCreatorEarningsMonthly,
};
