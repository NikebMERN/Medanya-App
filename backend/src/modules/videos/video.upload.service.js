// src/modules/videos/video.upload.service.js
const crypto = require("crypto");
const { cloudinary, isConfigured } = require("../../config/cloudinary");

/**
 * Generate Cloudinary signed upload params for client-side upload.
 * Returns params for POST to https://api.cloudinary.com/v1_1/{cloud_name}/{resource_type}/upload
 */
function getSignedUploadParams(resourceType = "video", folder = "videos") {
    if (!isConfigured()) {
        return null;
    }
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) return null;

    const timestamp = Math.floor(Date.now() / 1000);
    const params = {
        timestamp,
        folder: folder || "videos",
    };
    const paramStr = Object.keys(params)
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join("&");
    const signature = crypto.createHash("sha1").update(paramStr + apiSecret).digest("hex");

    return {
        cloudName,
        apiKey,
        timestamp,
        signature,
        folder: params.folder,
        resourceType: resourceType === "image" ? "image" : "video",
    };
}

module.exports = { getSignedUploadParams };
