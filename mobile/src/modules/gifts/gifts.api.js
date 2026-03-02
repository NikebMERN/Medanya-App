/**
 * Gifts API — catalog, send gift, live boost.
 */
import client from "../../api/client";

export async function getGiftCatalog() {
  try {
    const { data } = await client.get("/gifts/catalog");
    return data?.gifts ?? data ?? getDefaultCatalog();
  } catch (e) {
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
  const { data } = await client.post("/gifts/send", { streamId, giftId, quantity });
  return data;
}

export async function boostLive(streamId, amount) {
  const { data } = await client.post("/boost/live", { streamId, amount });
  return data;
}

export async function getLiveSupporters(streamId) {
  try {
    const { data } = await client.get(`/livestream/${streamId}/supporters`);
    return data?.supporters ?? data ?? [];
  } catch (e) {
    return [];
  }
}
