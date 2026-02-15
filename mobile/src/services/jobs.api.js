/**
 * REST API for jobs module.
 * Base: /api/jobs
 */
import client from "../api/client";

export async function listJobs(params = {}) {
  const res = await client.get("/jobs", {
    params: {
      page: params.page,
      limit: params.limit ?? 20,
      category: params.category || undefined,
      location: params.location || undefined,
      status: params.status || undefined,
    },
  });
  const data = res?.data ?? res;
  return {
    jobs: Array.isArray(data?.jobs) ? data.jobs : [],
    page: data?.page ?? 1,
    limit: data?.limit ?? 20,
    total: data?.total ?? 0,
  };
}

export async function searchJobs(params = {}) {
  const res = await client.get("/jobs/search", {
    params: {
      q: params.keyword || params.q || undefined,
      category: params.category || undefined,
      location: params.location || undefined,
      page: params.page,
      limit: params.limit ?? 20,
    },
  });
  const data = res?.data ?? res;
  return {
    jobs: Array.isArray(data?.jobs) ? data.jobs : [],
    page: data?.page ?? 1,
    limit: data?.limit ?? 20,
    total: data?.total ?? 0,
  };
}

export async function getJob(jobId) {
  const { data } = await client.get(`/jobs/${jobId}`);
  return data?.job ?? data;
}

export async function createJob(body) {
  const { data } = await client.post("/jobs", {
    title: body.title,
    category: body.category,
    salary: body.salary || undefined,
    location: body.location,
    contact_phone: body.contact_phone,
    image_url: body.image_url || undefined,
  });
  return data?.job ?? data;
}

export async function applyToJob(jobId, message) {
  const { data } = await client.post(`/jobs/${jobId}/apply`, {
    message: message || undefined,
  });
  return data?.application ?? data;
}
