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
        border: withOpacity("--border"),
        foreground: withOpacity("--foreground"),
        muted: withOpacity("--muted"),
        accent: withOpacity("--accent"),
        positive: withOpacity("--positive"),
        negative: withOpacity("--negative"),
        warning: withOpacity("--warning")
      },
      borderRadius: { xl2: "1rem" },
      boxShadow: { premium: "0 18px 50px -20px rgba(0,0,0,0.55)" },
      maxWidth: { content: "80rem" }
    }
  },
  plugins: []
};

export default config;
