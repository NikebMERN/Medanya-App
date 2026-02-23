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
