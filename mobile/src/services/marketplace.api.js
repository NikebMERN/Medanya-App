/**
 * REST API for marketplace module.
 * Base: /api/marketplace
 */
import client from "../api/client";

/** Sort: newest | price_low | price_high */
export async function listItems(params = {}) {
  const res = await client.get("/marketplace/items", {
    params: {
      page: params.page,
      limit: params.limit,
      category: params.category,
      location: params.location,
      sellerId: params.sellerId,
      status: params.status || "active",
      sort: params.sort || "newest",
      includeCreatorPending: params.includeCreatorPending,
    },
  });
  const d = res?.data ?? res;
  return {
    items: Array.isArray(d?.items) ? d.items : [],
    page: d?.page ?? 1,
    limit: d?.limit ?? 20,
    total: d?.total ?? 0,
  };
}

/** Sort: newest | price_low | price_high. Items include status, risk_score, ai_scam_score when returned by backend. */
export async function searchItems(params = {}) {
  const res = await client.get("/marketplace/search", {
    params: {
      q: params.q,
      category: params.category,
      location: params.location,
      sellerId: params.sellerId,
      page: params.page,
      limit: params.limit,
      sort: params.sort || "newest",
      includeCreatorPending: params.includeCreatorPending,
    },
  });
  const d = res?.data ?? res;
  return {
    items: Array.isArray(d?.items) ? d.items : [],
    page: d?.page ?? 1,
    limit: d?.limit ?? 20,
    total: d?.total ?? 0,
  };
}

export async function getItem(id) {
  const { data } = await client.get(`/marketplace/items/${id}`);
  return data?.item ?? data;
}

export async function createItem(body) {
  const { data } = await client.post("/marketplace/items", {
    title: body.title,
    description: body.description,
    category: body.category,
    location: body.location,
    price: body.price,
    currency: body.currency || "AED",
    image_urls: Array.isArray(body.image_urls) ? body.image_urls : body.image_urls ? [body.image_urls] : [],
  });
  return data?.item ?? data;
}
