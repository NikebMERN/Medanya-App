/**
 * Recording API: upload video, create post.
 */
import client from "../../../api/client";

export async function getUploadSignUrl(params) {
  const { data } = await client.post("/videos/upload/sign", params);
  return data;
}

export async function createVideoPost(body) {
  const { data } = await client.post("/videos", {
    videoUrl: body.videoUrl,
    thumbnailUrl: body.thumbnailUrl || "",
    caption: body.caption || "",
    hashtags: body.hashtags || [],
    durationSec: body.durationSec || 0,
    tags: body.tags,
    language: body.language,
    privacy: body.privacy || "public",
    allowComments: body.allowComments !== false,
  });
  return data?.video ?? data;
}
