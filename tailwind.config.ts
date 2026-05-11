import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0a1f44',
          deep: '#050f24',
          soft: '#14305c',
        },
        gold: {
          DEFAULT: '#c9a44b',
          light: '#e3c47a',
        },
        offwhite: {
          DEFAULT: '#f5f1e6',
          dim: '#d9d3c2',
        },
        ink: '#11141b',
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont',
          '"Hiragino Sans"', '"Hiragino Kaku Gothic ProN"',
          '"Noto Sans JP"', '"Yu Gothic"', '"Meiryo"',
          'system-ui', 'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
