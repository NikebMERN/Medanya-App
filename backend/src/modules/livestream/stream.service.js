// src/modules/livestream/stream.service.js
const mongoose = require("mongoose");
const Stream = require("./stream.model");
const StreamMessage = require("./streamMessage.model");
const payments = require("../../config/payments");
const { buildAgoraRtcToken } = require("../../config/agora");
const { computeSplit } = require("../../utils/revenue.util");
const walletDb = require("../wallet/wallet.mysql");
const txDb = require("../wallet/transaction.mysql");
const { pool } = require("../../config/mysql");
const userDb = require("../users/user.mysql");

function codeErr(code, message) {
    const e = new Error(message || code);
    e.code = code;
    return e;
}

function toId(u) {
    return String(u?.id ?? u?.userId ?? "");
}

function cleanStr(v, max = 200) {
    const s = String(v || "").trim();
    return s.length > max ? s.slice(0, max) : s;
}

function giftById(giftId) {
    return payments.gifts.find((g) => g.giftId === giftId) || null;
}

function ageFromDob(dob) {
    if (!dob) return null;
    const d = new Date(dob);
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
    return age;
}

async function createStream(user, body) {
    const hostId = toId(user);
    if (!hostId) throw codeErr("UNAUTHORIZED", "Auth required");

    const hostUser = await userDb.getById(hostId);
    if (!hostUser) throw codeErr("NOT_FOUND", "User not found");
    if (!hostUser.otp_verified) throw codeErr("OTP_REQUIRED", "OTP verification required to go live");
    const age = ageFromDob(hostUser.dob);
    if (age == null || age < 16) throw codeErr("AGE_REQUIRED", "You must be 16 or older to host a stream");

    const title = cleanStr(body?.title, 120);
    const category = cleanStr(body?.category, 60);

    const doc = await Stream.create({
        hostId,
        title,
        category,
        status: "live",
        provider: "agora",
        providerRoom: "temp",
        startedAt: new Date(),
    });

    doc.providerRoom = `stream_${doc._id.toString()}`;
    doc.channelName = doc.providerRoom;
    await doc.save();

    return doc.toObject();
}

async function getToken(user, streamId) {
    const uidStr = toId(user);
    if (!uidStr) throw codeErr("UNAUTHORIZED", "Auth required");
    if (!mongoose.isValidObjectId(streamId))
        throw codeErr("NOT_FOUND", "Stream not found");

    const stream = await Stream.findById(streamId).lean();
    if (!stream) throw codeErr("NOT_FOUND", "Stream not found");
    if (stream.status !== "live")
        throw codeErr("STREAM_NOT_LIVE", "Stream not live");

    // Agora uid must be numeric (best practice)
    // Use numeric hash fallback if your userId is not numeric
    const uid = Number.isFinite(Number(uidStr))
        ? Number(uidStr)
        : Math.abs(hashToInt(uidStr));

    const role = stream.hostId === uidStr ? "host" : "audience";
    const token = buildAgoraRtcToken({
        channelName: stream.providerRoom,
        uid,
        role,
    });

    return {
        token,
        provider: stream.provider,
        providerRoom: stream.providerRoom,
        streamId: stream._id.toString(),
        uid,
    };
}

async function listStreams({ page = 1, limit = 20, category, keyword }) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const skip = (p - 1) * l;

    const q = { status: "live" };
    if (category) q.category = category;
    if (keyword) q.title = { $regex: keyword, $options: "i" };

    const [items, total] = await Promise.all([
        Stream.find(q).sort({ startedAt: -1 }).skip(skip).limit(l).lean(),
        Stream.countDocuments(q),
    ]);

    return { page: p, limit: l, total, streams: items };
}

async function getStream(streamId) {
    if (!mongoose.isValidObjectId(streamId))
        throw codeErr("NOT_FOUND", "Stream not found");
    const doc = await Stream.findById(streamId).lean();
    if (!doc) throw codeErr("NOT_FOUND", "Stream not found");
    return doc;
}

async function endStream(user, streamId) {
    const userId = toId(user);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");
    if (!mongoose.isValidObjectId(streamId))
        throw codeErr("NOT_FOUND", "Stream not found");

    const doc = await Stream.findById(streamId);
    if (!doc) throw codeErr("NOT_FOUND", "Stream not found");

    if (doc.hostId !== userId && user?.role !== "admin")
        throw codeErr("FORBIDDEN", "Not allowed");
    if (doc.status !== "live") return doc.toObject(); // idempotent

    doc.status = "ended";
    doc.endedAt = new Date();
    await doc.save();

    return doc.toObject();
}

async function banStream(adminUser, streamId) {
    if (adminUser?.role !== "admin") throw codeErr("FORBIDDEN", "Admin only");
    if (!mongoose.isValidObjectId(streamId))
        throw codeErr("NOT_FOUND", "Stream not found");

    const doc = await Stream.findById(streamId);
    if (!doc) throw codeErr("NOT_FOUND", "Stream not found");

    doc.status = "banned";
    doc.endedAt = doc.endedAt || new Date();
    await doc.save();

    return doc.toObject();
}

async function persistChatMessage({ streamId, senderId, text }) {
    const msg = await StreamMessage.create({
        streamId,
        senderId,
        type: "text",
        text: cleanStr(text, 500),
    });
    return msg.toObject();
}

// Gift send: MySQL transactional debit/credit + ledger rows
async function sendGift({ viewerId, streamId, giftId, quantity }) {
    if (!mongoose.isValidObjectId(streamId))
        throw codeErr("NOT_FOUND", "Stream not found");
    const stream = await Stream.findById(streamId);
    if (!stream) throw codeErr("NOT_FOUND", "Stream not found");
    if (stream.status !== "live")
        throw codeErr("STREAM_NOT_LIVE", "Stream not live");

    const gift = giftById(giftId);
    if (!gift) throw codeErr("INVALID_GIFT", "Invalid giftId");

    const qty = Math.min(Math.max(parseInt(quantity, 10) || 1, 1), 99);
    const totalCost = gift.coinCost * qty; // integer coins

    const { host, platform } = computeSplit(totalCost);
    const hostId = stream.hostId;
    const platformUserId = String(payments.platformWalletUserId || "platform");

    // MySQL transaction
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Ensure wallets exist (depends on your wallet.mysql.js design)
        // We call helper functions that you already have, but if names differ, adjust later.
        const viewerWallet = await walletDb.getWalletForUpdate(conn, viewerId);
        if (!viewerWallet)
            throw codeErr("WALLET_NOT_FOUND", "Viewer wallet not found");

        if (viewerWallet.balance < totalCost)
            throw codeErr("INSUFFICIENT_FUNDS", "Insufficient balance");

        // Debit viewer, credit host, credit platform
        await walletDb.incrementBalance(conn, viewerId, -totalCost);
        await walletDb.incrementBalance(conn, hostId, host);
        await walletDb.incrementBalance(conn, platformUserId, platform);

        // Transactions ledger (3 rows)
        await txDb.insertTransaction(conn, {
            user_id: viewerId,
            type: "gift_spend",
            amount: -totalCost,
            meta: JSON.stringify({
                streamId: String(streamId),
                giftId,
                quantity: qty,
                toHostId: hostId,
            }),
        });

        await txDb.insertTransaction(conn, {
            user_id: hostId,
            type: "gift_earn",
            amount: host,
            meta: JSON.stringify({
                streamId: String(streamId),
                giftId,
                quantity: qty,
                fromUserId: viewerId,
            }),
        });

        await txDb.insertTransaction(conn, {
            user_id: platformUserId,
            type: "gift_commission",
            amount: platform,
            meta: JSON.stringify({
                streamId: String(streamId),
                giftId,
                quantity: qty,
                fromUserId: viewerId,
            }),
        });

        await conn.commit();
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }

    // Update stream gifts value
    stream.totalGiftsValue += totalCost;
    await stream.save();

    return {
        giftEvent: {
            streamId: stream._id.toString(),
            fromUserId: viewerId,
            toHostId: hostId,
            giftId,
            quantity: qty,
            totalCost,
        },
    };
}

// helper: stable hash -> int
function hashToInt(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return h;
}

module.exports = {
    createStream,
    getToken,
    listStreams,
    getStream,
    endStream,
    banStream,
    persistChatMessage,
    sendGift,
};
