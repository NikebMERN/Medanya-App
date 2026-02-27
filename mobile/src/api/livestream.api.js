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

export async function createStream(body) {
  const payload = {
    title: body?.title ?? "",
    category: body?.category ?? "",
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
