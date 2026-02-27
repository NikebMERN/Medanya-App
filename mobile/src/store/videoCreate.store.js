/**
 * Video create flow: draft, segments, filters, upload state.
 * Used by VideoRecordScreen, VideoEditScreen, VideoPublishScreen.
 */
import { create } from "zustand";

const DEFAULT_FILTER = "none";
const FILTER_PRESETS = [
  { id: "none", label: "None" },
  { id: "warm", label: "Warm" },
  { id: "cool", label: "Cool" },
  { id: "vivid", label: "Vivid" },
  { id: "bw", label: "B&W" },
  { id: "cinematic", label: "Cinematic" },
];

export { FILTER_PRESETS };

export const useVideoCreateStore = create((set, get) => ({
  // Draft source: null | { uri, type: 'recorded'|'gallery', durationMs? }
  draftUri: null,
  draftType: null,
  draftDurationMs: 0,

  // Recorded segments (for multi-clip; MVP single segment)
  segments: [],

  // Edit state
  trimStartMs: 0,
  trimEndMs: null,
  selectedFilterId: DEFAULT_FILTER,
  coverFrameUri: null,
  coverTimeMs: 0,

  // Publish state
  caption: "",
  hashtags: [],
  privacy: "public",
  allowComments: true,
  locationText: "",

  // Upload state
  uploadProgress: 0,
  uploadStatus: "idle",
  uploadError: null,

  setDraft: (uri, type = "recorded", durationMs = 0) =>
    set({
      draftUri: uri,
      draftType: type,
      draftDurationMs: durationMs,
      trimEndMs: durationMs || null,
      segments: uri ? [{ uri, durationMs }] : [],
    }),

  addSegment: (uri, durationMs) =>
    set((s) => ({
      segments: [...(s.segments || []), { uri, durationMs }],
      draftDurationMs: (s.draftDurationMs || 0) + durationMs,
    })),

  setTrim: (startMs, endMs) =>
    set({ trimStartMs: startMs, trimEndMs: endMs }),

  setFilter: (filterId) =>
    set({ selectedFilterId: filterId || DEFAULT_FILTER }),

  setCover: (frameUri, timeMs) =>
    set({ coverFrameUri: frameUri, coverTimeMs: timeMs }),

  setCaption: (caption) => set({ caption: caption ?? "" }),
  setHashtags: (hashtags) => set({ hashtags: Array.isArray(hashtags) ? hashtags : [] }),
  setPrivacy: (privacy) => set({ privacy: privacy || "public" }),
  setAllowComments: (allow) => set({ allowComments: !!allow }),
  setLocationText: (text) => set({ locationText: text ?? "" }),

  setUploadProgress: (progress) => set({ uploadProgress: progress, uploadStatus: "uploading" }),
  setUploadStatus: (status, error = null) =>
    set({ uploadStatus: status || "idle", uploadError: error, uploadProgress: status === "done" ? 1 : get().uploadProgress }),

  clearDraft: () =>
    set({
      draftUri: null,
      draftType: null,
      draftDurationMs: 0,
      segments: [],
      trimStartMs: 0,
      trimEndMs: null,
      selectedFilterId: DEFAULT_FILTER,
      coverFrameUri: null,
      coverTimeMs: 0,
      caption: "",
      hashtags: [],
      privacy: "public",
      allowComments: true,
      locationText: "",
      uploadProgress: 0,
      uploadStatus: "idle",
      uploadError: null,
    }),
}));
