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

    const successUrl = process.env.STRIPE_SUCCESS_URL || "http://localhost:3000/success";
    const cancelUrl = process.env.STRIPE_CANCEL_URL || "http://localhost:3000/cancel";

    // We put userId + coins into metadata so webhook can credit coins safely
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
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
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

        // only credit if paid
        if (session.payment_status !== "paid") {
            return { received: true, ignored: true, reason: "payment_status_not_paid" };
        }

        const userId = session.metadata?.userId;
        const coins = parseInt(session.metadata?.coins || "0", 10);
        if (!userId || !Number.isInteger(coins) || coins <= 0) {
            return { received: true, ignored: true, reason: "missing_metadata" };
        }

        // Credit coins in wallet ledger
        // reference ensures traceability and can be used for idempotency
        await walletService.credit(String(userId), coins, {
            type: "stripe_topup",
            id: session.id,
            meta: {
                packageId: session.metadata?.packageId,
                stripeCustomer: session.customer || null,
                paymentIntent: session.payment_intent || null,
            },
        });

        return { received: true, credited: true, userId, coins, sessionId: session.id };
    }

    // Ignore other events for now
    return { received: true, ignored: true, type: event.type };
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
 * Create PaymentIntent for marketplace order (capture_method=manual).
 * Used for order checkout with PaymentSheet.
 */
async function createPaymentIntentForOrder({ orderTotalCents, buyerId, orderIdPlaceholder, metadata = {} }) {
    if (!process.env.STRIPE_SECRET_KEY) throw err("CONFIG_ERROR", "Missing STRIPE_SECRET_KEY");

    const pi = await stripe.paymentIntents.create({
        amount: orderTotalCents,
        currency: "aed",
        capture_method: "manual",
        metadata: {
            type: "order",
            buyerId: String(buyerId),
            orderId: String(orderIdPlaceholder || "pending"),
            ...metadata,
        },
    });

    return { id: pi.id, client_secret: pi.client_secret };
}

module.exports = {
    createCheckoutSession,
    createRechargeIntent,
    createPaymentIntentForOrder,
    handleWebhook,
    listPackages,
    getPackage,
};
