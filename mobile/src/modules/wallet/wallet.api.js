/**
 * Wallet API — balance, transactions.
 */
import client from "../../api/client";

export async function getWalletMe() {
  const { data } = await client.get("/wallet/me");
  return data;
}

export async function getWalletHistory(params = {}) {
  try {
    const { data } = await client.get("/wallet/transactions", { params });
    return { transactions: data?.transactions ?? [], page: data?.page ?? 1, limit: data?.limit ?? 20, total: data?.total ?? 0 };
  } catch (e) {
    throw e;
  }
}

export async function createRechargeIntent(packageId) {
  try {
    const { data } = await client.post("/wallet/recharge/create-intent", { packageId });
    return data;
  } catch (e) {
    throw e;
  }
}

/** Web checkout fallback when native Stripe is unavailable. Returns { checkoutUrl } */
export async function createCheckoutSession(packageId) {
  try {
    const { data } = await client.post("/payments/stripe/checkout", { packageId });
    return data;
  } catch (e) {
    throw e;
  }
}

/** Verify checkout session after returning from web payment. Credits coins if valid. */
export async function verifyCheckoutSession(sessionId) {
  try {
    const { data } = await client.post("/payments/stripe/verify-session", { sessionId });
    return data;
  } catch (e) {
    throw e;
  }
}

export async function listPackages() {
  try {
    const { data } = await client.get("/payments/stripe/packages");
    return data?.packages ?? [];
  } catch (e) {
    return [{ packageId: "coins_100", coins: 100, usdCents: 99 }, { packageId: "coins_500", coins: 500, usdCents: 399 }, { packageId: "coins_1200", coins: 1200, usdCents: 899 }];
  }
}

export async function boostCreator(payload) {
  try {
    const { data } = await client.post("/wallet/support", payload);
    return data;
  } catch (e) {
    throw e;
  }
}

export async function requestCashout(amount, payoutMethod) {
  try {
    const { data } = await client.post("/wallet/cashout", { amount, payoutMethod });
    return data;
  } catch (e) {
    throw e;
  }
}

export async function getTasks() {
  try {
    const { data } = await client.get("/wallet/tasks");
    return data ?? { tasks: [], dailyProgress: {} };
  } catch (e) {
    return {
      tasks: [
        { id: "watch_ad", title: "Watch Ads", reward: 12, dailyCap: 15, progress: 0, icon: "play-circle" },
        { id: "invite", title: "Invite Friends", reward: 50, dailyCap: 500, progress: 0, icon: "people" },
        { id: "daily_checkin", title: "Daily Check-in", reward: 10, streak: 0, icon: "calendar-today" },
        { id: "kyc", title: "Complete Profile/KYC", reward: 100, oneTime: true, done: false, icon: "badge" },
        { id: "post_video", title: "Post a Video", reward: 25, done: false, icon: "videocam" },
        { id: "go_live", title: "Go Live", reward: 50, done: false, icon: "live-tv" },
      ],
      dailyProgress: { streak: 0 },
    };
  }
}

export async function claimTask(type, metadata = {}) {
  try {
    const { data } = await client.post("/wallet/tasks/claim", { type, ...metadata });
    return data;
  } catch (e) {
    throw e;
  }
}

export async function getReferralStats() {
  try {
    const { data } = await client.get("/wallet/referral/stats");
    return data ?? { code: "ABCD12", invited: 0, eligible: 0, earned: 0 };
  } catch (e) {
    return { code: "ABCD12", invited: 0, eligible: 0, earned: 0 };
  }
}
