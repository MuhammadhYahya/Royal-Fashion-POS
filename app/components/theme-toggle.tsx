"use client";

import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { toggleTheme } = useTheme();

  return (
    <button className="btn btn-outline" onClick={toggleTheme} type="button">
      Toggle Theme
    </button>
  );
}
