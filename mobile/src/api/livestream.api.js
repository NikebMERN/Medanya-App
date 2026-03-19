import client from "./client";

export async function listStreams(params = {}) {
  const { data } = await client.get("/streams", {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      category: params.category,
      keyword: params.keyword,
    },
  });
  return {
    streams: data?.streams ?? [],
    page: data?.page ?? 1,
    limit: data?.limit ?? 20,
    total: data?.total ?? 0,
  };
}

export async function getStream(streamId) {
  const { data } = await client.get(`/streams/${streamId}`);
  return data?.stream ?? data;
}

export async function getMyActiveStream() {
  const { data } = await client.get("/streams/my-active");
  return data?.stream ?? null;
}

export async function createStream(body) {
  const payload = {
    title: body?.title ?? "",
    category: body?.category ?? "",
    field: body?.field ?? "GENERAL",
    tags: Array.isArray(body?.tags) ? body.tags : [],
  };
  if (body?.coverImageUrl) payload.coverImageUrl = body.coverImageUrl;
  const { data } = await client.post("/streams", payload);
  return data?.stream ?? data;
}

export async function getStreamToken(streamId) {
  const { data } = await client.post(`/streams/${streamId}/token`);
  return {
    token: data?.token,
    provider: data?.provider,
    providerRoom: data?.providerRoom,
    streamId: data?.streamId,
    uid: data?.uid,
  };
}

export async function endStream(streamId) {
  const { data } = await client.post(`/streams/${streamId}/end`);
  return data?.stream ?? data;
}

export async function getGiftCatalog() {
  const { data } = await client.get("/gifts");
  return data?.gifts ?? [];
}

export async function getLiveStreamsFollowing(params = {}) {
  const { data } = await client.get("/streams/home-following", {
    params: { limit: params.limit ?? 10 },
  });
  return { streams: data?.streams ?? [] };
}

export async function getStreamPins(streamId) {
  const { data } = await client.get(`/live/${streamId}/pins`);
  return { pins: data?.pins ?? [], items: data?.items ?? [] };
}

export async function pinListing(streamId, listingId) {
  const { data } = await client.post(`/live/${streamId}/pin`, { listingId });
  return data;
}
