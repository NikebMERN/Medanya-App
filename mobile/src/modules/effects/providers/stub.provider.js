/**
 * Stub effects provider — UI placeholders, no real-time effects.
 * Replace with DeepAR/Banuba provider when SDK integrated.
 */
export function getStubProvider() {
  return {
    setBeauty(level) {
      return { applied: false, level, note: "Beauty requires Banuba/DeepAR SDK" };
    },
    setLut(filterId) {
      return { applied: false, filterId, note: "LUT applied post-process or via VisionCamera" };
    },
    setArEffect(effectId) {
      return { applied: false, effectId, note: "AR effects require DeepAR/Banuba" };
    },
    clearEffects() {
      return { applied: false };
    },
    isAvailable: () => false,
  };
}
