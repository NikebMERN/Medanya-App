import { useState, useEffect } from "react";

/**
 * Returns a debounced value that updates only after the input has been stable for `delay` ms.
 * Use for search: type "Heni" → only one request fires 300ms after the last keystroke.
 * Avoids per-keystroke requests, server strain, and race conditions.
 */
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
