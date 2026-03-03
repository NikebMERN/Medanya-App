/**
 * Camera provider abstraction. Swappable for expo-camera or react-native-vision-camera.
 * Interface: start(), stop(), flip(), setFlash(), setZoom(), setFilter()
 */
import { CameraView } from "expo-camera";

const DEFAULT_OPTIONS = {
  facing: "back",
  flash: "off",
  zoom: 1,
  filterId: "none",
};

let _currentFacing = DEFAULT_OPTIONS.facing;
let _currentFlash = DEFAULT_OPTIONS.flash;
let _currentZoom = DEFAULT_OPTIONS.zoom;
let _currentFilter = DEFAULT_OPTIONS.filterId;

export function getCameraProvider() {
  return {
    getFacing: () => _currentFacing,
    getFlash: () => _currentFlash,
    getZoom: () => _currentZoom,
    getFilter: () => _currentFilter,

    flip: () => {
      _currentFacing = _currentFacing === "back" ? "front" : "back";
      return _currentFacing;
    },

    setFlash: (mode) => {
      _currentFlash = ["off", "on", "auto"].includes(mode) ? mode : "off";
      return _currentFlash;
    },

    setZoom: (value) => {
      _currentZoom = Math.max(0.5, Math.min(4, value));
      return _currentZoom;
    },

    setFilter: (filterId) => {
      _currentFilter = filterId || "none";
      return _currentFilter;
    },

    reset: () => {
      _currentFacing = DEFAULT_OPTIONS.facing;
      _currentFlash = DEFAULT_OPTIONS.flash;
      _currentZoom = DEFAULT_OPTIONS.zoom;
      _currentFilter = DEFAULT_OPTIONS.filterId;
    },
  };
}

export { CameraView };
