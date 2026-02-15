/**
 * KYC identity verification API.
 */
import client from "./client";

export const KYC_DOC_TYPES = [
  { value: "passport", label: "Passport", placeholder: "Passport number (e.g. A12345678)", hint: "Enter the passport number from the document." },
  { value: "fayda", label: "Fayda eID", placeholder: "FIN (e.g. 784-XXXX-XXXXXXX-X)", hint: "Enter the 15-digit FIN from your Fayda eID card." },
  { value: "resident_id", label: "Resident / Work ID", placeholder: "Emirates ID number", hint: "Enter the Emirates ID or resident permit number." },
  { value: "other", label: "Other government ID", placeholder: "ID number from document", hint: "Enter the document number as shown." },
];

export async function submitKyc(body) {
  const { data } = await client.post("/kyc/submit", {
    docType: body.docType,
    docNumber: body.docNumber || undefined,
    frontImageUrl: body.frontImageUrl,
    backImageUrl: body.backImageUrl || undefined,
    selfieImageUrl: body.selfieImageUrl || undefined,
    consent: !!body.consent,
  });
  return data;
}

export async function getKycStatus() {
  const { data } = await client.get("/kyc/status");
  return data;
}
