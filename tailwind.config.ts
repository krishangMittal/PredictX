import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0f",
        foreground: "#e5e7eb",
        "surface": "#12121a",
        "surface-light": "#1a1a2e",
        "border-dim": "#1f1f35",
        "accent-green": "#00ff88",
        "accent-red": "#ff4444",
        "accent-blue": "#3b82f6",
        "text-muted": "#6b7280",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "flash-green": "flashGreen 0.5s ease-out",
        "flash-red": "flashRed 0.5s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        flashGreen: {
          "0%": { backgroundColor: "rgba(0, 255, 136, 0.2)" },
          "100%": { backgroundColor: "transparent" },
        },
        flashRed: {
          "0%": { backgroundColor: "rgba(255, 68, 68, 0.2)" },
          "100%": { backgroundColor: "transparent" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
