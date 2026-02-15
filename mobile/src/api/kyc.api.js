/**
 * KYC identity verification API.
 */
import client from "./client";

export const KYC_DOC_TYPES = [
  { value: "passport", label: "Passport" },
  { value: "fayda", label: "Fayda eID" },
  { value: "resident_id", label: "Resident / Work ID" },
  { value: "other", label: "Other government ID" },
];

export async function submitKyc(body) {
  const { data } = await client.post("/kyc/submit", {
    docType: body.docType,
    docNumber: body.docNumber || undefined,
    frontImageUrl: body.frontImageUrl,
    backImageUrl: body.backImageUrl || undefined,
    consent: !!body.consent,
  });
  return data;
}

export async function getKycStatus() {
  const { data } = await client.get("/kyc/status");
  return data;
}
