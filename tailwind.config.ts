import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        midnight: {
          950: "#07090e",
          900: "#0b0f19",
          850: "#101624",
          800: "#151d30",
          700: "#1d2844",
          600: "#2a395e",
        },
        studio: {
          violet: "#8b5cf6",
          blue: "#3b82f6",
          cyan: "#06b6d4",
          accent: "#6366f1",
          card: "rgba(16, 22, 36, 0.75)",
          border: "rgba(255, 255, 255, 0.08)",
        },
        charcoal: {
          950: "#0b090e",
          900: "#120f17",
          850: "#18141f",
          800: "#1e1a27",
          700: "#2a2536",
          600: "#3d364e",
          500: "#554c6b",
        },
        plum: {
          950: "#120718",
          900: "#1c0c25",
          850: "#261033",
          800: "#331644",
          700: "#482060",
          600: "#602c80",
          500: "#7c3ca3",
          400: "#9953c4",
          300: "#b775df",
        },
        lavender: {
          500: "#8a68a8",
          400: "#a58bbd",
          300: "#c4b0d7",
          200: "#dfd2ed",
          100: "#f0e9f8",
          50: "#faf7fd",
        },
        champagne: {
          600: "#c2913a",
          500: "#d9a74a",
          400: "#e8c475",
          300: "#f3d99d",
          200: "#f9ebd0",
          100: "#fdf6ea",
          50: "#fffdfa",
        },
        cream: {
          900: "#2a241e",
          800: "#4a4137",
          700: "#706456",
          300: "#ded4c1",
          200: "#ebe4d8",
          100: "#f7f3eb",
          50: "#fdfbf7",
        },
      },
      fontFamily: {
        sans: ["Inter", "Geist", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "wave-bar": "wave 1.2s ease-in-out infinite",
      },
      keyframes: {
        wave: {
          "0%, 100%": { transform: "scaleY(0.4)" },
          "50%": { transform: "scaleY(1)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;

