/**
 * Scam ML: inference service wrapper.
 * Calls Python FastAPI /predict with 300ms timeout. Fallback to rules-only on failure.
 */
const crypto = require("crypto");
const logger = require("../../utils/logger.util");
const { get: redisGet, set: redisSet } = require("../../config/redis");

const ML_INFERENCE_URL = process.env.ML_INFERENCE_URL || "http://127.0.0.1:8000";
const ML_TIMEOUT_MS = parseInt(process.env.ML_INFERENCE_TIMEOUT_MS, 10) || 500;
const ML_CACHE_TTL = 24 * 60 * 60; // 24h
const MIN_LABELS_FOR_ML = parseInt(process.env.ML_MIN_LABELS_FOR_TRAINING, 10) || 200;

function hashText(text) {
    if (!text || typeof text !== "string") return null;
    return crypto.createHash("sha256").update(String(text).trim().toLowerCase()).digest("hex");
}

async function getCached(textHash) {
    try {
        const key = `scamml:${textHash}`;
        return await redisGet(key);
    } catch {
        return null;
    }
}

async function setCached(textHash, result) {
    try {
        const key = `scamml:${textHash}`;
        await redisSet(key, result, ML_CACHE_TTL);
    } catch (_) {}
}

/**
 * Call ML inference service. Returns null on timeout/failure (rules-only fallback).
 * @param {string} text - normalized title + description + location
 * @returns {Promise<{scamProbability: number, confidence: number, labels: string[], modelVersion: string} | null>}
 */
async function predict(text, targetType) {
    if (!text || typeof text !== "string") return null;

    const textHash = hashText(text);
    const cached = await getCached(textHash);
    if (cached) return cached;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);

    try {
        const res = await fetch(`${ML_INFERENCE_URL}/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: String(text).slice(0, 5000), targetType: targetType || "JOB" }),
            signal: controller.signal,
        });
        clearTimeout(id);

        if (!res.ok) {
            logger.warn("scamML: inference HTTP", res.status);
            return null;
        }

        const data = await res.json();
        const result = {
            scamProbability: Math.max(0, Math.min(1, Number(data.scamProbability) || 0)),
            confidence: Math.max(0, Math.min(1, Number(data.confidence) || 0.5)),
            labels: Array.isArray(data.labels) ? data.labels : ["SCAM"].slice(0, data.scamProbability >= 0.5 ? 1 : 0),
            modelVersion: String(data.modelVersion || "unknown"),
        };
        await setCached(textHash, result);
        return result;
    } catch (e) {
        clearTimeout(id);
        if (e.name !== "AbortError") logger.warn("scamML: inference failed", e?.message);
        return null;
    }
}

function getMinLabelsForML() {
    return MIN_LABELS_FOR_ML;
}

async function classify(text) {
    return predict(text);
}

module.exports = { predict, classify, hashText, getCached, setCached, getMinLabelsForML };
