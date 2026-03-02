// src/modules/orders/orders.service.js
const bcrypt = require("bcryptjs");
const ordersDb = require("./orders.mysql");
const marketDb = require("../marketplace/market.mysql");
const walletService = require("../wallet/wallet.service");
const orderConfirmationsDb = require("./orderConfirmations.mysql");
const orderConfirmationService = require("./orderConfirmation.service");
const orderPaymentsDb = require("./orderPayments.mysql");
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
    // Unified FSM
    PLACED: "PLACED",
    ACCEPTED: "ACCEPTED",
    PACKED: "PACKED",
    OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
    DELIVERED: "DELIVERED",
    CANCELLED: "CANCELLED",
    REFUNDED: "REFUNDED",
};

const UNIFIED_STATUSES = new Set([STATUS.PLACED, STATUS.ACCEPTED, STATUS.PACKED, STATUS.OUT_FOR_DELIVERY, STATUS.DELIVERED, STATUS.COMPLETED, STATUS.CANCELLED, STATUS.REFUNDED, STATUS.DISPUTED]);
const LEGACY_REVEAL_STATUSES = new Set([STATUS.SHIPPED, STATUS.AUTHORIZED, STATUS.COD_SELECTED, STATUS.DELIVERED_PENDING_CODE]);
const ALLOW_CONFIRM_STATUSES = new Set([STATUS.OUT_FOR_DELIVERY, ...LEGACY_REVEAL_STATUSES]);

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

const crypto = require("crypto");
const QR_SECRET = process.env.ORDERS_QR_SECRET || process.env.JWT_SECRET || "medanya-orders-qr-v1";

function encryptDeliveryCode(code) {
    const key = crypto.scryptSync(QR_SECRET, "medanya-delivery", 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let enc = cipher.update(String(code), "utf8", "hex");
    enc += cipher.final("hex");
    return iv.toString("hex") + ":" + enc;
}

function decryptDeliveryCode(encrypted) {
    if (!encrypted) return null;
    try {
        const [ivHex, encHex] = encrypted.split(":");
        if (!ivHex || !encHex) return null;
        const key = crypto.scryptSync(QR_SECRET, "medanya-delivery", 32);
        const iv = Buffer.from(ivHex, "hex");
        const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
        let dec = decipher.update(encHex, "hex", "utf8");
        dec += decipher.final("utf8");
        return dec;
    } catch (_) {
        return null;
    }
}

function signQrToken(orderId) {
    const payload = JSON.stringify({ orderId: String(orderId), exp: Date.now() + 5 * 60 * 1000 });
    const sig = crypto.createHmac("sha256", QR_SECRET).update(payload).digest("hex");
    return Buffer.from(payload + "." + sig).toString("base64url");
}

function verifyQrToken(token, orderId) {
    if (!token || typeof token !== "string") return false;
    try {
        const raw = Buffer.from(token, "base64url").toString("utf8");
        const [payload, sig] = raw.split(".");
        if (!payload || !sig) return false;
        const expected = crypto.createHmac("sha256", QR_SECRET).update(payload).digest("hex");
        if (sig !== expected) return false;
        const obj = JSON.parse(payload);
        if (String(obj.orderId) !== String(orderId)) return false;
        if (obj.exp && obj.exp < Date.now()) return false;
        return true;
    } catch (_) {
        return false;
    }
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

        const useUnifiedFlow = true;
        let status = useUnifiedFlow ? STATUS.PLACED : (pm === "COD" ? STATUS.COD_SELECTED : STATUS.PENDING_PAYMENT);
        let stripePaymentIntentId = null;
        let deliveryCodeHash = null;
        let deliveryCodeSentAt = null;
        let deliveryCodeEncrypted = null;

        if (pm === "STRIPE") {
            const stripeService = require("../payments/stripe.service");
            const pi = await stripeService.createPaymentIntentForOrder({
                orderTotalCents: totalCents,
                buyerId,
                orderIdPlaceholder: "pending",
                metadata: { listingId, sellerId: String(sellerId), qty: quantity },
            });
            stripePaymentIntentId = pi.id;
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
            delivery_code_encrypted: deliveryCodeEncrypted,
            address_json: addressJson,
            cod_deposit_cents: null,
            cod_cash_due_cents: null,
        });

        if (pm === "STRIPE") {
            await orderConfirmationService.createForOrder(conn, orderId);
            await orderPaymentsDb.insert(conn, {
                order_id: orderId,
                provider: "STRIPE",
                payment_type: "FULL",
                payment_intent_id: stripePaymentIntentId,
                amount_captured: totalCents,
                currency: "aed",
                capture_status: "NONE",
                escrow_status: "NONE",
            });
        }

        await conn.commit();
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }

    const order = await ordersDb.findById(pool, orderId);

    if (pm === "COD") {
        setImmediate(async () => {
            try {
                const notifService = require("../inAppNotifications/inAppNotifications.service");
                const userDb = require("../users/user.mysql");
                const buyer = await userDb.getById(buyerId);
                const addr = addressJson ? (addressJson.line1 ? addressJson : null) : null;
                const addrStr = addr ? `${addr.line1 || ""}, ${addr.city || ""} ${addr.state || ""} ${addr.postalCode || ""}`.trim() : (addressJson ? JSON.stringify(addressJson) : "—");
                const amountStr = `${(totalCents / 100).toFixed(2)} ${listing.currency || "AED"}`;
                const qtyStr = String(quantity);
                await notifService.createForUser(String(sellerId), {
                    title: "New Cash on Delivery Order",
                    body: `Order #${orderId}: ${amountStr} (qty: ${qtyStr}). Buyer address: ${addrStr}`,
                    data: { type: "order", orderId, buyerId, address: addressJson, amount: totalCents / 100, currency: listing.currency, qty: quantity },
                });
                const pushService = require("../notifications/notification.service");
                await pushService.sendToUsers({
                    userIds: [String(sellerId)],
                    title: "New COD Order",
                    body: `Order #${orderId}: ${amountStr}. Tap to view details.`,
                    data: { type: "order", orderId },
                }).catch(() => {});
            } catch (_) {}
        });
    }

    let clientSecret = null;
    if (order.stripe_payment_intent_id) {
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
    if (order.payment_method !== "STRIPE") throw codeErr("NOT_APPLICABLE", "Use mark delivered for COD orders. Code confirmation is only for card orders.");
    if (String(order.seller_id) !== userId) throw codeErr("FORBIDDEN", "Only the seller can confirm delivery");

    const status = order.status || "";
    if (!ALLOW_CONFIRM_STATUSES.has(status)) throw codeErr("BAD_STATE", "Order is not in a state that allows delivery confirmation");

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const conf = await orderConfirmationsDb.findByOrderId(conn, orderId);
        if (conf) {
            const result = await orderConfirmationService.verifyByCode(conn, orderId, code, userId);
            if (!result.valid) {
                await conn.rollback();
                if (result.reason === "INVALID_CODE") throw codeErr("INVALID_CODE", result.locked ? "Too many wrong attempts. Try again later." : "Invalid delivery code");
                if (result.reason === "LOCKED") throw codeErr("BAD_STATE", "Too many wrong attempts. Try again later.");
                if (result.reason === "EXPIRED") throw codeErr("BAD_STATE", "Confirmation code has expired.");
                if (result.reason === "ALREADY_USED") throw codeErr("BAD_STATE", "Delivery already confirmed.");
                throw codeErr("INVALID_CODE", "Invalid delivery code");
            }
        } else {
            const codeStr = String(code || "").trim();
            if (codeStr.length !== 7 || !/^\d{7}$/.test(codeStr)) throw codeErr("VALIDATION_ERROR", "Invalid 7-digit code");
            if (!order.delivery_code_hash) throw codeErr("BAD_STATE", "No delivery code set for this order");
            if (!verifyDeliveryCode(codeStr, order.delivery_code_hash)) throw codeErr("INVALID_CODE", "Invalid delivery code");
        }

        const op = await orderPaymentsDb.findByOrderId(conn, orderId);
        if (op && op.escrow_status === "HELD") {
            await orderPaymentsDb.updateEscrowStatus(conn, orderId, "RELEASED");
        }
        // Stripe uses automatic capture; payment is captured when buyer pays. Do NOT call capture here.

        const platformUserId = payments.platformWalletUserId || "platform";
        if ((order.commission_cents || 0) > 0) {
            await walletService.credit(platformUserId, order.commission_cents, {
                type: "order_commission",
                id: String(orderId),
                meta: { orderId },
            });
        }

        let sellerNetCents = 0;
        if (order.payment_method === "STRIPE") {
            sellerNetCents = order.total_cents - (order.commission_cents || 0);
        } else if (order.payment_method === "COD" && (order.cod_deposit_cents || 0) > 0) {
            sellerNetCents = order.cod_deposit_cents;
        }

        const userDb = require("../users/user.mysql");
        const seller = await userDb.getById(order.seller_id);
        const useConnect = seller && seller.stripe_account_id && seller.stripe_payouts_enabled;

        if (sellerNetCents > 0 && useConnect) {
            const stripeConnect = require("../payments/stripeConnect.service");
            try {
                const { transferId } = await stripeConnect.createTransferToConnectedAccount({
                    destinationAccountId: seller.stripe_account_id,
                    amountCents: sellerNetCents,
                    currency: "aed",
                    sourceTransaction: op ? op.charge_id : undefined,
                    metadata: { orderId: String(orderId) },
                });
                await ordersDb.updatePayoutStatus(conn, orderId, "PAID", transferId, null);
            } catch (transferErr) {
                const errMsg = (transferErr && transferErr.message) || String(transferErr);
                await ordersDb.updatePayoutStatus(conn, orderId, "FAILED", null, errMsg);
            }
        } else if (sellerNetCents > 0 && !useConnect) {
            await walletService.credit(String(order.seller_id), sellerNetCents, {
                type: "order_sale",
                id: String(orderId),
                meta: { orderId, buyerId: order.buyer_id, listingId: order.listing_id },
            });
        } else if (sellerNetCents > 0) {
            await ordersDb.updatePayoutStatus(conn, orderId, "PENDING");
        }

        await ordersDb.updateStatus(conn, orderId, STATUS.COMPLETED);
        await conn.commit();
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }

    try {
        const notifService = require("../inAppNotifications/inAppNotifications.service");
        await notifService.deleteByOrderId(orderId);
    } catch (_) {}
    return ordersDb.findById(pool, orderId);
}

async function getOrder(user, orderId) {
    const userId = toId(user);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");

    let order = await ordersDb.findById(pool, orderId);
    if (!order) throw codeErr("NOT_FOUND", "Order not found");
    if (String(order.buyer_id) !== userId && String(order.seller_id) !== userId) {
        throw codeErr("FORBIDDEN", "Not authorized to view this order");
    }
    // COD: auto-cancel if buyer didn't confirm/decline delivery fee within 24h
    if (order.payment_method === "COD" && order.status === STATUS_ACCEPTED_PENDING_FEE_CONFIRM) {
        const cancelled = await ordersDb.cancelExpiredFeeProposal(pool, orderId);
        if (cancelled) order = await ordersDb.findById(pool, orderId);
    }
    if (String(order.buyer_id) === userId) {
        const userDb = require("../users/user.mysql");
        const seller = await userDb.getById(order.seller_id);
        order.seller_phone = seller?.phone_number || null;
        // Confirmation (code/QR) only for Stripe; COD has no code
        if (order.payment_method === "STRIPE") {
            const confSummary = await orderConfirmationService.getConfirmationForBuyer(orderId, order.status || "");
            order.confirmation = confSummary;
        } else {
            order.confirmation = { canReveal: false, qrAvailable: false, notApplicable: true };
        }
    }
    if (order.payment_method === "STRIPE") {
        const op = await orderPaymentsDb.findByOrderId(pool, orderId);
        order.escrow_status = op ? op.escrow_status : null;
        order.capture_status = op ? op.capture_status : null;
    }
    return order;
}

async function listMyOrders(user, query, role = "buyer") {
    const userId = toId(user);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");

    // Cancel any COD orders where delivery fee wasn't confirmed within 24h
    await ordersDb.cancelExpiredFeeProposals(pool).catch(() => {});

    if (role === "seller") {
        return ordersDb.listBySeller(pool, userId, query);
    }
    return ordersDb.listByBuyer(pool, userId, query);
}

const SELLER_CANCEL_REASONS = ["distance_too_far", "not_available", "address_issue", "other"];

async function cancelCodOrder(user, orderId, body = {}) {
    const userId = toId(user);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");

    const order = await ordersDb.findById(pool, orderId);
    if (!order) throw codeErr("NOT_FOUND", "Order not found");
    if (order.payment_method !== "COD") throw codeErr("VALIDATION_ERROR", "Only COD orders can be declined here");
    if ([STATUS.COMPLETED, STATUS.CANCELED, STATUS.EXPIRED].includes(order.status)) {
        throw codeErr("BAD_STATE", "Order can no longer be declined");
    }

    const isBuyer = String(order.buyer_id) === userId;
    const isSeller = String(order.seller_id) === userId;
    if (!isBuyer && !isSeller) throw codeErr("FORBIDDEN", "Only buyer or seller can cancel this COD order");

    let cancelledBy = "buyer";
    let cancelReason = null;
    let cancelReasonOther = null;

    if (isSeller) {
        cancelledBy = "seller";
        const reason = (body.reason || "").trim();
        if (!reason) throw codeErr("VALIDATION_ERROR", "Seller must provide a cancel reason");
        if (!SELLER_CANCEL_REASONS.includes(reason)) throw codeErr("VALIDATION_ERROR", "Invalid cancel reason");
        cancelReason = reason;
        if (reason === "other") {
            cancelReasonOther = (body.reasonOther || "").trim();
            if (!cancelReasonOther) throw codeErr("VALIDATION_ERROR", "Please provide a reason for 'Other'");
        }
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await ordersDb.updateCancelCodWithReason(conn, orderId, STATUS.CANCELED, cancelledBy, cancelReason, cancelReasonOther);
        if (order.stripe_payment_intent_id) {
            const op = await orderPaymentsDb.findByOrderId(conn, orderId);
            if (op && op.escrow_status === "HELD") {
                const Stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
                await Stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id });
                await orderPaymentsDb.markRefunded(conn, orderId);
            }
        }
        await conn.commit();
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }

    try {
        const notificationService = require("../notifications/notification.service");
        if (isBuyer) {
            await notificationService.sendToUsers({
                userIds: [String(order.seller_id)],
                title: "COD order declined",
                body: `Buyer declined COD order #${order.id}.`,
                data: { type: "order", orderId },
            });
        } else {
            await notificationService.sendToUsers({
                userIds: [String(order.buyer_id)],
                title: "COD order cancelled by seller",
                body: `Seller cancelled order #${order.id}.`,
                data: { type: "order", orderId },
            });
        }
    } catch (_) {}

    try {
        const notifService = require("../inAppNotifications/inAppNotifications.service");
        await notifService.deleteByOrderId(orderId);
    } catch (_) {}
    return ordersDb.findById(pool, orderId);
}

async function proposeDeliveryFee(user, orderId, body) {
    const userId = toId(user);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");

    const order = await ordersDb.findById(pool, orderId);
    if (!order) throw codeErr("NOT_FOUND", "Order not found");
    if (String(order.seller_id) !== userId) throw codeErr("FORBIDDEN", "Only the seller can propose a delivery fee");
    if (order.payment_method !== "COD") throw codeErr("VALIDATION_ERROR", "Only COD orders support delivery fee");
    if (order.status !== STATUS.COD_SELECTED) throw codeErr("BAD_STATE", "Order is not in a state to add delivery fee");
    if (order.delivery_fee_accepted_at) throw codeErr("BAD_STATE", "Delivery fee already accepted");

    const deliveryFeeCents = Math.max(0, parseInt(body.deliveryFeeCents, 10) || 0);
    if (deliveryFeeCents <= 0) throw codeErr("VALIDATION_ERROR", "Delivery fee must be greater than 0");

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await ordersDb.updateProposeDeliveryFee(conn, orderId, deliveryFeeCents);
        await conn.commit();
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }

    try {
        const notifService = require("../inAppNotifications/inAppNotifications.service");
        await notifService.createForUser(String(order.buyer_id), {
            title: "Delivery fee requested",
            body: `Seller added a delivery fee of AED ${(deliveryFeeCents / 100).toFixed(2)} for order #${orderId}. Accept or decline.`,
            data: { type: "order", orderId },
        });
        const pushService = require("../notifications/notification.service");
        await pushService.sendToUsers({
            userIds: [String(order.buyer_id)],
            title: "Delivery fee requested",
            body: `Seller added delivery fee for order #${orderId}. Tap to accept or decline.`,
            data: { type: "order", orderId },
        }).catch(() => {});
    } catch (_) {}

    try {
        const notifService = require("../inAppNotifications/inAppNotifications.service");
        await notifService.deleteByOrderId(orderId);
    } catch (_) {}
    return ordersDb.findById(pool, orderId);
}

async function acceptDeliveryFee(user, orderId) {
    const userId = toId(user);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");

    const order = await ordersDb.findById(pool, orderId);
    if (!order) throw codeErr("NOT_FOUND", "Order not found");
    if (String(order.buyer_id) !== userId) throw codeErr("FORBIDDEN", "Only the buyer can accept the delivery fee");
    if (order.payment_method !== "COD") throw codeErr("VALIDATION_ERROR", "Only COD orders support delivery fee");
    if (order.status !== STATUS.COD_SELECTED) throw codeErr("BAD_STATE", "Order is not in a state to accept delivery fee");
    if (!order.proposed_delivery_fee_cents) throw codeErr("BAD_STATE", "No delivery fee proposed");
    if (order.delivery_fee_accepted_at) throw codeErr("BAD_STATE", "Delivery fee already accepted");

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await ordersDb.updateAcceptDeliveryFee(conn, orderId);
        await conn.commit();
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }

    try {
        const notifService = require("../inAppNotifications/inAppNotifications.service");
        await notifService.createForUser(String(order.seller_id), {
            title: "Delivery fee accepted",
            body: `Buyer accepted the delivery fee for order #${orderId}. You can start delivery.`,
            data: { type: "order", orderId },
        });
        const pushService = require("../notifications/notification.service");
        await pushService.sendToUsers({
            userIds: [String(order.seller_id)],
            title: "Delivery fee accepted",
            body: `Buyer accepted the delivery fee for order #${orderId}. You can start delivery.`,
            data: { type: "order", orderId },
        }).catch(() => {});
    } catch (_) {}

    try {
        const notifService = require("../inAppNotifications/inAppNotifications.service");
        await notifService.deleteByOrderId(orderId);
    } catch (_) {}
    return ordersDb.findById(pool, orderId);
}

async function declineDeliveryFee(user, orderId) {
    const userId = toId(user);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");

    const order = await ordersDb.findById(pool, orderId);
    if (!order) throw codeErr("NOT_FOUND", "Order not found");
    if (String(order.buyer_id) !== userId) throw codeErr("FORBIDDEN", "Only the buyer can decline the delivery fee");
    if (order.payment_method !== "COD") throw codeErr("VALIDATION_ERROR", "Only COD orders support delivery fee");
    if ([STATUS.COMPLETED, STATUS.CANCELED, STATUS.EXPIRED].includes(order.status)) {
        throw codeErr("BAD_STATE", "Order can no longer be declined");
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await ordersDb.updateCancelCodWithReason(conn, orderId, STATUS.CANCELED, "buyer", "buyer_declined_fee", null);
        await conn.commit();
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }

    try {
        const notifService = require("../inAppNotifications/inAppNotifications.service");
        await notifService.createForUser(String(order.seller_id), {
            title: "Delivery fee declined",
            body: `Buyer declined the delivery fee for order #${orderId}. Order cancelled.`,
            data: { type: "order", orderId },
        });
        const pushService = require("../notifications/notification.service");
        await pushService.sendToUsers({
            userIds: [String(order.seller_id)],
            title: "Delivery fee declined",
            body: `Buyer declined the delivery fee for order #${orderId}. Order cancelled.`,
            data: { type: "order", orderId },
        }).catch(() => {});
    } catch (_) {}

    try {
        const notifService = require("../inAppNotifications/inAppNotifications.service");
        await notifService.deleteByOrderId(orderId);
    } catch (_) {}
    return ordersDb.findById(pool, orderId);
}

async function confirmDeliveryFee(user, orderId, action) {
    const userId = toId(user);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");

    const order = await ordersDb.findById(pool, orderId);
    if (!order) throw codeErr("NOT_FOUND", "Order not found");
    if (order.payment_method !== "COD") throw codeErr("VALIDATION_ERROR", "Delivery fee confirm/decline is only for COD orders");
    if (String(order.buyer_id) !== userId) throw codeErr("FORBIDDEN", "Only the buyer can confirm or decline the delivery fee");
    if (order.status !== STATUS_ACCEPTED_PENDING_FEE_CONFIRM) throw codeErr("BAD_STATE", "No delivery fee pending your response");

    // 24h window: if proposal expired, cancel order and reject action
    const expired = await ordersDb.cancelExpiredFeeProposal(pool, orderId);
    if (expired) throw codeErr("BAD_STATE", "Delivery fee confirmation window (24 hours) has expired. Order has been cancelled.");

    const act = String(action || "").toUpperCase();
    if (act !== "CONFIRM" && act !== "DECLINE") throw codeErr("VALIDATION_ERROR", "action must be CONFIRM or DECLINE");

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        if (act === "CONFIRM") {
            await ordersDb.updateAcceptDeliveryFee(conn, orderId);
        } else {
            await ordersDb.updateDeliveryFeeDeclined(conn, orderId);
        }
        await conn.commit();
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }

    try {
        const pushService = require("../notifications/notification.service");
        if (act === "CONFIRM") {
            await pushService.sendToUsers({
                userIds: [String(order.seller_id)],
                title: "Delivery fee confirmed",
                body: `Buyer confirmed the delivery fee for order #${orderId}. You can proceed.`,
                data: { type: "order", orderId },
            }).catch(() => {});
        } else {
            await pushService.sendToUsers({
                userIds: [String(order.seller_id)],
                title: "Delivery fee declined",
                body: `Buyer declined the delivery fee. Order #${orderId} cancelled.`,
                data: { type: "order", orderId },
            }).catch(() => {});
        }
    } catch (_) {}

    if (act === "DECLINE") {
        try {
            const notifService = require("../inAppNotifications/inAppNotifications.service");
            await notifService.deleteByOrderId(orderId);
        } catch (_) {}
    }
    return ordersDb.findById(pool, orderId);
}

async function sellerMarkDelivered(user, orderId) {
    const userId = toId(user);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");

    const order = await ordersDb.findById(pool, orderId);
    if (!order) throw codeErr("NOT_FOUND", "Order not found");
    if (order.payment_method !== "COD") throw codeErr("NOT_APPLICABLE", "Use confirm delivery (code/QR) for card orders. Mark delivered is only for COD.");
    if (String(order.seller_id) !== userId) throw codeErr("FORBIDDEN", "Only the seller can mark delivered");

    const status = order.status || "";
    if (status !== STATUS.OUT_FOR_DELIVERY && status !== STATUS.DELIVERED) {
        throw codeErr("BAD_STATE", "Order must be out for delivery before marking as delivered");
    }

    await ordersDb.updateStatus(pool, orderId, STATUS.COMPLETED);
    try {
        const notifService = require("../inAppNotifications/inAppNotifications.service");
        await notifService.deleteByOrderId(orderId);
    } catch (_) {}
    return ordersDb.findById(pool, orderId);
}

async function getOrderConfirmation(user, orderId) {
    const userId = toId(user);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");

    const order = await ordersDb.findById(pool, orderId);
    if (!order) throw codeErr("NOT_FOUND", "Order not found");
    if (String(order.buyer_id) !== userId) throw codeErr("FORBIDDEN", "Only the buyer can view confirmation");
    if (order.payment_method !== "STRIPE") {
        throw codeErr("NOT_APPLICABLE", "Confirmation code and QR are only for card (Stripe) orders. COD orders do not use a code.");
    }

    return orderConfirmationService.getConfirmationForBuyer(orderId, order.status);
}

async function notifyPaymentReceived(user, orderId) {
    const userId = toId(user);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");

    const order = await ordersDb.findById(pool, orderId);
    if (!order) throw codeErr("NOT_FOUND", "Order not found");
    if (String(order.buyer_id) !== userId) throw codeErr("FORBIDDEN", "Only the buyer can call this");
    if (order.payment_method !== "STRIPE" || !order.stripe_payment_intent_id) throw codeErr("NOT_APPLICABLE", "Only Stripe orders");

    const notifService = require("../inAppNotifications/inAppNotifications.service");
    await notifService.createOrderNotificationForSellerIfNotExists(orderId, order.seller_id, {
        totalCents: order.total_cents,
        qty: order.qty,
    });
    return { success: true };
}

async function getDeliveryCode(user, orderId) {
    const userId = toId(user);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");

    const order = await ordersDb.findById(pool, orderId);
    if (!order) throw codeErr("NOT_FOUND", "Order not found");
    if (order.payment_method !== "STRIPE") throw codeErr("NOT_APPLICABLE", "Delivery code is only for card orders. COD orders do not use a code.");
    if (String(order.buyer_id) !== userId) throw codeErr("FORBIDDEN", "Only the buyer can retrieve the delivery code");

    const status = order.status || "";
    const conf = await orderConfirmationsDb.findByOrderId(pool, orderId);
    const revealStatuses = new Set([STATUS.ACCEPTED, STATUS.PACKED, STATUS.OUT_FOR_DELIVERY]);
    if (conf && revealStatuses.has(status)) {
        const data = await orderConfirmationService.getConfirmationForBuyer(orderId, status);
        if (data.canReveal && data.code) return { code: data.code };
        throw codeErr("BAD_STATE", data.revealHint || "Code not available yet.");
    }

    if (!ALLOW_CONFIRM_STATUSES.has(status)) throw codeErr("BAD_STATE", "Code will appear when seller accepts.");
    const code = decryptDeliveryCode(order.delivery_code_encrypted);
    if (!code) throw codeErr("BAD_STATE", "No delivery code available for this order");
    return { code };
}

async function getDeliveryQrToken(user, orderId) {
    const userId = toId(user);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");

    const order = await ordersDb.findById(pool, orderId);
    if (!order) throw codeErr("NOT_FOUND", "Order not found");
    if (order.payment_method !== "STRIPE") throw codeErr("NOT_APPLICABLE", "QR code is only for card orders. COD orders do not use QR.");
    if (String(order.buyer_id) !== userId) throw codeErr("FORBIDDEN", "Only the buyer can get the QR token");

    const status = order.status || "";
    const conf = await orderConfirmationsDb.findByOrderId(pool, orderId);
    const revealStatuses = new Set([STATUS.ACCEPTED, STATUS.PACKED, STATUS.OUT_FOR_DELIVERY]);
    if (conf && revealStatuses.has(status)) {
        const token = orderConfirmationService.signQrPayload(orderId);
        return { token, qrPayload: token };
    }
    if (!ALLOW_CONFIRM_STATUSES.has(status)) throw codeErr("BAD_STATE", "QR will appear when seller accepts.");
    const token = signQrToken(orderId);
    return { token, qrPayload: token };
}

async function confirmDeliveryByQr(user, orderId, qrToken) {
    const userId = toId(user);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");

    const order = await ordersDb.findById(pool, orderId);
    if (!order) throw codeErr("NOT_FOUND", "Order not found");
    if (order.payment_method !== "STRIPE") throw codeErr("NOT_APPLICABLE", "Use mark delivered for COD orders. QR confirmation is only for card orders.");
    if (String(order.seller_id) !== userId) throw codeErr("FORBIDDEN", "Only the seller can confirm delivery");

    const status = order.status || "";
    if (!ALLOW_CONFIRM_STATUSES.has(status)) throw codeErr("BAD_STATE", "Order is not in a state that allows delivery confirmation");

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const conf = await orderConfirmationsDb.findByOrderId(conn, orderId);
        if (conf) {
            const result = await orderConfirmationService.verifyByQrToken(conn, orderId, qrToken, userId);
            if (!result.valid) {
                await conn.rollback();
                if (result.reason === "INVALID_QR") throw codeErr("INVALID_CODE", "Invalid or expired QR token");
                if (result.reason === "LOCKED") throw codeErr("BAD_STATE", "Too many wrong attempts. Try again later.");
                if (result.reason === "EXPIRED") throw codeErr("BAD_STATE", "Confirmation code has expired.");
                if (result.reason === "ALREADY_USED") throw codeErr("BAD_STATE", "Delivery already confirmed.");
                throw codeErr("INVALID_CODE", "Invalid or expired QR token");
            }
        } else {
            if (!verifyQrToken(qrToken, orderId)) throw codeErr("INVALID_CODE", "Invalid or expired QR token");
        }

        const op = await orderPaymentsDb.findByOrderId(conn, orderId);
        if (op && op.escrow_status === "HELD") {
            await orderPaymentsDb.updateEscrowStatus(conn, orderId, "RELEASED");
        }
        // Stripe uses automatic capture; payment is captured when buyer pays. Do NOT call capture here.

        const platformUserId = payments.platformWalletUserId || "platform";
        if ((order.commission_cents || 0) > 0) {
            await walletService.credit(platformUserId, order.commission_cents, {
                type: "order_commission",
                id: String(orderId),
                meta: { orderId },
            });
        }

        let sellerNetCents = 0;
        if (order.payment_method === "STRIPE") {
            sellerNetCents = order.total_cents - (order.commission_cents || 0);
        } else if (order.payment_method === "COD" && (order.cod_deposit_cents || 0) > 0) {
            sellerNetCents = order.cod_deposit_cents;
        }

        const userDb = require("../users/user.mysql");
        const seller = await userDb.getById(order.seller_id);
        const useConnect = seller && seller.stripe_account_id && seller.stripe_payouts_enabled;

        if (sellerNetCents > 0 && useConnect) {
            const stripeConnect = require("../payments/stripeConnect.service");
            try {
                const { transferId } = await stripeConnect.createTransferToConnectedAccount({
                    destinationAccountId: seller.stripe_account_id,
                    amountCents: sellerNetCents,
                    currency: "aed",
                    sourceTransaction: op ? op.charge_id : undefined,
                    metadata: { orderId: String(orderId) },
                });
                await ordersDb.updatePayoutStatus(conn, orderId, "PAID", transferId, null);
            } catch (transferErr) {
                const errMsg = (transferErr && transferErr.message) || String(transferErr);
                await ordersDb.updatePayoutStatus(conn, orderId, "FAILED", null, errMsg);
            }
        } else if (sellerNetCents > 0 && !useConnect) {
            await walletService.credit(String(order.seller_id), sellerNetCents, {
                type: "order_sale",
                id: String(orderId),
                meta: { orderId, buyerId: order.buyer_id, listingId: order.listing_id },
            });
        } else if (sellerNetCents > 0) {
            await ordersDb.updatePayoutStatus(conn, orderId, "PENDING");
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

const STATUS_ACCEPTED_PENDING_FEE_CONFIRM = "ACCEPTED_PENDING_FEE_CONFIRM";

async function sellerAcceptOrder(user, orderId, body = {}) {
    const userId = toId(user);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");

    const order = await ordersDb.findById(pool, orderId);
    if (!order) throw codeErr("NOT_FOUND", "Order not found");
    if (String(order.seller_id) !== userId) throw codeErr("FORBIDDEN", "Only the seller can accept");
    if (order.status !== STATUS.PLACED) throw codeErr("BAD_STATE", "Order can only be accepted when PLACED");

    if (order.payment_method === "STRIPE") {
        await ordersDb.updateStatus(pool, orderId, STATUS.ACCEPTED);
        return ordersDb.findById(pool, orderId);
    }

    if (order.payment_method === "COD") {
        const deliveryFeeCents = Math.max(0, parseInt(body.deliveryFeeCents ?? body.deliveryFee, 10) || 0);
        const maxDeliveryFeeCents = Math.min(5000, Math.floor(order.total_cents * 0.2));
        if (deliveryFeeCents > maxDeliveryFeeCents) throw codeErr("VALIDATION_ERROR", `Delivery fee cannot exceed AED ${(maxDeliveryFeeCents / 100).toFixed(2)}`);
        const conn = await pool.getConnection();
        try {
            await ordersDb.updateAcceptWithProposedFee(conn, orderId, deliveryFeeCents);
        } finally {
            conn.release();
        }
        setImmediate(async () => {
            try {
                const notifService = require("../inAppNotifications/inAppNotifications.service");
                await notifService.createForUser(String(order.buyer_id), {
                    title: "Delivery fee requested",
                    body: `Seller accepted your order and added a delivery fee of AED ${(deliveryFeeCents / 100).toFixed(2)} for order #${orderId}. Accept or decline.`,
                    data: { type: "order", orderId },
                });
            } catch (_) {}
        });
        return ordersDb.findById(pool, orderId);
    }

    await ordersDb.updateStatus(pool, orderId, STATUS.ACCEPTED);
    return ordersDb.findById(pool, orderId);
}

async function sellerRejectOrder(user, orderId) {
    const userId = toId(user);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");

    const order = await ordersDb.findById(pool, orderId);
    if (!order) throw codeErr("NOT_FOUND", "Order not found");
    if (String(order.seller_id) !== userId) throw codeErr("FORBIDDEN", "Only the seller can reject");
    if (order.status !== STATUS.PLACED) throw codeErr("BAD_STATE", "Order can only be rejected when PLACED");

    await ordersDb.updateStatus(pool, orderId, STATUS.CANCELLED);
    if (order.stripe_payment_intent_id) {
        const op = await orderPaymentsDb.findByOrderId(pool, orderId);
        if (op && op.escrow_status === "HELD") {
            const Stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
            await Stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id });
            const conn = await pool.getConnection();
            try {
                await orderPaymentsDb.markRefunded(conn, orderId);
            } finally {
                conn.release();
            }
        }
    }
    try {
        const notifService = require("../inAppNotifications/inAppNotifications.service");
        await notifService.deleteByOrderId(orderId);
    } catch (_) {}
    return ordersDb.findById(pool, orderId);
}

async function sellerUpdateStatus(user, orderId, newStatus) {
    const userId = toId(user);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");

    const order = await ordersDb.findById(pool, orderId);
    if (!order) throw codeErr("NOT_FOUND", "Order not found");
    if (String(order.seller_id) !== userId) throw codeErr("FORBIDDEN", "Only the seller can update status");

    const allowed = {
        [STATUS.ACCEPTED]: [STATUS.PACKED],
        [STATUS.PACKED]: [STATUS.OUT_FOR_DELIVERY],
    };
    const next = allowed[order.status];
    if (!next || !next.includes(newStatus)) throw codeErr("BAD_STATE", `Cannot transition from ${order.status} to ${newStatus}`);

    await ordersDb.updateStatus(pool, orderId, newStatus);
    return ordersDb.findById(pool, orderId);
}

async function generateAndSetDeliveryCode(orderId) {
    const order = await ordersDb.findById(pool, orderId);
    if (!order) return;
    if (order.delivery_code_hash) return;

    const code = generateDeliveryCode();
    const deliveryCodeHash = hashDeliveryCode(code);
    const deliveryCodeEncrypted = encryptDeliveryCode(code);
    const deliveryCodeSentAt = new Date();

    const conn = await pool.getConnection();
    try {
        await conn.query(
            `UPDATE orders SET delivery_code_hash = ?, delivery_code_encrypted = ?, delivery_code_sent_at = ? WHERE id = ?`,
            [deliveryCodeHash, deliveryCodeEncrypted, deliveryCodeSentAt, orderId],
        );
        const userDb = require("../users/user.mysql");
        const buyer = await userDb.getById(order.buyer_id);
        const phone = buyer?.phone_number;
        if (phone) {
            const sms = require("../../services/sms.service");
            await sms.sendDeliveryCode(phone, code).catch(() => {});
        }
    } finally {
        conn.release();
    }
}

const disputesDb = require("./disputes.mysql");
const userDb = require("../users/user.mysql");

async function retryPendingPayouts(maxAttempts = 20) {
    const pending = await ordersDb.listPendingPayouts(pool, maxAttempts);
    const stripeConnect = require("../payments/stripeConnect.service");
    const results = { processed: 0, paid: 0, failed: 0 };
    for (const order of pending) {
        results.processed++;
        const seller = await userDb.getById(order.seller_id);
        if (!seller || !seller.stripe_account_id || !seller.stripe_payouts_enabled) {
            results.failed++;
            continue;
        }
        let sellerNetCents = 0;
        if (order.payment_method === "STRIPE") {
            sellerNetCents = order.total_cents - (order.commission_cents || 0);
        } else if (order.payment_method === "COD" && (order.cod_deposit_cents || 0) > 0) {
            sellerNetCents = order.cod_deposit_cents;
        }
        if (sellerNetCents <= 0) {
            results.failed++;
            continue;
        }
        try {
            const op = await orderPaymentsDb.findByOrderId(pool, order.id);
            const { transferId } = await stripeConnect.createTransferToConnectedAccount({
                destinationAccountId: seller.stripe_account_id,
                amountCents: sellerNetCents,
                currency: "aed",
                sourceTransaction: op ? op.charge_id : undefined,
                metadata: { orderId: String(order.id) },
            });
            const conn = await pool.getConnection();
            try {
                await ordersDb.updatePayoutStatus(conn, order.id, "PAID", transferId);
            } finally {
                conn.release();
            }
            results.paid++;
        } catch (_) {
            results.failed++;
        }
    }
    return results;
}

async function adminListOrders(_user, query) {
    return ordersDb.listAll(pool, query);
}

async function adminListDisputes(_user, query) {
    return disputesDb.list(pool, query);
}

async function adminResolveDispute(user, disputeId, action) {
    const userId = toId(user);
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");
    if (!["REFUND", "COMPLETE"].includes(action)) throw codeErr("VALIDATION_ERROR", "action must be REFUND or COMPLETE");

    const dispute = await disputesDb.findById(pool, disputeId);
    if (!dispute) throw codeErr("NOT_FOUND", "Dispute not found");
    if (dispute.status !== "OPEN") throw codeErr("BAD_STATE", "Dispute already resolved");

    const order = await ordersDb.findById(pool, dispute.order_id);
    if (!order) throw codeErr("NOT_FOUND", "Order not found");

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        if (action === "REFUND" && order.stripe_payment_intent_id) {
            const Stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
            await Stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id });
            await orderPaymentsDb.markRefunded(conn, order.id);
            await ordersDb.updateStatus(conn, order.id, STATUS.REFUNDED);
        } else if (action === "COMPLETE") {
            await ordersDb.updateStatus(conn, order.id, STATUS.COMPLETED);
        }
        await disputesDb.updateStatus(conn, disputeId, action === "REFUND" ? "REFUNDED" : "RESOLVED");
        await conn.commit();
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
    return { dispute: await disputesDb.findById(pool, disputeId), order: await ordersDb.findById(pool, order.id) };
}

module.exports = {
    createOrder,
    confirmDelivery,
    confirmDeliveryByQr,
    confirmDeliveryFee,
    sellerMarkDelivered,
    getOrder,
    getOrderConfirmation,
    listMyOrders,
    cancelCodOrder,
    proposeDeliveryFee,
    acceptDeliveryFee,
    declineDeliveryFee,
    getDeliveryCode,
    getDeliveryQrToken,
    sellerAcceptOrder,
    sellerRejectOrder,
    sellerUpdateStatus,
    generateAndSetDeliveryCode,
    adminListOrders,
    adminListDisputes,
    adminResolveDispute,
    retryPendingPayouts,
    STATUS,
    SELLER_CANCEL_REASONS,
    generateDeliveryCode,
    hashDeliveryCode,
};
