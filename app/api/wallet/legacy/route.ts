// app/api/wallet/legacy/route.ts

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import archiver from "archiver";

// Type definitions
interface WalletPassRequest {
  serialNumber: string;
  legacyAmount: number;
  legacyAmountDisplay: string;
  legacyType: string;
  withdrawalRate: number;
  successProbability: number;
  withdrawalRateDisplay: string;
  successProbabilityDisplay: string;
  explanationText: string;
  barcodeMessage: string;
}

/**
 * Simple template substitution helper
 * Replaces {{key}} placeholders with values from data object
 */
function applyTemplate(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, "g"), value);
  }
  return result;
}

/**
 * Compute SHA-1 hash of a file
 */
async function computeFileHash(filePath: string): Promise<string> {
  const fileBuffer = await fs.promises.readFile(filePath);
  const hashSum = crypto.createHash("sha1");
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
}

/**
 * Build manifest.json by computing SHA-1 hashes of all files in directory
 * Excludes manifest.json and signature files
 */
async function buildManifest(dir: string): Promise<Record<string, string>> {
  const manifest: Record<string, string> = {};
  const files = await fs.promises.readdir(dir);

  for (const file of files) {
    // Skip manifest and signature files
    if (file === "manifest.json" || file === "signature") {
      continue;
    }

    const filePath = path.join(dir, file);
    const stats = await fs.promises.stat(filePath);

    if (stats.isFile()) {
      const hash = await computeFileHash(filePath);
      manifest[file] = hash;
    }
  }

  return manifest;
}

/**
 * Placeholder signing function
 * TODO: IMPLEMENT SIGNING USING APPLE PASS TYPE CERTIFICATE
 *
 * Real implementation will:
 * 1. Load your Apple Pass Type certificate (.p12 or .pem + key)
 * 2. Load Apple WWDR certificate
 * 3. Sign the manifest.json using PKCS#7 detached signature
 * 4. Write the signature to the output path
 *
 * For now, this creates an empty file so the zip structure is valid
 */
async function signManifest(
  manifestPath: string,
  outputPath: string
): Promise<void> {
  // TODO: REPLACE THIS WITH REAL SIGNING LOGIC
  // Example using Node crypto or openssl command:
  //
  // const { execSync } = require('child_process');
  // execSync(`openssl smime -binary -sign \\
  //   -certfile AppleWWDRCA.pem \\
  //   -signer passcertificate.pem \\
  //   -inkey passkey.pem \\
  //   -in ${manifestPath} \\
  //   -out ${outputPath} \\
  //   -outform DER`);
  //
  // For debugging/development, write empty signature:
  await fs.promises.writeFile(outputPath, Buffer.alloc(0));
  console.warn(
    "⚠️  WARNING: Using empty signature file. Real Apple certificate signing required for production."
  );
}

/**
 * Create a .pkpass archive (ZIP format) from a directory
 */
async function createPkPassArchive(tempDir: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Maximum compression
    });

    archive.on("data", (chunk) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", (err) => reject(err));

    // Add all files from temp directory to archive
    // PassKit requires files at root level, no subdirectories
    archive.directory(tempDir, false);
    archive.finalize();
  });
}

/**
 * Copy a file from source to destination
 */
async function copyFile(src: string, dest: string): Promise<void> {
  await fs.promises.copyFile(src, dest);
}

/**
 * POST /api/wallet/legacy
 * Generates an Apple Wallet pass for the legacy calculation result
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validate request body
    const requestData: WalletPassRequest = await request.json();
    if (
      !requestData.serialNumber ||
      !requestData.legacyAmountDisplay ||
      !requestData.legacyType
    ) {
      return NextResponse.json(
        { error: "Missing required fields in request body" },
        { status: 400 }
      );
    }

    console.log(`Generating pass for serial: ${requestData.serialNumber}`);

    // 2. Load pass.json template
    const templatePath = path.join(process.cwd(), "wallet/template/pass.json");
    const templateContent = await fs.promises.readFile(templatePath, "utf-8");

    // 3. Substitute placeholders
    const substitutedPass = applyTemplate(templateContent, {
      serialNumber: requestData.serialNumber,
      legacyAmountDisplay: requestData.legacyAmountDisplay,
      legacyType: requestData.legacyType,
      withdrawalRateDisplay: requestData.withdrawalRateDisplay,
      successProbabilityDisplay: requestData.successProbabilityDisplay,
      explanationText: requestData.explanationText,
      barcodeMessage: requestData.barcodeMessage,
    });

    // 4. Create temporary working directory
    const tempDir = path.join(
      process.cwd(),
      "tmp",
      `pass-${requestData.serialNumber}`
    );
    await fs.promises.mkdir(tempDir, { recursive: true });

    try {
      // 5. Copy static assets to temp directory
      const templateDir = path.join(process.cwd(), "wallet/template");
      const assetFiles = [
        "icon.png",
        "icon@2x.png",
        "logo.png",
        "background.png",
      ];

      for (const asset of assetFiles) {
        const srcPath = path.join(templateDir, asset);
        const destPath = path.join(tempDir, asset);

        // Only copy if file exists (background.png is optional)
        if (fs.existsSync(srcPath)) {
          await copyFile(srcPath, destPath);
        }
      }

      // Write substituted pass.json
      const passJsonPath = path.join(tempDir, "pass.json");
      await fs.promises.writeFile(passJsonPath, substitutedPass, "utf-8");

      // 6. Generate manifest.json
      const manifest = await buildManifest(tempDir);
      const manifestPath = path.join(tempDir, "manifest.json");
      await fs.promises.writeFile(
        manifestPath,
        JSON.stringify(manifest, null, 2),
        "utf-8"
      );

      // 7. Sign the manifest (placeholder implementation)
      const signaturePath = path.join(tempDir, "signature");
      await signManifest(manifestPath, signaturePath);

      // 8. Create .pkpass archive
      const pkpassBuffer = await createPkPassArchive(tempDir);

      console.log(`✓ Pass generated successfully: ${requestData.serialNumber}`);

      // 9. Send response
      return new NextResponse(pkpassBuffer, {
        headers: {
          "Content-Type": "application/vnd.apple.pkpass",
          "Content-Disposition": `attachment; filename=LegacyCard-${requestData.serialNumber}.pkpass`,
        },
      });
    } finally {
      // Cleanup: Remove temporary directory
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error("Error generating wallet pass:", error);
    return NextResponse.json(
      {
        error: "Failed to generate wallet pass",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
