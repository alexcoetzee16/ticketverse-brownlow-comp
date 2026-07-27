/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Ticketverse purple base (matches Punt Club)
        tv: {
          bg: "#160B24",        // near-black purple, base background
          surface: "#211235",   // card surface
          surface2: "#2C1846",  // raised surface / hover
          border: "#3D2560",
          purple: "#7C3AED",    // primary brand purple
          purpleLight: "#A78BFA",
          gold: "#F2B705",      // Brownlow medal gold accent
          text: "#F4F0FB",
          muted: "#B9A8D6",
        },
      },
      fontFamily: {
        display: ["Anton", "Oswald", "sans-serif"], // AFL scoreboard-style condensed display
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"], // for vote tallies / pick numbers
      },
      backgroundImage: {
        "field-lines": "repeating-linear-gradient(90deg, transparent, transparent 79px, rgba(242,183,5,0.06) 79px, rgba(242,183,5,0.06) 80px)",
      },
    },
  },
  plugins: [],
};
