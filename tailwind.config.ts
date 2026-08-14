import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        rosa: "#E4127B",
        "rosa-profundo": "#A6157A",
        roxo: "#6E1E8C",
        navy: "#131B33",
        dourado: "#C9972E",
        creme: "#FFF6FA",
        vermelho: "#E11D2E",
        texto: "#23142A",
        cinza: "#7A6C7F",
      },
      fontFamily: {
        serif: ["Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
