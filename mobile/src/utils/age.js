/**
 * Age utilities for gating features (KYC-verified users).
 * Jobs: 18+
 * Marketplace, Video, Live stream: 16+
 */

/**
 * Parse DOB value into a Date-friendly value for age calculation.
 * Handles: Date, timestamp number, year number (2000), "YYYY", "YYYY-MM-DD", etc.
 */
function normalizeDob(val) {
  if (val == null || val === "") return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === "number") {
    // Year as number (e.g. 2000) vs timestamp (e.g. 946684800000)
    if (val >= 1900 && val <= 2100) return `${val}-01-01`;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  const s = String(val).trim();
  if (!s) return null;
  // Year-only string (e.g. "2000") -> Jan 1 of that year
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;
  return s;
}

export function ageFromDob(dob) {
  const normalized = normalizeDob(dob);
  if (normalized == null) return null;
  const d = normalized instanceof Date ? normalized : new Date(normalized);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age;
}

/**
 * Get DOB from user object. Prefers KYC/Veriff-verified birth when available.
 * Also checks dob, date_of_birth, birthdate from Edit Profile (no face verification required).
 */
export function getDobFromUser(user) {
  if (!user) return null;
  const val =
    user.dob ??
    user.date_of_birth ??
    user.dateOfBirth ??
    user.birthdate ??
    user.kyc_dob ??
    user.veriff_dob ??
    user.veriff_birth_year ??
    null;
  if (val == null || val === "") return null;
  if (val instanceof Date) return val;
  if (typeof val === "number") return val;
  const s = String(val).trim();
  // Veriff may return year only (e.g. "1990") — normalize to YYYY-MM-DD
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;
  return s || null;
}

export function canPostJobs(dob) {
  const age = ageFromDob(dob);
  return age != null && age >= 18;
}

export function canUseMarketplace(dob) {
  const age = ageFromDob(dob);
  return age != null && age >= 16;
}

export function canPostVideo(dob) {
  const age = ageFromDob(dob);
  return age != null && age >= 16;
}

export function canLiveStream(dob) {
  const age = ageFromDob(dob);
  return age != null && age >= 16;
}

/** Host live: 16+ (same as viewing / posting video). */
export function canLiveStreamHost(dob) {
  const age = ageFromDob(dob);
  return age != null && age >= 16;
}
