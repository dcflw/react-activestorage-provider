import { defineConfig } from "vitest/config";

const mockCsrfToken = "value from vitest.config.ts";

export default defineConfig({
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        html: `<html><head><meta name="csrf-token" content=${JSON.stringify(mockCsrfToken)}></head><body></body></html>`,
      },
    },
  },
});
