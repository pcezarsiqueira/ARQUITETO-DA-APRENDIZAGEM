import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:3000",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  webServer: {
    command: "npm start",
    // Never spend real API credits in automated browser tests.
    env: {
      AI_PROVIDER_API_KEY: "",
      OPENAI_API_KEY: "",
      DIAGNOSIS_ACCESS_TOKEN: "",
      PEDAGOGICAL_REVIEW_ENABLED: "false",
      PEDAGOGICAL_REVIEW_ACCESS_TOKEN: "",
    },
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
  ],
});
