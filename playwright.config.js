import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test",
  webServer: {
    command: "node server.cjs",
    port: 3000,
    reuseExistingServer: true,
  },
  use: {
    baseURL: "http://localhost:3000",
  },
});
