import type { Config } from "tailwindcss";

const config = {
  theme: {
    extend: {
      colors: {
        "ce-night": "#080b12",
        "ce-panel": "rgba(13, 18, 30, 0.84)",
        "ce-blue": "#38bdf8",
        "ce-yellow": "#facc15",
        "ce-text": "#f7f8fb",
        "ce-muted": "#9ba8bd",
      },
    },
  },
} satisfies Config;

export default config;
