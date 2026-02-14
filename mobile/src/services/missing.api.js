/**
 * REST API for missing persons module.
 * Base: /api/missing-persons
 */
import client from "../api/client";

export async function listMissingPersons(params = {}) {
  const res = await client.get("/missing-persons", {
    params: {
      page: params.page,
      limit: params.limit,
      q: params.q,
      location: params.location,
      status: params.status || "active",
    },
  });
  const d = res?.data ?? res;
  return {
    results: Array.isArray(d?.results) ? d.results : [],
    page: d?.page ?? 1,
    limit: d?.limit ?? 20,
    total: d?.total ?? 0,
  };
}

export async function getMissingPerson(id) {
  const { data } = await client.get(`/missing-persons/${id}`);
  return data?.missingPerson ?? data;
}

export async function createMissingPerson(body) {
  const { data } = await client.post("/missing-persons", {
    photoUrl: body.photoUrl,
    fullName: body.fullName || undefined,
    contactPhone: body.contactPhone,
    voiceUrl: body.voiceUrl || undefined,
    lastKnownLocationText: body.lastKnownLocationText,
    description: body.description,
    gps: body.gps || undefined,
  });
  return data?.missingPerson ?? data;
}

export async function listComments(missingPersonId, params = {}) {
  const res = await client.get(`/missing-persons/${missingPersonId}/comments`, {
    params: { page: params.page, limit: params.limit },
  });
  const d = res?.data ?? res;
  return {
    comments: Array.isArray(d?.comments) ? d.comments : [],
    page: d?.page ?? 1,
    limit: d?.limit ?? 20,
    total: d?.total ?? 0,
  };
}

export async function addComment(missingPersonId, body) {
  const { data } = await client.post(`/missing-persons/${missingPersonId}/comments`, {
    text: body.text || undefined,
    voiceUrl: body.voiceUrl || undefined,
  });
  return data?.comment ?? data;
}
