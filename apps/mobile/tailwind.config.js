/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#f8fafc",
        foreground: "#0f172a",
        muted: "#64748b",
        border: "#e2e8f0",
        card: "#ffffff",
        primary: "#2563eb",
        destructive: "#dc2626",
      },
    },
  },
  darkMode: "class",
};
