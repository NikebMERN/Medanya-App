/**
 * KYC identity verification API.
 */
import client from "./client";

// Re-export from data module (single source of truth)
export { KYC_DOC_TYPES, DEFAULT_DOC_TYPE } from "../data/kycDocTypes";

export async function submitKyc(body) {
  const { data } = await client.post("/kyc/submit", {
    docType: body.docType,
    docNumber: body.docNumber || undefined,
    frontImageUrl: body.frontImageUrl,
    backImageUrl: body.backImageUrl || undefined,
    selfieImageUrl: body.selfieImageUrl || undefined,
    fullName: body.fullName || undefined,
    birthdate: body.birthdate || undefined,
    consent: !!body.consent,
  });
  return data;
}

/** Confirm changing profile data to match document (makes account private, hides personal data). */
export async function confirmKycDataChange(submissionId) {
  const { data } = await client.post(`/kyc/submissions/${submissionId}/confirm-data-change`);
  return data;
}

export async function getKycStatus() {
  const { data } = await client.get("/kyc/status");
  return data;
}

/** Start provider KYC (Veriff or Sumsub). Returns { provider, sessionUrl } or { provider, accessToken, applicantId }. */
export async function startProviderKyc() {
  const { data } = await client.post("/kyc/start");
  return data;
}

/** Start provider KYC (Veriff or Sumsub). Returns sessionUrl (Veriff) or accessToken/applicantId (Sumsub). */
export async function startKyc() {
  const { data } = await client.post("/kyc/start");
  return data;
}

/** Start Veriff KYC. Returns { sessionId, sessionUrl }. Use when KYC_PROVIDER=veriff. */
export async function startVeriffKyc() {
  const { data } = await client.post("/kyc/veriff/start");
  return data;
}

/** Sync Veriff decision (pull from API when webhook missed). Returns { kycStatus, updated }. */
export async function veriffSync() {
  const { data } = await client.post("/kyc/veriff/sync");
  return data;
}
