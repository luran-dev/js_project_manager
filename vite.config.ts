import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { handleApiRequest } from "./server/index.mjs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "projectvibe-api",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          const requestUrl = Reflect.get(request, "url");
          if (typeof requestUrl !== "string" || !requestUrl.startsWith("/api")) {
            next();
            return;
          }
          void handleApiRequest(request, response);
        });
      },
    },
  ],
});
