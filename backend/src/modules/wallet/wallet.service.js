// src/modules/wallet/wallet.service.js
const walletDb = require("./wallet.mysql");
const txDb = require("./transaction.mysql");
const userDb = require("../users/user.mysql");
const payments = require("../../config/payments");

function err(code, message) {
    const e = new Error(message || code);
    e.code = code;
    return e;
}

function asIntAmount(v) {
    const n = Number(v);
    if (!Number.isInteger(n) || n <= 0)
        throw err("VALIDATION_ERROR", "amount must be positive integer coins");
    return n;
}

async function getMyWallet(userId, { last = 10 } = {}) {
    const conn = await walletDb.pool.getConnection();
    try {
        await walletDb.ensureWallet(conn, userId);
        const wallet = await walletDb.getWallet(conn, userId);
        const txs = await txDb.latestTransactions(conn, userId, last);
        return { wallet, transactions: txs };
    } finally {
        conn.release();
    }
}

// Core atomic credit
async function credit(userId, amount, reference = {}) {
    const a = asIntAmount(amount);
    const conn = await walletDb.pool.getConnection();

    try {
        await conn.beginTransaction();

        const w = await walletDb.getWalletForUpdate(conn, userId);
        const newBal = w.balance + a;

        await walletDb.setBalance(conn, userId, newBal);

        await txDb.insertTransaction(conn, {
            user_id: userId,
            type: "credit",
            amount: a,
            reference_type: reference.type || null,
            reference_id: reference.id || null,
            metadata: reference.meta ? JSON.stringify(reference.meta) : null,
        });

        await conn.commit();
        return { userId, balance: newBal };
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}

// Core atomic debit
async function debit(userId, amount, reference = {}) {
    const a = asIntAmount(amount);
    const conn = await walletDb.pool.getConnection();

    try {
        await conn.beginTransaction();

        const w = await walletDb.getWalletForUpdate(conn, userId);
        if (w.balance < a) throw err("INSUFFICIENT_FUNDS", "Insufficient balance");

        const newBal = w.balance - a;
        await walletDb.setBalance(conn, userId, newBal);

        await txDb.insertTransaction(conn, {
            user_id: userId,
            type: "debit",
            amount: -a,
            reference_type: reference.type || null,
            reference_id: reference.id || null,
            metadata: reference.meta ? JSON.stringify(reference.meta) : null,
        });

        await conn.commit();
        return { userId, balance: newBal };
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}

/**
 * Atomic split transfer for gifts:
 * viewer pays totalAmount
 * host receives hostAmount
 * platform receives platformAmount
 */
async function splitGift(
    viewerId,
    hostId,
    totalAmount,
    sharesBps = {},
    reference = {},
) {
    const total = asIntAmount(totalAmount);

    const platformBps = Number.isInteger(sharesBps.platformCommissionBps)
        ? sharesBps.platformCommissionBps
        : payments.platformCommissionBps;

    if (
        !Number.isInteger(platformBps) ||
        platformBps < 0 ||
        platformBps > 10000
    ) {
        throw err("VALIDATION_ERROR", "platformCommissionBps invalid");
    }

    const platformAmount = Math.floor((total * platformBps) / 10000);
    const hostAmount = total - platformAmount;

    const platformUserId =
        sharesBps.platformUserId || payments.platformWalletUserId;
    if (!platformUserId)
        throw err(
            "CONFIG_ERROR",
            "platformWalletUserId missing in config/payments.js",
        );

    const conn = await walletDb.pool.getConnection();
    try {
        await conn.beginTransaction();

        // lock all three wallets (consistent order avoids deadlocks)
        const ids = [
            String(viewerId),
            String(hostId),
            String(platformUserId),
        ].sort();
        for (const id of ids) await walletDb.getWalletForUpdate(conn, id);

        const viewerW = await walletDb.getWalletForUpdate(conn, viewerId);
        if (viewerW.balance < total)
            throw err("INSUFFICIENT_FUNDS", "Insufficient balance");

        await walletDb.setBalance(conn, viewerId, viewerW.balance - total);

        const hostW = await walletDb.getWalletForUpdate(conn, hostId);
        await walletDb.setBalance(conn, hostId, hostW.balance + hostAmount);

        const platW = await walletDb.getWalletForUpdate(conn, platformUserId);
        await walletDb.setBalance(
            conn,
            platformUserId,
            platW.balance + platformAmount,
        );

        // ledger rows
        await txDb.insertTransaction(conn, {
            user_id: viewerId,
            type: "debit",
            amount: -total,
            reference_type: reference.type || "gift",
            reference_id: reference.id || null,
            metadata: JSON.stringify({
                ...reference.meta,
                toHostId: hostId,
                platformUserId,
            }),
        });

        await txDb.insertTransaction(conn, {
            user_id: hostId,
            type: "earn",
            amount: hostAmount,
            reference_type: reference.type || "gift",
            reference_id: reference.id || null,
            metadata: JSON.stringify({ ...reference.meta, fromUserId: viewerId }),
        });

        await txDb.insertTransaction(conn, {
            user_id: platformUserId,
            type: "commission",
            amount: platformAmount,
            reference_type: reference.type || "gift",
            reference_id: reference.id || null,
            metadata: JSON.stringify({ ...reference.meta, fromUserId: viewerId }),
        });

        await conn.commit();

        return {
            viewer: { userId: viewerId, balance: viewerW.balance - total },
            host: { userId: hostId, delta: hostAmount },
            platform: { userId: platformUserId, delta: platformAmount },
            split: { total, hostAmount, platformAmount, platformBps },
        };
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}

async function supportCreator({ supporterId, creatorId, amount, context, contextId }) {
    const amt = asIntAmount(amount);
    const ctx = String(context || "").toUpperCase();
    const ctxId = contextId ? String(contextId) : null;

    if (!["VIDEO", "LIVE"].includes(ctx)) throw err("VALIDATION_ERROR", "context must be VIDEO or LIVE");

    return splitGift(supporterId, creatorId, amt, {}, {
        type: "support",
        id: ctxId,
        meta: { context: ctx, contextId: ctxId },
    });
}

async function listMyTransactions(userId, { page, limit }) {
    const conn = await walletDb.pool.getConnection();
    try {
        return txDb.listTransactions(conn, { userId, page, limit });
    } finally {
        conn.release();
    }
}

// Task config: reward (MC), dailyCap (per day), oneTime (claim once ever)
const TASK_CONFIG = {
    WATCH_AD: { reward: 12, dailyCap: 15 },
    DAILY_CHECKIN: { reward: 10, dailyCap: 1 },
    KYC: { reward: 100, oneTime: true },
};

async function claimTask(userId, taskType) {
    const type = String(taskType || "").toUpperCase().replace(/-/g, "_");
    const config = TASK_CONFIG[type];
    if (!config) throw err("VALIDATION_ERROR", `Unknown task type: ${taskType}`);

    const conn = await walletDb.pool.getConnection();
    try {
        if (config.oneTime) {
            const alreadyClaimed = await txDb.hasEverClaimedTask(conn, userId, type);
            if (alreadyClaimed) throw err("VALIDATION_ERROR", "You have already claimed this reward.");
            if (type === "KYC") {
                const user = await userDb.getById(userId);
                const kycVerified = ["verified_auto", "verified_manual", "verified"].includes(user?.kyc_status || "")
                    || !!(user?.kyc_face_verified);
                if (!kycVerified) throw err("VALIDATION_ERROR", "Complete identity verification (KYC) first to claim this reward.");
            }
        } else {
            const count = await txDb.countTaskClaimsToday(conn, userId, type);
            const cap = config.dailyCap ?? 1;
            if (count >= cap) {
                throw err("VALIDATION_ERROR", `Daily limit reached for ${type} (${cap} per day)`);
            }
        }

        const result = await credit(userId, config.reward, {
            type: "task",
            id: type,
            meta: { taskType: type, reward: config.reward },
        });

        return { reward: config.reward, balance: result.balance };
    } finally {
        conn.release();
    }
}

async function getTasks(userId) {
    const conn = await walletDb.pool.getConnection();
    try {
        const watchAdCount = await txDb.countTaskClaimsToday(conn, userId, "WATCH_AD");
        const dailyCheckinCount = await txDb.countTaskClaimsToday(conn, userId, "DAILY_CHECKIN");
        const kycClaimed = await txDb.hasEverClaimedTask(conn, userId, "KYC");

        const tasks = [
            { id: "watch_ad", title: "Watch Ads", reward: 12, dailyCap: 15, progress: watchAdCount, done: watchAdCount >= 15, icon: "play-circle" },
            { id: "invite", title: "Invite Friends", reward: 50, dailyCap: 500, progress: 0, icon: "people" },
            { id: "daily_checkin", title: "Daily Check-in", reward: 10, streak: 0, dailyCap: 1, progress: dailyCheckinCount, done: dailyCheckinCount >= 1, icon: "calendar-today" },
            { id: "kyc", title: "Complete Profile/KYC", reward: 100, oneTime: true, done: kycClaimed, icon: "badge" },
            { id: "post_video", title: "Post a Video", reward: 25, done: false, icon: "videocam" },
            { id: "go_live", title: "Go Live", reward: 50, done: false, icon: "live-tv" },
        ];

        return { tasks, dailyProgress: { streak: 0 } };
    } finally {
        conn.release();
    }
}

module.exports = {
    getMyWallet,
    listMyTransactions,
    credit,
    debit,
    splitGift,
    supportCreator,
    claimTask,
    getTasks,
};
