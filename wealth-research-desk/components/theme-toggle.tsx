"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="Toggle colour theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface text-muted hover:text-foreground"
    >
      {mounted ? (isDark ? <Sun size={18} /> : <Moon size={18} />) : <Sun size={18} />}
    </button>
  );
}
