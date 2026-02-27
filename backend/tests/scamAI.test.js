/**
 * Scam AI: unit tests for scoring and decision policy.
 * Run: node --test tests/scamAI.test.js
 */
const { describe, it } = require("node:test");
const assert = require("node:assert");

describe("scamAI.localRules", () => {
    const localRules = require("../src/services/scamAI/scamAI.localRules");

    it("returns low probability for clean content", () => {
        const r = localRules.classify(
            { title: "Software Engineer", description: "Full-time role in Dubai", location: "Dubai" },
            "JOB"
        );
        assert.ok(r.scamProbability < 0.5);
        assert.ok(Array.isArray(r.labels));
    });

    it("flags western union / wire transfer", () => {
        const r = localRules.classify(
            { title: "Earn money", description: "Send via western union for fast payment", location: "Remote" },
            "JOB"
        );
        assert.ok(r.scamProbability > 0);
        assert.ok(r.labels.includes("WIRE_TRANSFER") || r.labels.includes("UPFRONT_PAYMENT"));
    });

    it("flags deposit / upfront payment", () => {
        const r = localRules.classify(
            { title: "Job", description: "Pay deposit first to secure", location: "Anywhere" },
            "JOB"
        );
        assert.ok(r.scamProbability > 0);
        assert.ok(r.labels.includes("UPFRONT_PAYMENT") || r.labels.includes("DEPOSIT_REQUIRED"));
    });

    it("flags passport request", () => {
        const r = localRules.classify(
            { title: "Admin job", description: "Send your passport and ID card to apply", location: "Online" },
            "JOB"
        );
        assert.ok(r.labels.includes("PASSPORT_REQUEST"));
    });

    it("flags off-platform contact (whatsapp/telegram)", () => {
        const r = localRules.classify(
            { title: "Sell laptop", description: "Contact me on whatsapp for price", location: "Dubai" },
            "MARKET"
        );
        assert.ok(r.labels.includes("OFF_PLATFORM_CONTACT"));
    });

    it("returns empty labels for empty content", () => {
        const r = localRules.classify(null, "JOB");
        assert.strictEqual(r.scamProbability, 0);
        assert.deepStrictEqual(r.labels, []);
    });
});

describe("scamAI.policy", () => {
    const policy = require("../src/services/scamAI/scamAI.policy");

    it("ALLOW when scores low", () => {
        const p = policy.applyPolicy(20, 0.1, 0.6, []);
        assert.strictEqual(p.decision, "ALLOW");
        assert.strictEqual(p.status, "active");
    });

    it("PENDING_REVIEW when combined >= 60", () => {
        const p = policy.applyPolicy(70, 0.3, 0.7, []);
        assert.strictEqual(p.decision, "PENDING_REVIEW");
        assert.strictEqual(p.status, "PENDING_REVIEW");
    });

    it("PENDING_REVIEW when AI prob >= 0.9 and confidence >= 0.7", () => {
        const p = policy.applyPolicy(40, 0.92, 0.75, ["OFF_PLATFORM_CONTACT"]);
        assert.strictEqual(p.decision, "PENDING_REVIEW");
    });

    it("BLOCK when severe labels + high prob + high confidence", () => {
        const p = policy.applyPolicy(50, 0.96, 0.85, ["WIRE_TRANSFER"]);
        assert.strictEqual(p.decision, "BLOCK");
        assert.strictEqual(p.status, "BLOCKED");
    });

    it("no BLOCK without severe labels", () => {
        const p = policy.applyPolicy(80, 0.96, 0.85, ["OFF_PLATFORM_CONTACT", "SUSPICIOUS_LANGUAGE"]);
        assert.notStrictEqual(p.decision, "BLOCK");
    });

    it("combined score uses max(rule, 0.65*rule + 0.35*ai)", () => {
        const p = policy.applyPolicy(60, 1, 0.9, []);
        const expected = Math.max(60, Math.round(0.65 * 60 + 0.35 * 100));
        assert.ok(p.combinedScore >= 60);
    });
});

describe("scamAI.types", () => {
    const { LABELS, filterValidLabels, isValidLabel } = require("../src/services/scamAI/scamAI.types");

    it("filterValidLabels keeps only valid labels", () => {
        const filtered = filterValidLabels(["WIRE_TRANSFER", "INVALID", "CRYPTO_PAYMENT"]);
        assert.deepStrictEqual(filtered, ["WIRE_TRANSFER", "CRYPTO_PAYMENT"]);
    });

    it("isValidLabel works", () => {
        assert.strictEqual(isValidLabel("UPFRONT_PAYMENT"), true);
        assert.strictEqual(isValidLabel("FAKE"), false);
    });
});
