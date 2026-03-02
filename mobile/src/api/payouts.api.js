import client from "./client";

/** Get Stripe Connect status (payouts_enabled, onboarding_status). */
export async function getConnectStatus() {
  const { data } = await client.get("/payments/stripe/connect/status");
  return data;
}

/** Get onboarding URL to open in browser. Seller must complete to receive payouts. */
export async function getConnectOnboardUrl() {
  const { data } = await client.post("/payments/stripe/connect/onboard");
  return data?.url;
}
