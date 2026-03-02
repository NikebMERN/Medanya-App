// src/modules/payments/stripeConnect.service.js
// Stripe Connect Express: sellers get paid to their bank only after delivery confirmation
const Stripe = require("stripe");
const userDb = require("../users/user.mysql");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

function err(code, message) {
    const e = new Error(message || code);
    e.code = code;
    return e;
}

/**
 * Create Express account and return onboarding URL, or return new link if account exists.
 */
async function createOnboardingLink(userId) {
    if (!process.env.STRIPE_SECRET_KEY) throw err("CONFIG_ERROR", "Missing STRIPE_SECRET_KEY");
    const user = await userDb.getById(userId);
    if (!user) throw err("NOT_FOUND", "User not found");

    let accountId = user.stripe_account_id;
    if (!accountId) {
        try {
            const account = await stripe.accounts.create({
                type: "express",
                country: process.env.STRIPE_CONNECT_COUNTRY || "AE",
                email: user.email || undefined,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
            });
            accountId = account.id;
            await userDb.updateStripeConnect(userId, {
                stripe_account_id: accountId,
                stripe_onboarding_status: "PENDING",
            });
        } catch (stripeErr) {
            const msg = (stripeErr?.message || "").toLowerCase();
            if (msg.includes("signed up for connect") || msg.includes("signed in") || msg.includes("connect")) {
                throw err(
                    "CONNECT_NOT_ENABLED",
                    "Stripe Connect is not set up yet. Sign in to your Stripe Dashboard, go to Connect → Get started, and complete the platform setup first."
                );
            }
            throw err("STRIPE_ERROR", stripeErr?.message || "Could not create payout account.");
        }
    }

    const baseUrl = (process.env.FRONTEND_URL || process.env.STRIPE_CONNECT_BASE_URL || "").trim();
    const isHttps = /^https:\/\//i.test(baseUrl);
    const refreshUrl =
        process.env.STRIPE_CONNECT_REFRESH_URL ||
        (isHttps ? `${baseUrl.replace(/\/$/, "")}/payout-setup?refresh=1` : "https://dashboard.stripe.com");
    const returnUrl =
        process.env.STRIPE_CONNECT_RETURN_URL ||
        (isHttps ? `${baseUrl.replace(/\/$/, "")}/payout-setup?success=1` : "https://dashboard.stripe.com");

    let link;
    try {
        link = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: refreshUrl,
            return_url: returnUrl,
            type: "account_onboarding",
        });
    } catch (linkErr) {
        const msg = (linkErr?.message || "").toLowerCase();
        if (msg.includes("not a valid url") || (msg.includes("invalid") && msg.includes("url"))) {
            throw err(
                "INVALID_URL",
                "Stripe requires https URLs for return/refresh. Set STRIPE_CONNECT_RETURN_URL and STRIPE_CONNECT_REFRESH_URL in .env to your app's https URLs."
            );
        }
        throw err("STRIPE_ERROR", linkErr?.message || "Could not create onboarding link.");
    }

    return { url: link.url, accountId };
}

/**
 * Fetch account from Stripe, update DB flags, return status.
 */
async function getConnectStatus(userId) {
    if (!process.env.STRIPE_SECRET_KEY) throw err("CONFIG_ERROR", "Missing STRIPE_SECRET_KEY");
    const user = await userDb.getById(userId);
    if (!user) throw err("NOT_FOUND", "User not found");
    if (!user.stripe_account_id) {
        return {
            stripe_account_id: null,
            onboardingStatus: "NOT_STARTED",
            payoutsEnabled: false,
            chargesEnabled: false,
            detailsSubmitted: false,
            canAcceptPayouts: false,
        };
    }

    const account = await stripe.accounts.retrieve(user.stripe_account_id);
    const payoutsEnabled = !!account.payouts_enabled;
    const chargesEnabled = !!account.charges_enabled;
    const detailsSubmitted = !!account.details_submitted;
    let onboardingStatus = user.stripe_onboarding_status || "NOT_STARTED";
    if (detailsSubmitted && payoutsEnabled) onboardingStatus = "COMPLETE";
    else if (detailsSubmitted) onboardingStatus = "PENDING";

    await userDb.updateStripeConnect(userId, {
        stripe_onboarding_status: onboardingStatus,
        stripe_payouts_enabled: payoutsEnabled ? 1 : 0,
        stripe_charges_enabled: chargesEnabled ? 1 : 0,
        stripe_details_submitted: detailsSubmitted ? 1 : 0,
    });

    return {
        stripe_account_id: user.stripe_account_id,
        onboardingStatus,
        payoutsEnabled,
        chargesEnabled,
        detailsSubmitted,
        canAcceptPayouts: payoutsEnabled,
    };
}

/**
 * Create Transfer to connected account (seller). Call after delivery confirmation.
 * amountCents: amount to transfer in cents (same currency as charge).
 * Returns { transferId } or throws.
 */
async function createTransferToConnectedAccount({ destinationAccountId, amountCents, currency, sourceTransaction, metadata = {} }) {
    if (!process.env.STRIPE_SECRET_KEY) throw err("CONFIG_ERROR", "Missing STRIPE_SECRET_KEY");
    if (!destinationAccountId || amountCents <= 0) throw err("VALIDATION_ERROR", "destinationAccountId and positive amountCents required");

    const transfer = await stripe.transfers.create({
        amount: amountCents,
        currency: (currency || "aed").toLowerCase(),
        destination: destinationAccountId,
        source_transaction: sourceTransaction || undefined,
        metadata: { ...metadata },
    });
    return { transferId: transfer.id };
}

module.exports = {
    createOnboardingLink,
    getConnectStatus,
    createTransferToConnectedAccount,
};
