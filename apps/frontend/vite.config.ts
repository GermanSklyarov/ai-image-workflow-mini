import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/runs": "http://localhost:3001",
      "/presets": "http://localhost:3001",
      "/generated": "http://localhost:3001",
    },
  },
});
