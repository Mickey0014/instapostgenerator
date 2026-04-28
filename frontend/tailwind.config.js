/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07111f",
        paper: "#f8f4ec",
        coral: "#ff7a59",
        sky: "#8dd5ff",
        gold: "#ffcb77",
        slate: "#8a98ad"
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Newsreader", "serif"],
        accent: ["Inter", "sans-serif"]
      },
      boxShadow: {
        panel: "0 22px 60px rgba(5, 12, 24, 0.18)"
      }
    }
  },
  plugins: []
};
