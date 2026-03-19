/**
 * Global toast: show success/error/info without Alert.
 * showToast({ type: 'error'|'success'|'info', message, duration? })
 */
import { create } from "zustand";

const DEFAULT_DURATION = 4000;

export const useToastStore = create((set) => ({
  toast: null,

  showToast: (options) => {
    const opts = typeof options === "string" ? { message: options } : options || {};
    const type = opts.type || "info";
    const message = opts.message || "";
    const duration = opts.duration ?? DEFAULT_DURATION;
    set({ toast: { type, message, duration } });
  },

  hideToast: () => set({ toast: null }),

  success: (message, duration) =>
    set({ toast: { type: "success", message: message || "Done", duration: duration ?? DEFAULT_DURATION } }),

  error: (message, duration) =>
    set({ toast: { type: "error", message: message || "Something went wrong", duration: duration ?? 5000 } }),

  info: (message, duration) =>
    set({ toast: { type: "info", message: message || "", duration: duration ?? DEFAULT_DURATION } }),
}));
