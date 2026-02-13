#!/usr/bin/env npx tsx

/**
 * Build script for Web Workers
 *
 * This script bundles:
 * 1. Monte Carlo Web Worker (lib/calculations/worker/monte-carlo-worker.ts)
 * 2. Service Worker (lib/service-worker.ts)
 *
 * Usage:
 *   npx tsx scripts/build-worker.ts
 *
 * Output:
 *   public/monte-carlo-worker.js
 *   public/sw.js
 */

import { build } from "esbuild";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

async function buildMonteCarloWorker() {
  console.log("Building Monte Carlo worker...");

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

  console.log("Monte Carlo worker built: public/monte-carlo-worker.js");
}

async function buildServiceWorker() {
  console.log("Building Service Worker...");

  await build({
    entryPoints: [resolve(projectRoot, "lib/service-worker.ts")],
    bundle: true,
    outfile: resolve(projectRoot, "public/sw.js"),
    format: "iife",
    target: ["es2020"],
    platform: "browser",
    minify: false, // Keep readable for debugging
    sourcemap: false,
    alias: {
      "@": projectRoot,
    },
    external: [],
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    logLevel: "info",
  });

  console.log("Service Worker built: public/sw.js");
}

async function buildAllWorkers() {
  try {
    await Promise.all([
      buildMonteCarloWorker(),
      buildServiceWorker(),
    ]);

    console.log("\nAll workers built successfully!");
  } catch (error) {
    console.error("Worker build failed:", error);
    process.exit(1);
  }
}

buildAllWorkers();
