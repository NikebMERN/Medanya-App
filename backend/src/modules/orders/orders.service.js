// src/modules/orders/orders.service.js
const bcrypt = require("bcryptjs");
const ordersDb = require("./orders.mysql");
const marketDb = require("../marketplace/market.mysql");
const walletService = require("../wallet/wallet.service");
const payments = require("../../config/payments");
const { pool } = require("../../config/mysql");

const STATUS = {
    PENDING_PAYMENT: "PENDING_PAYMENT",
    AUTHORIZED: "AUTHORIZED",
    COD_SELECTED: "COD_SELECTED",
    SHIPPED: "SHIPPED",
    DELIVERED_PENDING_CODE: "DELIVERED_PENDING_CODE",
    COMPLETED: "COMPLETED",
    DISPUTED: "DISPUTED",
    CANCELED: "CANCELED",
    EXPIRED: "EXPIRED",
};

function codeErr(code, message) {
    const e = new Error(message || code);
    e.code = code;
    return e;
}

function toId(u) {
    return String(u?.id ?? u?.userId ?? "");
}

function generateDeliveryCode() {
    return String(Math.floor(1000000 + Math.random() * 9000000));
}

function hashDeliveryCode(code) {
    return bcrypt.hashSync(code, 10);
}

function verifyDeliveryCode(code, hash) {
    return bcrypt.compareSync(code, hash);
}

async function createOrder(user, body) {
    const buyerId = toId(user);
    if (!buyerId) throw codeErr("UNAUTHORIZED", "Auth required");

    const { listingId, qty = 1, paymentMethod = "STRIPE", address } = body || {};
    const pm = String(paymentMethod || "").toUpperCase();
    if (!["STRIPE", "COD"].includes(pm)) throw codeErr("VALIDATION_ERROR", "paymentMethod must be STRIPE or COD");

    const listing = await marketDb.findById(listingId);
    if (!listing) throw codeErr("NOT_FOUND", "Listing not found");
    if ((listing.status || "").toLowerCase() !== "active") throw codeErr("FORBIDDEN", "Listing not available");

    const sellerId = Number(listing.seller_id);
    if (String(sellerId) === buyerId) throw codeErr("FORBIDDEN", "Cannot buy your own listing");

    const quantity = Math.max(1, parseInt(qty, 10) || 1);
    const priceCents = Math.round((Number(listing.price) || 0) * 100);
    const totalCents = priceCents * quantity;
    const commissionBps = payments.platformCommissionBps ?? 2000;
    const commissionCents = Math.floor((totalCents * commissionBps) / 10000);
    const sellerCents = totalCents - commissionCents;

    const addressJson = address && typeof address === "object" ? address : null;

    const conn = await pool.getConnection();
    let orderId;

    try {
        await conn.beginTransaction();

        let status = pm === "COD" ? STATUS.COD_SELECTED : STATUS.PENDING_PAYMENT;
        let stripePaymentIntentId = null;
        let deliveryCodeHash = null;
        let deliveryCodeSentAt = null;

        if (pm === "STRIPE") {
            const stripeService = require("../payments/stripe.service");
            const pi = await stripeService.createPaymentIntentForOrder({
                orderTotalCents: totalCents,
                buyerId,
                orderIdPlaceholder: "pending",
                metadata: { listingId, sellerId: String(sellerId), qty: quantity },
            });
            stripePaymentIntentId = pi.id;
        } else {
            const code = generateDeliveryCode();
            deliveryCodeHash = hashDeliveryCode(code);
            deliveryCodeSentAt = new Date();
            // Send code via Twilio if configured (fire-and-forget)
            setImmediate(async () => {
                try {
                    const userDb = require("../users/user.mysql");
                    const buyer = await userDb.getById(buyerId);
                    const phone = buyer?.phone_number;
                    if (phone) {
                        const sms = require("../../services/sms.service");
                        await sms.sendDeliveryCode(phone, code);
                    }
                } catch (_) {}
            });
        }

        orderId = await ordersDb.insertOrder(conn, {
            buyer_id: buyerId,
            seller_id: sellerId,
            listing_id: listingId,
            qty: quantity,
            total_cents: totalCents,
            commission_cents: commissionCents,
            status,
            payment_method: pm,
            stripe_payment_intent_id: stripePaymentIntentId,
            delivery_code_hash: deliveryCodeHash,
            delivery_code_sent_at: deliveryCodeSentAt,
            address_json: addressJson,
        });

        await conn.commit();
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }

    const order = await ordersDb.findById(pool, orderId);

    let clientSecret = null;
    if (pm === "STRIPE") {
        const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
        const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
        clientSecret = pi.client_secret;
    }

    return {
        order,
        clientSecret,
        listing: { id: listing.id, title: listing.title, price: listing.price, currency: listing.currency },
    };
}

async function confirmDelivery(user, orderId, code) {
    const userId = toId(user);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");

    const order = await ordersDb.findById(pool, orderId);
    if (!order) throw codeErr("NOT_FOUND", "Order not found");
    if (String(order.seller_id) !== userId) throw codeErr("FORBIDDEN", "Only the seller can confirm delivery");

    const codeStr = String(code || "").trim();
    if (codeStr.length !== 7 || !/^\d{7}$/.test(codeStr)) throw codeErr("VALIDATION_ERROR", "Invalid 7-digit code");

    if (!order.delivery_code_hash) throw codeErr("BAD_STATE", "No delivery code set for this order");
    if (!verifyDeliveryCode(codeStr, order.delivery_code_hash)) throw codeErr("INVALID_CODE", "Invalid delivery code");

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        if (order.payment_method === "STRIPE" && order.stripe_payment_intent_id) {
            const Stripe = require("stripe");
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
            await stripe.paymentIntents.capture(order.stripe_payment_intent_id);
        }

        const sellerCents = order.total_cents - (order.commission_cents || 0);
        const platformUserId = payments.platformWalletUserId || "platform";

        await walletService.credit(String(order.seller_id), sellerCents, {
            type: "order_sale",
            id: String(orderId),
            meta: { orderId, buyerId: order.buyer_id, listingId: order.listing_id },
        });

        if ((order.commission_cents || 0) > 0) {
            await walletService.credit(platformUserId, order.commission_cents, {
                type: "order_commission",
                id: String(orderId),
                meta: { orderId },
            });
        }

        await ordersDb.updateStatus(conn, orderId, STATUS.COMPLETED);
        await conn.commit();
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }

    return ordersDb.findById(pool, orderId);
}

async function getOrder(user, orderId) {
    const userId = toId(user);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");

    const order = await ordersDb.findById(pool, orderId);
    if (!order) throw codeErr("NOT_FOUND", "Order not found");
    if (String(order.buyer_id) !== userId && String(order.seller_id) !== userId) {
        throw codeErr("FORBIDDEN", "Not authorized to view this order");
    }
    return order;
}

async function listMyOrders(user, query, role = "buyer") {
    const userId = toId(user);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");

    if (role === "seller") {
        return ordersDb.listBySeller(pool, userId, query);
    }
    return ordersDb.listByBuyer(pool, userId, query);
}

module.exports = {
    createOrder,
    confirmDelivery,
    getOrder,
    listMyOrders,
    STATUS,
    generateDeliveryCode,
    hashDeliveryCode,
};
