#!/usr/bin/env npx tsx

/**
 * Build script for Monte Carlo Web Worker
 *
 * This script bundles the worker source file (lib/calculations/worker/monte-carlo-worker.ts)
 * into a standalone JavaScript file that can be loaded by the browser.
 *
 * The worker imports from the shared calculation module, which gets bundled into
 * the final output, ensuring a single source of truth for calculation logic.
 *
 * Usage:
 *   npx tsx scripts/build-worker.ts
 *
 * Output:
 *   public/monte-carlo-worker.js
 */

import { build } from "esbuild";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

async function buildWorker() {
  console.log("Building Monte Carlo worker...");

  try {
    await build({
      entryPoints: [resolve(projectRoot, "lib/calculations/worker/monte-carlo-worker.ts")],
      bundle: true,
      outfile: resolve(projectRoot, "public/monte-carlo-worker.js"),
      format: "iife", // Immediately Invoked Function Expression - suitable for workers
      target: ["es2020"],
      platform: "browser",
      minify: false, // Keep readable for debugging; set to true for production
      sourcemap: false,
      // Resolve @ alias to lib directory
      alias: {
        "@": projectRoot,
      },
      // Don't include Node.js built-ins
      external: [],
      // Define build-time constants if needed
      define: {
        "process.env.NODE_ENV": '"production"',
      },
      // Log level
      logLevel: "info",
    });

    console.log("Worker built successfully: public/monte-carlo-worker.js");
  } catch (error) {
    console.error("Worker build failed:", error);
    process.exit(1);
  }
}

buildWorker();
