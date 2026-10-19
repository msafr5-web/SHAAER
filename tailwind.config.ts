import type { Config } from "tailwindcss";

// كل لون يُقرأ من قنوات RGB في globals.css، فلا قيمة Hex هنا.
const scale = (name: string, steps: number[]) =>
  Object.fromEntries(steps.map((s) => [s, `rgb(var(--${name}-${s}) / <alpha-value>)`]));

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        green: scale("green", STEPS),
        gold: scale("gold", STEPS),
        ink: scale("ink", STEPS),
        sand: scale("sand", [50, 100, 200]),
        line: "rgb(var(--line) / <alpha-value>)",
        success: scale("success", [50, 100, 700]),
        warning: scale("warning", [50, 100, 700]),
        danger: scale("danger", [50, 100, 700]),
        info: scale("info", [50, 100, 700]),
      },
      fontFamily: {
        sans: ["var(--font-arabic)", "Tahoma", "sans-serif"],
      },
      borderRadius: { xl: "0.875rem" },
    },
  },
  plugins: [],
};

export default config;
