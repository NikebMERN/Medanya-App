/**
 * Veriff KYC integration tests.
 * Run: node --test tests/kyc.veriff.test.js
 * Requires: VERIFF_API_KEY, VERIFF_SHARED_SECRET in .env for integration tests.
 */
const { describe, it } = require("node:test");
const assert = require("node:assert");
const crypto = require("crypto");

describe("Veriff webhook signature verification", () => {
    const veriffService = require("../src/services/veriff.service");

    it("rejects invalid signature", () => {
        const rawBody = Buffer.from('{"status":"success","verification":{"id":"abc","status":"approved"}}');
        const wrongSignature = "deadbeef0123456789";
        assert.strictEqual(veriffService.verifyWebhookSignature(rawBody, wrongSignature), false);
    });

    it("rejects missing signature", () => {
        const rawBody = Buffer.from("{}");
        assert.strictEqual(veriffService.verifyWebhookSignature(rawBody, null), false);
        assert.strictEqual(veriffService.verifyWebhookSignature(rawBody, ""), false);
    });

    it("accepts valid HMAC-SHA256 signature when secret is set", () => {
        const secret = process.env.VERIFF_WEBHOOK_SECRET || process.env.VERIFF_SHARED_SECRET;
        if (!secret) {
            console.log("Skipping: VERIFF_SHARED_SECRET not set");
            return;
        }
        const rawBody = '{"status":"success","verification":{"id":"test-id","status":"approved"}}';
        const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
        assert.strictEqual(veriffService.verifyWebhookSignature(rawBody, expected), true);
    });
});

describe("Veriff decision payload parsing", () => {
    const veriffService = require("../src/services/veriff.service");

    it("extracts verification.status from payload", () => {
        const payload = {
            status: "success",
            verification: { id: "sess-1", status: "approved", vendorData: "userId:123" },
        };
        const p = veriffService.parseDecisionPayload(payload);
        assert.strictEqual(p.status, "approved");
        assert.strictEqual(p.sessionId, "sess-1");
        assert.strictEqual(p.externalId, "userId:123");
    });

    it("extracts APPROVED status (uppercase from Veriff admin)", () => {
        const payload = {
            verification: { id: "sess-1a", status: "APPROVED", vendorData: "userId:123" },
        };
        const p = veriffService.parseDecisionPayload(payload);
        assert.strictEqual(p.status, "APPROVED");
        assert.strictEqual(p.sessionId, "sess-1a");
        assert.ok(/approved/i.test(p.status));
    });

    it("extracts declined status", () => {
        const payload = {
            verification: { id: "sess-2", status: "declined", reason: "Document expired" },
        };
        const p = veriffService.parseDecisionPayload(payload);
        assert.strictEqual(p.status, "declined");
        assert.strictEqual(p.reason, "Document expired");
    });

    it("extracts riskLabels from verification.riskLabels", () => {
        const payload = {
            verification: {
                id: "sess-3",
                status: "declined",
                riskLabels: [{ label: "document_fraud", category: "document" }],
            },
        };
        const p = veriffService.parseDecisionPayload(payload);
        assert.ok(Array.isArray(p.labels));
        assert.ok(p.labels.includes("document_fraud"));
    });
});

describe("Veriff vendorData validation", () => {
    it("validates userId format in vendorData", () => {
        const extractUserId = (externalId) => {
            if (!externalId) return null;
            return externalId.startsWith("userId:") ? externalId.slice(7) : externalId;
        };
        const sessionUserId = "123";
        const vendorData = "userId:123";
        const vendorUserId = extractUserId(vendorData);
        assert.strictEqual(vendorUserId, sessionUserId);
    });

    it("rejects mismatched vendorData", () => {
        const extractUserId = (externalId) => {
            if (!externalId) return null;
            return externalId.startsWith("userId:") ? externalId.slice(7) : externalId;
        };
        const sessionUserId = "123";
        const vendorData = "userId:456";
        const vendorUserId = extractUserId(vendorData);
        assert.notStrictEqual(vendorUserId, sessionUserId);
    });
});

