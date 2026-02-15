/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#2563eb", foreground: "#fff" },
        destructive: "#dc2626",
        muted: { DEFAULT: "#f1f5f9", foreground: "#64748b" },
        border: "#e2e8f0",
      },
    },
  },
  plugins: [],
};
