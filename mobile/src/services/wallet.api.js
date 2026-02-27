import client from "../api/client";

export async function getMyWallet() {
  const { data } = await client.get("/wallet/me");
  return data;
}

export async function getTransactions(params = {}) {
  const { data } = await client.get("/wallet/transactions", { params });
  return {
    transactions: data?.transactions ?? [],
    page: data?.page ?? 1,
    limit: data?.limit ?? 20,
    total: data?.total ?? 0,
  };
}

export async function createRechargeIntent(packageId) {
  const { data } = await client.post("/wallet/recharge/create-intent", { packageId });
  return data;
}

export async function listPackages() {
  const { data } = await client.get("/payments/stripe/packages");
  return data?.packages ?? [];
}
