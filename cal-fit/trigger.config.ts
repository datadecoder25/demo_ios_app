import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "proj_mmlyhkydzkleouenbvrb",
  dirs: ["./src/trigger"],
  // Meal analysis normally finishes in 5-10s; cap runaway runs at 5 minutes.
  maxDuration: 300,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
});
