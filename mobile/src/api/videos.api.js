import client from "./client";

// Videos
export async function listVideos(params = {}) {
  const { data } = await client.get("/videos", {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
  });
  return {
    videos: data?.videos ?? [],
    page: data?.page ?? 1,
    limit: data?.limit ?? 20,
    total: data?.total ?? 0,
  };
}

export async function getVideo(videoId) {
  const { data } = await client.get(`/videos/${videoId}`);
  return data?.video ?? data;
}

export async function createVideo(body) {
  const { data } = await client.post("/videos", {
    videoUrl: body.videoUrl,
    thumbnailUrl: body.thumbnailUrl || "",
    caption: body.caption || "",
    locationText: body.locationText || "",
    durationSec: body.durationSec || 0,
  });
  return data?.video ?? data;
}

export async function deleteVideo(videoId) {
  const { data } = await client.delete(`/videos/${videoId}`);
  return data;
}

// Likes
export async function likeVideo(videoId) {
  const { data } = await client.post(`/videos/${videoId}/like`);
  return data;
}

export async function unlikeVideo(videoId) {
  const { data } = await client.delete(`/videos/${videoId}/like`);
  return data;
}

// Comments
export async function listComments(videoId, params = {}) {
  const { data } = await client.get(`/videos/${videoId}/comments`, {
    params: { page: params.page ?? 1, limit: params.limit ?? 20 },
  });
  return {
    comments: data?.comments ?? [],
    page: data?.page ?? 1,
    limit: data?.limit ?? 20,
    total: data?.total ?? 0,
  };
}

export async function addComment(videoId, text) {
  const { data } = await client.post(`/videos/${videoId}/comments`, { text });
  return data;
}

export async function deleteComment(videoId, commentId) {
  const { data } = await client.delete(`/videos/${videoId}/comments/${commentId}`);
  return data;
}

// Pins
export async function getVideoPins(videoId) {
  const { data } = await client.get(`/videos/${videoId}/pins`);
  return { pins: data?.pins ?? [], items: data?.items ?? [] };
}

export async function pinListing(videoId, listingId) {
  const { data } = await client.post(`/videos/${videoId}/pin-listing`, { listingId });
  return data;
}

// Reporting (video endpoint)
export async function reportVideo(videoId, reason) {
  const { data } = await client.post(`/videos/${videoId}/report`, { reason });
  return data;
}

