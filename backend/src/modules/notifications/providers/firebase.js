// src/modules/notifications/providers/firebase.js
const admin = require("firebase-admin");
const env = require("../../../config/env");

let initialized = false;

function initFirebase() {
  if (initialized) return admin;

  const projectId = env.FIREBASE_PROJECT_ID;
  const clientEmail = env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    const e = new Error("Missing Firebase service account env vars");
    e.code = "FIREBASE_CONFIG_MISSING";
    throw e;
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  initialized = true;
  return admin;
}

async function sendToTokens({ tokens, notification, data }) {
  const fb = initFirebase();

  // Firebase requires data values as strings
  const payloadData = {};
  if (data && typeof data === "object") {
    for (const [k, v] of Object.entries(data)) payloadData[k] = String(v);
  }

  return fb.messaging().sendEachForMulticast({
    tokens,
    notification, // { title, body }
    data: payloadData,
  });
}

async function sendToTopic({ topic, notification, data }) {
  const fb = initFirebase();

  const payloadData = {};
  if (data && typeof data === "object") {
    for (const [k, v] of Object.entries(data)) payloadData[k] = String(v);
  }

  return fb.messaging().send({
    topic,
    notification,
    data: payloadData,
  });
}

module.exports = {
  initFirebase,
  sendToTokens,
  sendToTopic,
};
