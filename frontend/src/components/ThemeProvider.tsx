"use client";

import { useEffect } from "react";
import { useMissionStore } from "@/lib/store";

/** Syncs the zustand theme to `data-theme` on <html> for every route. */
export function ThemeProvider() {
  const theme = useMissionStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return null;
}
