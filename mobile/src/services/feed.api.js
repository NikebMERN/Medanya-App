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

export async function getHomeFeed(params = {}) {
  const res = await client.get("/feed/home", {
    params: {
      tab: params.tab ?? "all",
      cursor: params.cursor ?? undefined,
      limit: params.limit ?? 20,
    },
  });
  const d = res?.data ?? res;
  return {
    items: Array.isArray(d?.items) ? d.items : [],
    nextCursor: d?.nextCursor ?? null,
  };
}

export async function getPersonalizedFeed(params = {}) {
  const res = await client.get("/feed/personalized", {
    params: {
      tab: params.tab ?? "feeds",
      cursor: params.cursor ?? undefined,
      limit: params.limit ?? 20,
    },
  });
  const d = res?.data ?? res;
  return {
    items: Array.isArray(d?.items) ? d.items : [],
    nextCursor: d?.nextCursor ?? null,
  };
}

export async function getReportsFeed(params = {}) {
  const res = await client.get("/feed/reports", {
    params: {
      cursor: params.cursor ?? undefined,
      limit: params.limit ?? 20,
    },
  });
  const d = res?.data ?? res;
  return {
    items: Array.isArray(d?.items) ? d.items : [],
    nextCursor: d?.nextCursor ?? null,
  };
}

export async function getLiveStreams(params = {}) {
  const res = await client.get("/feed/home/live", {
    params: { limit: params.limit ?? 10 },
  });
  const d = res?.data ?? res;
  return { streams: Array.isArray(d?.streams) ? d.streams : [] };
}
