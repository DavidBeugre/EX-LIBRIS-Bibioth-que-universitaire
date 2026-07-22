/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1B2A4A",
        "ink-muted": "#5C6B84",
        "ink-faint": "#8B96A8",
        paper: "#FAF6EC",
        moss: "#3F6B4F",
        "moss-bg": "#E8EFE8",
        brass: "#AD7E2C",
        "brass-bg": "#F4EBD8",
        buckram: "#A5433A",
        "buckram-bg": "#F5E5E2",
        border: "#E6DFC9",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
