// src/modules/payments/stripe.service.js
const Stripe = require("stripe");
const walletService = require("../wallet/wallet.service");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
});

function err(code, message) {
    const e = new Error(message || code);
    e.code = code;
    return e;
}

// Simple coin packages (you can move this to DB later)
const COIN_PACKAGES = [
    { packageId: "coins_1000", coins: 1000, usdCents: 199 },  // $1.99
    { packageId: "coins_5000", coins: 5000, usdCents: 799 },  // $7.99
    { packageId: "coins_12000", coins: 12000, usdCents: 1499 }, // $14.99
];

function getPackage(packageId) {
    return COIN_PACKAGES.find((p) => p.packageId === packageId) || null;
}

async function createCheckoutSession({ userId, packageId }) {
    if (!process.env.STRIPE_SECRET_KEY) throw err("CONFIG_ERROR", "Missing STRIPE_SECRET_KEY");

    const pack = getPackage(packageId);
    if (!pack) throw err("VALIDATION_ERROR", "Invalid packageId");

    // Redirect to app so we can verify session and credit coins (webhook may not reach localhost)
    const successUrl = "medanya://recharge-success?session_id={CHECKOUT_SESSION_ID}";
    const cancelUrl = process.env.STRIPE_CANCEL_URL || "medanya://recharge-cancel";

    // We put userId + coins into metadata so webhook/verify can credit coins safely
    const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
            {
                price_data: {
                    currency: "usd",
                    unit_amount: pack.usdCents,
                    product_data: {
                        name: `Medanya Coins (${pack.coins})`,
                    },
                },
                quantity: 1,
            },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,

        // Very important: metadata used to credit wallet in webhook
        metadata: {
            userId: String(userId),
            packageId: pack.packageId,
            coins: String(pack.coins),
        },
    });

    return { checkoutUrl: session.url, sessionId: session.id };
}

/**
 * Webhook handler:
 * - verify signature
 * - on checkout.session.completed => credit coins
 * - idempotent credit via reference_id=session.id (wallet ledger prevents duplicates if you enforce unique ref later)
 */
async function handleWebhook(rawBody, signatureHeader) {
    const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!whSecret) throw err("CONFIG_ERROR", "Missing STRIPE_WEBHOOK_SECRET");

    let event;
    try {
        event = stripe.webhooks.constructEvent(rawBody, signatureHeader, whSecret);
    } catch (e) {
        throw err("WEBHOOK_SIGNATURE_INVALID", e.message);
    }

    if (event.type === "payment_intent.succeeded") {
        const pi = event.data.object;
        const meta = pi.metadata || {};
        const isPenalty = meta && meta.type === "penalty";
        if (isPenalty && meta.penaltyId) {
            const penaltiesService = require("../penalties/penalties.service");
            await penaltiesService.onPenaltyPaymentSucceeded(meta.penaltyId);
            return { received: true, handled: "penalty", penaltyId: meta.penaltyId };
        }
        const isOrder = meta && meta.type === "order";
        const isCodDeposit = meta && meta.type === "order_cod_deposit";
        if (isOrder || isCodDeposit) {
            const { pool } = require("../../config/mysql");
            const orderPaymentsDb = require("../orders/orderPayments.mysql");
            const [rows] = await pool.query(
                "SELECT id, seller_id, total_cents, qty FROM orders WHERE stripe_payment_intent_id = ? LIMIT 1",
                [pi.id],
            );
            if (rows && rows.length > 0) {
                const orderId = rows[0].id;
                const chargeId = pi.latest_charge ? (typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge.id) : null;
                const amountCaptured = pi.amount_received ?? pi.amount ?? 0;
                const conn = await pool.getConnection();
                try {
                    await orderPaymentsDb.updateCaptureAndEscrow(conn, orderId, "CAPTURED", "HELD", chargeId, amountCaptured);
                } finally {
                    conn.release();
                }
                if (isOrder && rows[0].seller_id) {
                    try {
                        const notifService = require("../inAppNotifications/inAppNotifications.service");
                        const amountStr = `${((rows[0].total_cents || amountCaptured) / 100).toFixed(2)} AED`;
                        const qtyStr = String(rows[0].qty ?? 1);
                        await notifService.createForUser(String(rows[0].seller_id), {
                            title: "New Card Order",
                            body: `Order #${orderId}: ${amountStr} (qty: ${qtyStr}). Payment received.`,
                            data: { type: "order", orderId },
                        });
                        const pushService = require("../notifications/notification.service");
                        await pushService.sendToUsers({
                            userIds: [String(rows[0].seller_id)],
                            title: "New Card Order",
                            body: `Order #${orderId}: ${amountStr}. Tap to view details.`,
                            data: { type: "order", orderId },
                        }).catch(() => {});
                    } catch (_) {}
                }
            }
            return { received: true, handled: isCodDeposit ? "order_cod_deposit" : "order", orderId: rows?.[0]?.id };
        }
        if (meta && meta.type === "recharge") {
            const userId = meta.userId;
            const coins = parseInt(meta.coins || "0", 10);
            const idempotencyKey = `recharge_${pi.id}`;
            if (!userId || !Number.isInteger(coins) || coins <= 0) {
                return { received: true, ignored: true, reason: "missing_metadata" };
            }
            const { pool } = require("../../config/mysql");
            const [existing] = await pool.query(
                "SELECT 1 FROM stripe_recharge_events WHERE idempotency_key = ? LIMIT 1",
                [idempotencyKey],
            );
            if (existing && existing.length > 0) {
                return { received: true, credited: false, reason: "duplicate", userId, coins };
            }
            await pool.query(
                "INSERT INTO stripe_recharge_events (idempotency_key, event_id, user_id, coins) VALUES (?, ?, ?, ?)",
                [idempotencyKey, event.id, userId, coins],
            );
            await walletService.credit(String(userId), coins, {
                type: "stripe_topup",
                id: pi.id,
                meta: { packageId: meta.packageId, paymentIntent: pi.id },
            });
            return { received: true, credited: true, userId, coins, paymentIntentId: pi.id };
        }
        return { received: true, ignored: true, type: event.type };
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const result = await creditCheckoutSession(session);
        return { received: true, ...result };
    }

    if (event.type === "account.updated") {
        const account = event.data.object;
        if (account.object !== "account") return { received: true, ignored: true, type: event.type };
        const { pool } = require("../../config/mysql");
        const userDb = require("../users/user.mysql");
        const [rows] = await pool.query(
            "SELECT id FROM users WHERE stripe_account_id = ? LIMIT 1",
            [account.id],
        );
        if (rows && rows.length > 0) {
            const userId = rows[0].id;
            const payoutsEnabled = !!account.payouts_enabled;
            const chargesEnabled = !!account.charges_enabled;
            const detailsSubmitted = !!account.details_submitted;
            let onboardingStatus = "PENDING";
            if (detailsSubmitted && payoutsEnabled) onboardingStatus = "COMPLETE";
            else if (detailsSubmitted) onboardingStatus = "PENDING";
            await userDb.updateStripeConnect(userId, {
                stripe_onboarding_status: onboardingStatus,
                stripe_payouts_enabled: payoutsEnabled ? 1 : 0,
                stripe_charges_enabled: chargesEnabled ? 1 : 0,
                stripe_details_submitted: detailsSubmitted ? 1 : 0,
            });
            return { received: true, handled: "account_updated", userId };
        }
        return { received: true, ignored: true, type: event.type };
    }

    // Ignore other events for now
    return { received: true, ignored: true, type: event.type };
}

/**
 * Credit coins for a checkout session. Idempotent (checks stripe_recharge_events).
 */
async function creditCheckoutSession(session) {
    if (session.payment_status !== "paid") {
        return { ignored: true, reason: "payment_status_not_paid" };
    }
    const userId = session.metadata?.userId;
    const coins = parseInt(session.metadata?.coins || "0", 10);
    if (!userId || !Number.isInteger(coins) || coins <= 0) {
        return { ignored: true, reason: "missing_metadata" };
    }
    const idempotencyKey = `checkout_${session.id}`;
    const { pool } = require("../../config/mysql");
    const [existing] = await pool.query(
        "SELECT 1 FROM stripe_recharge_events WHERE idempotency_key = ? LIMIT 1",
        [idempotencyKey],
    );
    if (existing && existing.length > 0) {
        return { credited: false, reason: "duplicate", userId, coins, sessionId: session.id };
    }
    await pool.query(
        "INSERT INTO stripe_recharge_events (idempotency_key, event_id, user_id, coins) VALUES (?, ?, ?, ?)",
        [idempotencyKey, session.id, userId, coins],
    );
    await walletService.credit(String(userId), coins, {
        type: "stripe_topup",
        id: session.id,
        meta: {
            packageId: session.metadata?.packageId,
            stripeCustomer: session.customer || null,
            paymentIntent: session.payment_intent || null,
        },
    });
    return { credited: true, userId, coins, sessionId: session.id };
}

function listPackages() {
    return COIN_PACKAGES;
}

/**
 * Create PaymentIntent for wallet recharge (PaymentSheet).
 * Returns clientSecret + coins for mobile PaymentSheet.
 */
async function createRechargeIntent({ userId, packageId }) {
    if (!process.env.STRIPE_SECRET_KEY) throw err("CONFIG_ERROR", "Missing STRIPE_SECRET_KEY");

    const pack = getPackage(packageId);
    if (!pack) throw err("VALIDATION_ERROR", "Invalid packageId");

    const pi = await stripe.paymentIntents.create({
        amount: pack.usdCents,
        currency: "usd",
        metadata: {
            type: "recharge",
            userId: String(userId),
            packageId: pack.packageId,
            coins: String(pack.coins),
        },
    });

    return { clientSecret: pi.client_secret, coins: pack.coins, packageId: pack.packageId };
}

/**
 * Create PaymentIntent for marketplace order (capture at checkout = escrow held).
 * capture_method: "automatic" so funds are captured when client confirms; webhook sets order_payments CAPTURED + HELD.
 */
async function createPaymentIntentForOrder({ orderTotalCents, buyerId, orderIdPlaceholder, metadata = {} }) {
    if (!process.env.STRIPE_SECRET_KEY) throw err("CONFIG_ERROR", "Missing STRIPE_SECRET_KEY");

    const pi = await stripe.paymentIntents.create({
        amount: orderTotalCents,
        currency: "aed",
        capture_method: "automatic",
        metadata: {
            type: "order",
            buyerId: String(buyerId),
            orderId: String(orderIdPlaceholder || "pending"),
            ...metadata,
        },
    });

    return { id: pi.id, client_secret: pi.client_secret };
}

/**
 * Create PaymentIntent for COD deposit only (Option A: small online hold at checkout).
 * Webhook sets order_payments CAPTURED + HELD with payment_type COD_DEPOSIT.
 */
async function createPaymentIntentForCodDeposit({ depositCents, buyerId, orderIdPlaceholder, metadata = {} }) {
    if (!process.env.STRIPE_SECRET_KEY) throw err("CONFIG_ERROR", "Missing STRIPE_SECRET_KEY");
    if (!depositCents || depositCents <= 0) throw err("VALIDATION_ERROR", "depositCents required");

    const pi = await stripe.paymentIntents.create({
        amount: depositCents,
        currency: "aed",
        capture_method: "automatic",
        metadata: {
            type: "order_cod_deposit",
            buyerId: String(buyerId),
            orderId: String(orderIdPlaceholder || "pending"),
            ...metadata,
        },
    });

    return { id: pi.id, client_secret: pi.client_secret };
}

/**
 * Verify checkout session and credit coins. Used when app returns from web checkout
 * (webhook may not reach localhost). Idempotent.
 */
async function verifyCheckoutSession(sessionId) {
    if (!process.env.STRIPE_SECRET_KEY) throw err("CONFIG_ERROR", "Missing STRIPE_SECRET_KEY");
    if (!sessionId || typeof sessionId !== "string") throw err("VALIDATION_ERROR", "session_id required");
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: [] });
    return creditCheckoutSession(session);
}

module.exports = {
    createCheckoutSession,
    createRechargeIntent,
    createPaymentIntentForOrder,
    createPaymentIntentForCodDeposit,
    handleWebhook,
    verifyCheckoutSession,
    listPackages,
    getPackage,
};
