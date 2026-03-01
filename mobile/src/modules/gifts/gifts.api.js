/**
 * Gifts API — catalog, send gift, live boost.
 * Console.log responses for integration validation.
 */
import client from "../../api/client";

export async function getGiftCatalog() {
  try {
    const { data } = await client.get("/gifts/catalog");
    console.log("[gifts.api] getGiftCatalog:", data);
    return data?.gifts ?? data ?? getDefaultCatalog();
  } catch (e) {
    console.log("[gifts.api] getGiftCatalog error:", e?.response?.data ?? e?.message);
    return getDefaultCatalog();
  }
}

function getDefaultCatalog() {
  return [
    { id: "rose", name: "Rose", cost: 1, icon: "local-florist" },
    { id: "heart", name: "Heart", cost: 5, icon: "favorite" },
    { id: "star", name: "Star", cost: 10, icon: "star" },
    { id: "diamond", name: "Diamond", cost: 50, icon: "diamond" },
    { id: "crown", name: "Crown", cost: 100, icon: "workspace-premium" },
    { id: "rocket", name: "Rocket", cost: 500, icon: "rocket-launch" },
  ];
}

export async function sendGift(streamId, giftId, quantity) {
  try {
    const { data } = await client.post("/gifts/send", { streamId, giftId, quantity });
    console.log("[gifts.api] sendGift:", data);
    return data;
  } catch (e) {
    console.log("[gifts.api] sendGift error:", e?.response?.data ?? e?.message);
    throw e;
  }
}

export async function boostLive(streamId, amount) {
  try {
    const { data } = await client.post("/boost/live", { streamId, amount });
    console.log("[gifts.api] boostLive:", data);
    return data;
  } catch (e) {
    console.log("[gifts.api] boostLive error:", e?.response?.data ?? e?.message);
    throw e;
  }
}

export async function getLiveSupporters(streamId) {
  try {
    const { data } = await client.get(`/livestream/${streamId}/supporters`);
    console.log("[gifts.api] getLiveSupporters:", data);
    return data?.supporters ?? data ?? [];
  } catch (e) {
    console.log("[gifts.api] getLiveSupporters error:", e?.response?.data ?? e?.message);
    return [];
  }
}
