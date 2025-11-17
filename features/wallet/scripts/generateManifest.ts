// wallet/scripts/generateManifest.ts

import fs from "fs";
import path from "path";
import crypto from "crypto";

/**
 * Standalone script to generate manifest.json for debugging
 * Usage: npx tsx wallet/scripts/generateManifest.ts
 */

async function computeFileHash(filePath: string): Promise<string> {
  const fileBuffer = await fs.promises.readFile(filePath);
  const hashSum = crypto.createHash("sha1");
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
}

async function generateManifest() {
  const templateDir = path.join(__dirname, "../template");
  const manifest: Record<string, string> = {};

  try {
    const files = await fs.promises.readdir(templateDir);

    for (const file of files) {
      // Skip manifest and signature files, only hash actual assets
      if (file === "manifest.json" || file === "signature") {
        continue;
      }

      const filePath = path.join(templateDir, file);
      const stats = await fs.promises.stat(filePath);

      if (stats.isFile()) {
        const hash = await computeFileHash(filePath);
        manifest[file] = hash;
        console.log(`✓ ${file}: ${hash}`);
      }
    }

    console.log("\n📄 Generated manifest.json:\n");
    console.log(JSON.stringify(manifest, null, 2));
  } catch (error) {
    console.error("Error generating manifest:", error);
    process.exit(1);
  }
}

generateManifest();
