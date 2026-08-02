import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

export default defineConfig({
  plugins: [uni()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/v1": {
        target: "https://api.deepseek.com",
        changeOrigin: true,
      },
    },
  },
});
