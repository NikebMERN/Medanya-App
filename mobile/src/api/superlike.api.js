import client from "./client";

export async function getSuperlikeBalance() {
  const { data } = await client.get("/superlikes/balance");
  return data?.balance ?? 0;
}

export async function earnWelcome() {
  const { data } = await client.post("/superlikes/earn/welcome");
  return data;
}

export async function earnAd() {
  const { data } = await client.post("/superlikes/earn/ad");
  return data;
}

export async function earnReferral(referredUserId) {
  const { data } = await client.post("/superlikes/earn/referral", { referredUserId });
  return data;
}

export async function superlikeVideo(videoId) {
  const { data } = await client.post(`/videos/${videoId}/superlike`);
  return data;
}

export async function superlikeStream(streamId) {
  const { data } = await client.post(`/streams/${streamId}/superlike`);
  return data;
}

export async function getCreatorEarningsMonthly(month) {
  const { data } = await client.get("/creators/earnings/monthly", { params: month ? { month } : {} });
  return data?.earnings ?? null;
}
