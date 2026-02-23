/**
 * Document types for KYC identity verification.
 * uploadType: "single" = front only (passport), "dual" = front + back (ID cards)
 */
export const KYC_DOC_TYPES = [
  {
    value: "passport",
    label: "Passport",
    icon: "confirmation-number",
    placeholder: "e.g. A12345678",
    hint: "Enter the passport number from the document.",
    uploadType: "single",
    uploadLabel: "Upload passport photo page",
  },
  {
    value: "fayda",
    label: "Fayda eID",
    icon: "badge",
    placeholder: "e.g. 784123456789",
    hint: "Enter the 12-digit FIN from the back of your Fayda eID card. Must match the number on the document.",
    uploadType: "dual",
    uploadLabel: "Front of Fayda card",
    uploadLabelBack: "Back of Fayda card (FIN is printed here)",
  },
  {
    value: "emirates_id",
    backendValue: "resident_id",
    label: "Emirates ID",
    icon: "credit-card",
    placeholder: "Emirates ID number",
    hint: "Enter the Emirates ID number from the card.",
    uploadType: "dual",
    uploadLabel: "Front of Emirates ID",
    uploadLabelBack: "Back of Emirates ID",
  },
  {
    value: "resident_id",
    label: "Resident / Work permit",
    icon: "work",
    placeholder: "Resident permit number",
    hint: "Enter the resident or work permit number.",
    uploadType: "dual",
    uploadLabel: "Front of permit",
    uploadLabelBack: "Back of permit",
  },
  {
    value: "national_id",
    backendValue: "other",
    label: "National ID card",
    icon: "contact-card",
    placeholder: "National ID number",
    hint: "Enter the ID number from your national ID.",
    uploadType: "dual",
    uploadLabel: "Front of ID",
    uploadLabelBack: "Back of ID",
  },
  {
    value: "driving_license",
    backendValue: "other",
    label: "Driving license",
    icon: "directions-car",
    placeholder: "License number",
    hint: "Enter your driving license number.",
    uploadType: "dual",
    uploadLabel: "Front of license",
    uploadLabelBack: "Back of license",
  },
  {
    value: "other",
    label: "Other government ID",
    icon: "description",
    placeholder: "Document number",
    hint: "Enter the document number as shown.",
    uploadType: "dual",
    uploadLabel: "Front of document",
    uploadLabelBack: "Back of document (if any)",
  },
];

export const DEFAULT_DOC_TYPE = KYC_DOC_TYPES[0];

/** Fayda FIN: exactly 12 digits (with or without separators like dashes). */
export function normalizeFaydaFin(value) {
  if (!value || typeof value !== "string") return "";
  return value.replace(/\D/g, "");
}

export function isValidFaydaFin(value) {
  const digits = normalizeFaydaFin(value);
  return digits.length === 12 && /^\d{12}$/.test(digits);
}
