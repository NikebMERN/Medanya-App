/**
 * Age utilities for gating features.
 * Jobs: 18+
 * Marketplace, Video, Live stream: 16+
 */

export function ageFromDob(dob) {
  if (!dob || typeof dob !== "string") return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age;
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
