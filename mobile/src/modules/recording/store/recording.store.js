import { create } from "zustand";

const DURATION_MODES = [
  { id: "15s", label: "15s", maxSec: 15 },
  { id: "60s", label: "60s", maxSec: 60 },
  { id: "3m", label: "3m", maxSec: 180 },
  { id: "10m", label: "10m", maxSec: 600 },
  { id: "15m", label: "15m", maxSec: 900 },
];
const MAX_TOTAL_MS = 15 * 60 * 1000;

export { DURATION_MODES };

export const useRecordingStore = create((set, get) => ({
  durationMode: "60s",
  maxSegmentSec: 60,
  maxTotalMs: MAX_TOTAL_MS,
  recordedSegments: [],
  activeFilterId: "none",
  beautyLevel: 0,
  speedRate: 1,
  timerDelay: 0,
  isRecording: false,
  elapsedMs: 0,
  segmentElapsedMs: 0,

  setDurationMode: (modeId) => {
    const m = DURATION_MODES.find((d) => d.id === modeId) || DURATION_MODES[1];
    set({ durationMode: m.id, maxSegmentSec: m.maxSec });
  },

  addSegment: (uri, durationMs) =>
    set((s) => {
      const segments = [...(s.recordedSegments || []), { uri, durationMs }];
      const total = segments.reduce((sum, sg) => sum + sg.durationMs, 0);
      return { recordedSegments: segments, elapsedMs: total, segmentElapsedMs: 0 };
    }),

  removeLastSegment: () =>
    set((s) => {
      const segments = (s.recordedSegments || []).slice(0, -1);
      const total = segments.reduce((sum, sg) => sum + sg.durationMs, 0);
      return { recordedSegments: segments, elapsedMs: total };
    }),

  setFilter: (filterId) => set({ activeFilterId: filterId || "none" }),
  setBeauty: (level) => set({ beautyLevel: Math.max(0, Math.min(100, level)) }),
  setSpeed: (rate) => set({ speedRate: rate }),
  setTimerDelay: (sec) => set({ timerDelay: sec }),

  setRecording: (recording) => set({ isRecording: !!recording }),
  setSegmentElapsed: (ms) => set({ segmentElapsedMs: ms }),

  getTotalElapsedMs: () =>
    (get().recordedSegments || []).reduce((sum, s) => sum + s.durationMs, 0) + get().segmentElapsedMs,

  canRecordMore: () => get().getTotalElapsedMs() < get().maxTotalMs,

  clearRecording: () =>
    set({ recordedSegments: [], elapsedMs: 0, segmentElapsedMs: 0, isRecording: false }),

  reset: () =>
    set({
      durationMode: "60s",
      maxSegmentSec: 60,
      recordedSegments: [],
      activeFilterId: "none",
      beautyLevel: 0,
      speedRate: 1,
      timerDelay: 0,
      isRecording: false,
      elapsedMs: 0,
      segmentElapsedMs: 0,
    }),
}));
