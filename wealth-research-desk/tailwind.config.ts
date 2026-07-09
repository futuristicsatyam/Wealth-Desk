import type { Config } from "tailwindcss";

const withOpacity = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: withOpacity("--background"),
        surface: withOpacity("--surface"),
        card: withOpacity("--card"),
        elevated: withOpacity("--elevated"),
        border: withOpacity("--border"),
        "border-strong": withOpacity("--border-strong"),
        foreground: withOpacity("--foreground"),
        muted: withOpacity("--muted"),
        accent: withOpacity("--accent"),
        "accent-strong": withOpacity("--accent-strong"),
        positive: withOpacity("--positive"),
        negative: withOpacity("--negative"),
        warning: withOpacity("--warning"),
        ring: withOpacity("--ring")
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      borderRadius: {
        xl2: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem"
      },
      boxShadow: {
        premium: "0 18px 50px -20px rgba(0,0,0,0.55)",
        card: "0 1px 0 0 rgb(255 255 255 / 0.03) inset, 0 12px 32px -18px rgba(0,0,0,0.6)",
        "glow-accent": "0 0 0 1px rgb(var(--accent) / 0.35), 0 8px 30px -8px rgb(var(--accent) / 0.45)",
        "glow-sm": "0 0 20px -6px rgb(var(--accent) / 0.5)"
      },
      maxWidth: { content: "80rem" },
      // Enables `z-1` / `-z-1` (used by DottedSurface); Tailwind's default
      // z-scale jumps 0 → 10, so `-z-1` would otherwise emit no CSS.
      zIndex: { 1: "1" },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" }
        }
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 0.4s ease-out both",
        shimmer: "shimmer 1.4s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
