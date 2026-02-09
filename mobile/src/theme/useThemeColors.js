import { useMemo } from "react";
import { useThemeStore } from "../store/theme.store";
import { getColors } from "./colors";

export function useThemeColors() {
  const theme = useThemeStore((s) => s.theme);
  return useMemo(() => getColors(theme), [theme]);
}
