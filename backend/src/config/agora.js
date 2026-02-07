// src/config/agora.js
let RtcTokenBuilder, RtcRole;

function loadAgoraSdk() {
    if (RtcTokenBuilder && RtcRole) return;
    try {
        const sdk = require("agora-access-token");
        RtcTokenBuilder = sdk.RtcTokenBuilder;
        RtcRole = sdk.RtcRole;
    } catch (e) {
        const err = new Error(
            'Missing dependency "agora-access-token". Run: npm i agora-access-token',
        );
        err.code = "AGORA_SDK_MISSING";
        throw err;
    }
}

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERT = process.env.AGORA_APP_CERTIFICATE;
const EXPIRE_SECONDS = parseInt(
    process.env.AGORA_TOKEN_EXPIRE_SECONDS || "3600",
    10,
);

function assertAgoraConfigured() {
    if (!APP_ID || !APP_CERT) {
        const e = new Error(
            "Agora not configured (AGORA_APP_ID / AGORA_APP_CERTIFICATE)",
        );
        e.code = "AGORA_NOT_CONFIGURED";
        throw e;
    }
}

function buildAgoraRtcToken({ channelName, uid, role }) {
    loadAgoraSdk(); // ✅ only loads when token endpoint is called
    assertAgoraConfigured();

    const agoraRole = role === "host" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    const now = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = now + EXPIRE_SECONDS;

    return RtcTokenBuilder.buildTokenWithUid(
        APP_ID,
        APP_CERT,
        channelName,
        uid,
        agoraRole,
        privilegeExpireTime,
    );
}

module.exports = { buildAgoraRtcToken };
