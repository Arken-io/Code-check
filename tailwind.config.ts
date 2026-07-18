import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: "#0A0A0C",
          soft: "#111114",
        },
        surface: {
          DEFAULT: "#141417",
          raised: "#1A1A1F",
        },
        border: {
          DEFAULT: "#232328",
          soft: "#1C1C21",
        },
        ink: {
          DEFAULT: "#F5F5F7",
          muted: "#9A9AA3",
          faint: "#7A7A84",
        },
        accent: {
          DEFAULT: "#3B82F6",
          soft: "#60A5FA",
          dim: "#1D4ED8",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        xl2: "1rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.02)",
        glow: "0 0 0 1px rgba(59,130,246,0.15), 0 8px 30px -8px rgba(59,130,246,0.25)",
        "glow-sm": "0 0 0 1px rgba(59,130,246,0.12), 0 6px 18px -8px rgba(59,130,246,0.2)",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(59,130,246,0.15), transparent)",
      },
    },
  },
  plugins: [],
};

export default config;
