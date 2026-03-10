/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./app/components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#030810",
          900: "#050d1c",
          850: "#071020",
          800: "#0a1525",
          750: "#0c1a2e",
          700: "#0e1e35",
          600: "#112440",
          500: "#1a304e",
          400: "#1e3d60",
          300: "#2a5080",
          200: "#3d6ea0",
          100: "#5a8dbf",
        },
      },
      fontFamily: {
        heading: ["var(--font-montserrat)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "ping-soft": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "70%": { transform: "scale(1.8)", opacity: "0" },
          "100%": { transform: "scale(1.8)", opacity: "0" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "ping-soft": "ping-soft 2.5s cubic-bezier(0, 0, 0.2, 1) infinite",
        "slide-up": "slide-up 0.3s ease-out",
        "fade-in": "fade-in 0.25s ease-out",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};
