/**
 * Scam ML: unit tests.
 * Run: node --test tests/scamML.test.js
 */
const { describe, it } = require("node:test");
const assert = require("node:assert");

describe("scamML.ensemble", () => {
    const { applyMLPolicy } = require("../src/services/scamML/scamML.ensemble");

    it("rules-only: combined equals ruleScore when no ML", () => {
        const p = applyMLPolicy(40, 0, 0, false);
        assert.strictEqual(p.combinedScore, 40);
        assert.strictEqual(p.status, "active");
        assert.strictEqual(p.decision, "ALLOW");
    });

    it("ML ready: PENDING_REVIEW when combined >= 85", () => {
        const p = applyMLPolicy(90, 0.5, 0.8, true);
        assert.ok(p.combinedScore >= 85);
        assert.strictEqual(p.status, "PENDING_REVIEW");
        assert.strictEqual(p.decision, "PENDING_REVIEW");
    });

    it("ML ready: BLOCK when mlProb >= 0.95, conf >= 0.8, ruleScore >= 70", () => {
        const p = applyMLPolicy(75, 0.96, 0.85, true);
        assert.strictEqual(p.decision, "BLOCK");
        assert.strictEqual(p.status, "BLOCKED");
    });

    it("no BLOCK when ruleScore < 70", () => {
        const p = applyMLPolicy(50, 0.96, 0.85, true);
        assert.notStrictEqual(p.decision, "BLOCK");
    });
});

describe("scamTraining.mysql", () => {
    const scamTraining = require("../src/services/scamML/scamTraining.mysql");

    it("normalizeText joins title description location", () => {
        const t = scamTraining.normalizeText("Title", "Desc here", "Dubai");
        assert.ok(t.includes("Title"));
        assert.ok(t.includes("Desc"));
        assert.ok(t.includes("Dubai"));
    });

    it("normalizeText handles empty", () => {
        const t = scamTraining.normalizeText("", "", "");
        assert.strictEqual(t, "");
    });
});

describe("scamML.service", () => {
    const scamML = require("../src/services/scamML/scamML.service");

    it("predict returns null when ML service unreachable (rules-only fallback)", async () => {
        const result = await scamML.predict("test text western union");
        assert.ok(result === null || (result && typeof result.scamProbability === "number"));
    });

    it("hashText returns sha256 hex string", () => {
        const h = scamML.hashText("hello");
        assert.strictEqual(typeof h, "string");
        assert.strictEqual(h.length, 64);
        assert.ok(/^[a-f0-9]+$/.test(h));
    });
});
