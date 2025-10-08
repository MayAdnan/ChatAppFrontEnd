import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, "../certs/dev-key.pem")),
      cert: fs.readFileSync(path.resolve(__dirname, "../certs/dev-cert.pem")),
    },
    port: 5173,
  },
});
