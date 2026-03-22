import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "#F77F00",
        "accent-soft": "#FFF3E0",
        success: "#27AE60",
        danger: "#E74C3C",
        warning: "#F39C12",
        tg: {
          bg: "var(--tg-bg-color)",
          text: "var(--tg-text-color)",
          hint: "var(--tg-hint-color)",
          link: "var(--tg-link-color)",
          button: "var(--tg-button-color)",
          "button-text": "var(--tg-button-text-color)",
          "secondary-bg": "var(--tg-secondary-bg)",
        },
      },
      fontFamily: {
        heading: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        card: "16px",
      },
      boxShadow: {
        card: "0 2px 12px rgba(0,0,0,0.08)",
      },
      animation: {
        "slide-up": "slideUp 0.25s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        "skeleton": "skeleton 1.5s ease-in-out infinite",
      },
      keyframes: {
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        skeleton: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
