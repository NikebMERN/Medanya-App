/**
 * Age utilities for gating features.
 * Jobs: 18+
 * Marketplace, Video, Live stream: 16+
 */

export function ageFromDob(dob) {
  if (dob == null || dob === "") return null;
  const d = dob instanceof Date ? dob : new Date(dob);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age;
}

/** Get DOB from user object (handles snake_case, camelCase, Date, string). */
export function getDobFromUser(user) {
  if (!user) return null;
  const val = user.dob ?? user.dateOfBirth ?? user.birthdate ?? null;
  if (val == null || val === "") return null;
  return val instanceof Date ? val : String(val).trim() || null;
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
