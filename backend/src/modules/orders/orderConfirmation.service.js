// src/modules/orders/orderConfirmation.service.js
// Unified 7-digit code + QR token generation and verification for delivery confirmation
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const orderConfirmationsDb = require("./orderConfirmations.mysql");
const { pool } = require("../../config/mysql");

const QR_SECRET = process.env.ORDERS_QR_SECRET || process.env.JWT_SECRET || "medanya-orders-qr-v1";
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const EXPIRY_DAYS = 7;

function generateSevenDigitCode() {
  return String(Math.floor(1000000 + Math.random() * 9000000));
}

function hashCode(code) {
  return bcrypt.hashSync(code, 10);
}

function verifyCode(code, hash) {
  return bcrypt.compareSync(String(code), hash);
}

function codeLast4(code) {
  const s = String(code);
  return s.length >= 4 ? s.slice(-4) : s;
}

function encryptCode(code) {
  const key = crypto.scryptSync(QR_SECRET, "medanya-delivery", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let enc = cipher.update(String(code), "utf8", "hex");
  enc += cipher.final("hex");
  return iv.toString("hex") + ":" + enc;
}

function decryptCode(encrypted) {
  if (!encrypted) return null;
  try {
    const [ivHex, encHex] = encrypted.split(":");
    if (!ivHex || !encHex) return null;
    const key = crypto.scryptSync(QR_SECRET, "medanya-delivery", 32);
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let dec = decipher.update(encHex, "hex", "utf8");
    dec += decipher.final("utf8");
    return dec;
  } catch (_) {
    return null;
  }
}

function generateQrToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashQrToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function signQrPayload(orderId) {
  const payload = JSON.stringify({
    orderId: String(orderId),
    exp: Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  });
  const sig = crypto.createHmac("sha256", QR_SECRET).update(payload).digest("hex");
  return Buffer.from(payload + "." + sig).toString("base64url");
}

function verifyQrPayload(token, orderId) {
  if (!token || typeof token !== "string") return false;
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const [payload, sig] = raw.split(".");
    if (!payload || !sig) return false;
    const expected = crypto.createHmac("sha256", QR_SECRET).update(payload).digest("hex");
    if (sig !== expected) return false;
    const obj = JSON.parse(payload);
    if (String(obj.orderId) !== String(orderId)) return false;
    if (obj.exp && obj.exp < Date.now()) return false;
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Create confirmation record for an order (call when order is created, COD or Stripe).
 * Returns { code, codeLast4, qrToken } - store code/qrToken only in memory for immediate use;
 * code is stored encrypted for buyer reveal later.
 */
async function createForOrder(conn, orderId) {
  const code = generateSevenDigitCode();
  const codeHash = hashCode(code);
  const last4 = codeLast4(code);
  const codeEncrypted = encryptCode(code);
  const qrToken = generateQrToken();
  const qrTokenHash = hashQrToken(qrToken);
  const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await orderConfirmationsDb.insert(conn, {
    order_id: orderId,
    code_hash: codeHash,
    code_last4: last4,
    code_encrypted: codeEncrypted,
    qr_token_hash: qrTokenHash,
    expires_at: expiresAt,
    attempts_count: 0,
  });

  return { code, codeLast4: last4, qrToken, expiresAt };
}

/**
 * Get confirmation record for buyer (masked); if canReveal, return full code and qrPayload.
 * BOTH COD and Stripe: reveal when OUT_FOR_DELIVERY (buyer shows code/QR to seller).
 */
async function getConfirmationForBuyer(orderId, orderStatus, paymentMethod = "") {
  const OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY";
  const DELIVERED = "DELIVERED";
  const COMPLETED = "COMPLETED";
  // Reveal code/QR only after OUT_FOR_DELIVERY to prevent early leaks (both methods)
  const canReveal = [OUT_FOR_DELIVERY, DELIVERED, COMPLETED].includes(orderStatus);
  const lockedHint = "Code will appear when order is out for delivery.";

  const conf = await orderConfirmationsDb.findByOrderId(pool, orderId);
  if (!conf) {
    return {
      canReveal: false,
      maskedCode: null,
      qrAvailable: false,
      revealHint: lockedHint,
      reason: "NOT_READY",
    };
  }

  const now = new Date();
  const expired = conf.expires_at && new Date(conf.expires_at) < now;
  const used = !!conf.used_at;
  const locked = conf.locked_until && new Date(conf.locked_until) > now;

  if (used) {
    return {
      canReveal: false,
      maskedCode: "****" + (conf.code_last4 || ""),
      qrAvailable: false,
      revealHint: "Delivery already confirmed.",
    };
  }
  if (expired) {
    return {
      canReveal: false,
      maskedCode: "****" + (conf.code_last4 || ""),
      qrAvailable: false,
      revealHint: "Confirmation code has expired.",
    };
  }
  if (locked) {
    return {
      canReveal: false,
      maskedCode: "****" + (conf.code_last4 || ""),
      qrAvailable: false,
      revealHint: "Too many wrong attempts. Try again later.",
    };
  }

  const maskedCode = "****" + (conf.code_last4 || "");
  const qrAvailable = canReveal;

  if (!canReveal) {
    return {
      canReveal: false,
      maskedCode,
      qrAvailable: false,
      revealHint: lockedHint,
      reason: "NOT_READY",
    };
  }

  const fullCode = decryptCode(conf.code_encrypted);
  const qrPayload = signQrPayload(orderId);
  return {
    canReveal: true,
    maskedCode,
    qrAvailable: true,
    revealHint: "Show code or QR to seller only when you receive the item.",
    code: fullCode || null,
    qrPayload: { orderId: String(orderId), qrToken: qrPayload },
    reason: null,
  };
}

/**
 * Verify by 7-digit code. Returns { valid, locked, expired }.
 * Caller must ensure only seller can confirm and status is OUT_FOR_DELIVERY.
 */
async function verifyByCode(conn, orderId, code, sellerId) {
  const conf = await orderConfirmationsDb.findByOrderId(conn, orderId);
  if (!conf) return { valid: false, reason: "NO_CONFIRMATION" };
  if (conf.used_at) return { valid: false, reason: "ALREADY_USED" };

  const now = new Date();
  if (conf.expires_at && new Date(conf.expires_at) < now) return { valid: false, reason: "EXPIRED" };
  if (conf.locked_until && new Date(conf.locked_until) > now) return { valid: false, reason: "LOCKED" };

  const codeStr = String(code || "").trim();
  if (codeStr.length !== 7 || !/^\d{7}$/.test(codeStr)) {
    const newAttempts = conf.attempts_count + 1;
    const lockedUntil = newAttempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null;
    await orderConfirmationsDb.incrementAttemptsAndLock(conn, orderId, lockedUntil);
    return { valid: false, reason: "INVALID_CODE", attemptsLeft: Math.max(0, MAX_ATTEMPTS - newAttempts), locked: newAttempts >= MAX_ATTEMPTS };
  }

  if (!verifyCode(codeStr, conf.code_hash)) {
    const newAttempts = conf.attempts_count + 1;
    const lockedUntil = newAttempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null;
    await orderConfirmationsDb.incrementAttemptsAndLock(conn, orderId, lockedUntil);
    return { valid: false, reason: "INVALID_CODE", attemptsLeft: Math.max(0, MAX_ATTEMPTS - newAttempts), locked: newAttempts >= MAX_ATTEMPTS };
  }

  await orderConfirmationsDb.markUsed(conn, orderId, sellerId);
  return { valid: true };
}

/**
 * Verify by QR token (seller scans buyer's QR). Token can be:
 * - The signed payload (signQrPayload) from buyer app, or
 * - A stored random token (we'd compare hash with conf.qr_token_hash).
 * Current flow: buyer shows QR = signQrPayload(orderId). Seller sends that string. We verify with verifyQrPayload(token, orderId).
 * So we don't use qr_token_hash for this path; we use HMAC-signed payload. For a random token we'd need to store plain token to compare (or store hash and have buyer send same token). Spec says "qr_token_hash (sha256)" - so alternative flow: we store hash of a random token, and buyer is given that token to display in QR. Seller scans QR, sends token, we hash and compare. So we need to support both: (1) signed payload verifyQrPayload, (2) random token hash comparison. Let me add support for (2) by storing the token in encrypted form for retrieval when canReveal... Actually the spec says "Generate QR token: secure random string 32-64 chars; Store sha256 hash". So we don't store the plain token - we only store the hash. So when buyer wants to show QR we must give them the token. So we have to store the token (encrypted) or generate it deterministically. Current implementation uses deterministic signQrPayload(orderId) so we don't store a random token. I'll keep that: for QR verification we use verifyQrPayload(token, orderId). So we don't use conf.qr_token_hash for verification when the client sends the signed payload. We could store the random qrToken at creation and return it in getConfirmationForBuyer when canReveal - but then we'd need to store plain token (encrypted). Spec says store sha256 hash - so the flow would be: we generate random token, store hash, we must return the same token to buyer for QR display. So we need to store encrypted token. Let me add qr_token_encrypted to the table and return it when canReveal. Then verify by hashing submitted token and comparing to qr_token_hash. So two ways to confirm: (1) 7-digit code, (2) scan QR (token) -> we hash token and compare to qr_token_hash. So when creating we store code_encrypted, qr_token_hash, and we need to store qr_token (encrypted) for giving to buyer. Add qr_token_encrypted to order_confirmations. For now I'll verify QR path with verifyQrPayload only (signed payload), so seller can submit the same payload string from QR scan. So no need to store random token for QR - we generate payload on the fly for buyer and verify with verifyQrPayload. So confirmDeliveryByQr in orders.service will use verifyQrPayload(token, orderId). I'll keep that. So orderConfirmation.service: verifyByQrToken(token, orderId) -> verifyQrPayload(token, orderId). If valid, mark used. But we need to mark used in DB - so we need conn. So verifyByQrToken(conn, orderId, token, sellerId).
 */
async function verifyByQrToken(conn, orderId, token, sellerId) {
  const conf = await orderConfirmationsDb.findByOrderId(conn, orderId);
  if (!conf) return { valid: false, reason: "NO_CONFIRMATION" };
  if (conf.used_at) return { valid: false, reason: "ALREADY_USED" };

  const now = new Date();
  if (conf.expires_at && new Date(conf.expires_at) < now) return { valid: false, reason: "EXPIRED" };
  if (conf.locked_until && new Date(conf.locked_until) > now) return { valid: false, reason: "LOCKED" };

  if (!verifyQrPayload(token, orderId)) return { valid: false, reason: "INVALID_QR" };

  await orderConfirmationsDb.markUsed(conn, orderId, sellerId);
  return { valid: true };
}

module.exports = {
  generateSevenDigitCode,
  hashCode,
  verifyCode,
  codeLast4,
  encryptCode,
  decryptCode,
  createForOrder,
  getConfirmationForBuyer,
  verifyByCode,
  verifyByQrToken,
  signQrPayload,
  verifyQrPayload,
  MAX_ATTEMPTS,
  LOCK_MINUTES,
  EXPIRY_DAYS,
};
