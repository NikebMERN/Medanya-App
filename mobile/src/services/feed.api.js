/**
 * REST API for community feed module.
 * Base: /api/feed
 */
import client from "../api/client";

export async function getFeed(params = {}) {
  const res = await client.get("/feed", {
    params: {
      cursor: params.cursor,
      limit: params.limit ?? 20,
      types: params.types ? String(params.types) : undefined,
    },
  });
  const d = res?.data ?? res;
  return {
    items: Array.isArray(d?.items) ? d.items : [],
    nextCursor: d?.nextCursor ?? null,
  };
}

export async function getHighlights(params = {}) {
  const res = await client.get("/feed/highlights", {
    params: { limit: params.limit ?? 20 },
  });
  const d = res?.data ?? res;
  return {
    items: Array.isArray(d?.items) ? d.items : [],
  };
}
