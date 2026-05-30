/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        bg: "#FDFBF7",
        primary: { DEFAULT: "#9D8DF1", hover: "#8A79E8", light: "#D8D2FA", dark: "#7A6AC6" },
        sage: { DEFAULT: "#86A789", hover: "#749677", light: "#CDE0CF", dark: "#6A8A6D" },
        gold: { DEFAULT: "#F4C753", dark: "#DDAE3B" },
        fire: { DEFAULT: "#FF9F68", dark: "#E8814B" },
        earth: { DEFAULT: "#D4A373", dark: "#B07F4F" },
        ink: { DEFAULT: "#4A4A4A", muted: "#888888" },
        danger: "#FF7B7B",
      },
      fontFamily: {
        heading: ["Fredoka", "system-ui", "sans-serif"],
        body: ["Nunito", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "32px",
      },
      boxShadow: {
        "btn-primary": "0 6px 0 #7A6AC6",
        "btn-sage": "0 6px 0 #6A8A6D",
        "btn-gold": "0 6px 0 #DDAE3B",
      },
      keyframes: {
        wiggle: {
          "0%,100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        bounceSoft: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        pulseGlow: {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(157,141,241,0.5)" },
          "50%": { boxShadow: "0 0 0 16px rgba(157,141,241,0)" },
        },
        floaty: {
          "0%,100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-10px) rotate(2deg)" },
        },
        shake: {
          "0%,100%": { transform: "translateX(0)" },
          "20%,60%": { transform: "translateX(-6px)" },
          "40%,80%": { transform: "translateX(6px)" },
        },
        popIn: {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "70%": { transform: "scale(1.1)", opacity: "1" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        wiggle: "wiggle 0.5s ease-in-out",
        bounceSoft: "bounceSoft 2s ease-in-out infinite",
        pulseGlow: "pulseGlow 2s ease-out infinite",
        floaty: "floaty 4s ease-in-out infinite",
        shake: "shake 0.4s ease-in-out",
        popIn: "popIn 0.45s cubic-bezier(.2,1.3,.4,1)",
      },
    },
  },
  plugins: [],
};
