/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: {
          950: "#020617",
          900: "#0f172a",
          800: "#1e293b",
          700: "#334155",
          600: "#475569",
          500: "#64748b",
        },
        indigo: {
          600: "#4f46e5",
          500: "#6366f1",
          400: "#818cf8",
        },
        emerald: {
          500: "#10b981",
          400: "#34d399",
        },
        rose: {
          500: "#f43f5e",
          400: "#fb7185",
        },
      },
    },
  },
  plugins: [],
}
