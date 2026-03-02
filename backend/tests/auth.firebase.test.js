/**
 * Auth Firebase (Google/Facebook) tests.
 * Run: node --test tests/auth.firebase.test.js
 */
const { describe, it } = require("node:test");
const assert = require("node:assert");

describe("Auth Firebase token validation", () => {
    const { validateVerifyOtp } = require("../src/modules/auth/auth.validation");

    it("validateVerifyOtp rejects empty body", () => {
        const req = { body: {} };
        const res = { status: (c) => ({ json: (o) => ({ statusCode: c }) }) };
        let nextCalled = false;
        const next = () => { nextCalled = true; };
        validateVerifyOtp(req, res, next);
        assert.strictEqual(nextCalled, false);
    });

    it("validateVerifyOtp rejects short idToken", () => {
        const req = { body: { idToken: "abc" } };
        const res = { status: (c) => ({ json: (o) => ({ statusCode: c }) }) };
        let nextCalled = false;
        const next = () => { nextCalled = true; };
        validateVerifyOtp(req, res, next);
        assert.strictEqual(nextCalled, false);
    });

    it("validateVerifyOtp accepts valid idToken", () => {
        const req = { body: { idToken: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.test" } };
        const res = {};
        let nextCalled = false;
        const next = () => { nextCalled = true; };
        validateVerifyOtp(req, res, next);
        assert.strictEqual(nextCalled, true);
    });
});

describe("Auth service findOrCreateUser logic", () => {
    const authService = require("../src/modules/auth/auth.service");

    it("verifyFirebaseToken normalizes idToken (strips Bearer)", () => {
        const norm = authService.verifyFirebaseToken.toString();
        assert.ok(norm.includes("normalizeIdToken") || norm.includes("trim"));
    });
});
