import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#23301D",
        canvas: "#F4EEDF",
        base: "#E8E1CC",
        moss: {
          DEFAULT: "#3F6B3D",
          deep: "#233B23",
          light: "#6E9A5B",
        },
        brass: {
          DEFAULT: "#B8862E",
          light: "#D9AE5C",
        },
        clay: "#A6472F",
        rain: "#3E6E85",
        stake: "#7A5A3A",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-worksans)", "sans-serif"],
        mono: ["var(--font-plexmono)", "monospace"],
      },
      backgroundImage: {
        paper: "radial-gradient(circle at 1px 1px, rgba(35,48,29,0.06) 1px, transparent 0)",
      },
      boxShadow: {
        card: "0 2px 0 rgba(35,48,29,0.08), 0 12px 24px -14px rgba(35,48,29,0.35)",
        stitch: "inset 0 0 0 1.5px rgba(35,48,29,0.12)",
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};
export default config;
