import client from "../api/client";

export async function listMyPenalties() {
  const { data } = await client.get("/penalties/my");
  return data?.penalties ?? [];
}

export async function getPenalty(id) {
  const { data } = await client.get(`/penalties/${id}`);
  return data?.penalty;
}

export async function createPaymentIntent(penaltyId) {
  const { data } = await client.post(`/penalties/${penaltyId}/pay`);
  return data?.clientSecret;
}
