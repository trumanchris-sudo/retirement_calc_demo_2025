// app/api/wallet/legacy/route.ts

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import archiver from "archiver";
import os from "os";
import forge from "node-forge";

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
 * Sign the manifest.json using PKCS#7 detached signature (node-forge implementation)
 *
 * This creates a PKCS#7 signature compatible with Apple Wallet PassKit:
 * - Detached signature (manifest.json not included in signature file)
 * - SHA-1 digest algorithm (required by Apple)
 * - DER format output
 * - No authenticated attributes (equivalent to OpenSSL -noattr flag)
 * - Includes certificate chain (signer cert + Apple WWDR cert)
 */
async function signManifest(manifestPath: string, signatureOutputPath: string): Promise<void> {
  try {
    // 1. Read the manifest content
    const manifestBuffer = await fs.promises.readFile(manifestPath);

    // 2. Load certificates (Priority: Environment Variables -> Disk)
    let certPem: string;
    let keyPem: string;
    let wwdrPem: string;

    // Try environment variables first (recommended for production/serverless)
    if (
      process.env.WALLET_CERT_PEM &&
      process.env.WALLET_KEY_PEM &&
      process.env.WALLET_WWDR_PEM
    ) {
      console.log("✓ Using Apple Wallet certificates from environment variables");
      certPem = process.env.WALLET_CERT_PEM;
      keyPem = process.env.WALLET_KEY_PEM;
      wwdrPem = process.env.WALLET_WWDR_PEM;
    } else {
      // Fall back to reading from disk (local development)
      const certsPath = path.join(process.cwd(), "features/wallet/certs");
      const certPath = path.join(certsPath, "passcertificate.pem");
      const keyPath = path.join(certsPath, "passkey-unencrypted.pem");
      const wwdrPath = path.join(certsPath, "Apple_Wallet_CA_Chain.pem");

      console.log(`✓ Using Apple Wallet certificates from disk: ${certsPath}`);

      // Check if certificate files exist
      if (!fs.existsSync(certPath) || !fs.existsSync(keyPath) || !fs.existsSync(wwdrPath)) {
        throw new Error(
          "Apple Wallet certificates not found in environment variables or on disk. " +
          "Please set WALLET_CERT_PEM, WALLET_KEY_PEM, WALLET_WWDR_PEM environment variables " +
          "or see features/wallet/certs/README.md for setup instructions."
        );
      }

      // Load signing certificate and private key from disk
      certPem = await fs.promises.readFile(certPath, "utf8");
      keyPem = await fs.promises.readFile(keyPath, "utf8");
      wwdrPem = await fs.promises.readFile(wwdrPath, "utf8");
    }

    // 3. Parse certificates and key
    const certificate = forge.pki.certificateFromPem(certPem);
    const privateKey = forge.pki.privateKeyFromPem(keyPem);

    // Parse WWDR certificate(s) from the chain
    const wwdrCerts: forge.pki.Certificate[] = [];
    const wwdrPemBlocks = wwdrPem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g);
    if (wwdrPemBlocks) {
      wwdrPemBlocks.forEach(block => {
        wwdrCerts.push(forge.pki.certificateFromPem(block));
      });
    }

    // 4. Create PKCS#7 signed data
    const p7 = forge.pkcs7.createSignedData();

    // Set content to be signed (manifest.json)
    p7.content = forge.util.createBuffer(manifestBuffer.toString("binary"));

    // 5. Add signer with certificate and private key
    p7.addCertificate(certificate);

    // Add WWDR certificates to the chain
    wwdrCerts.forEach(cert => {
      p7.addCertificate(cert);
    });

    // Add signer configuration
    p7.addSigner({
      key: privateKey,
      certificate: certificate,
      digestAlgorithm: forge.pki.oids.sha1, // Apple requires SHA-1
      authenticatedAttributes: [] // No authenticated attributes (equivalent to -noattr)
    });

    // 6. Sign the data (detached mode)
    p7.sign({ detached: true });

    // 7. Convert to DER format
    const derBuffer = Buffer.from(
      forge.asn1.toDer(p7.toAsn1()).getBytes(),
      "binary"
    );

    // 8. Write signature file
    await fs.promises.writeFile(signatureOutputPath, derBuffer);

    console.log("✓ Manifest signed successfully using node-forge");
  } catch (error) {
    console.error("Error signing manifest with node-forge:", error);
    throw new Error(`Failed to sign manifest: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
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
    const templatePath = path.join(process.cwd(), "features/wallet/template/pass.json");

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Pass template not found at: ${templatePath}`);
    }

    console.log(`Loading pass template from: ${templatePath}`);
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

    // 4. Create temporary working directory (serverless-safe)
    const tempRoot = os.tmpdir(); // typically /tmp on Vercel/AWS Lambda
    const tempDir = path.join(tempRoot, `pass-${requestData.serialNumber}`);
    await fs.promises.mkdir(tempDir, { recursive: true });

    try {
      // 5. Copy static assets to temp directory
      const templateDir = path.join(process.cwd(), "features/wallet/template");
      const assetFiles = [
        "icon.png",
        "icon@2x.png",
        "logo.png",
        "background.png",
      ];

      console.log(`Loading wallet assets from: ${templateDir}`);

      for (const asset of assetFiles) {
        const srcPath = path.join(templateDir, asset);
        const destPath = path.join(tempDir, asset);

        // Only copy if file exists (background.png is optional)
        if (fs.existsSync(srcPath)) {
          await copyFile(srcPath, destPath);
          console.log(`  ✓ Copied asset: ${asset}`);
        } else {
          console.warn(`  ⚠ Asset not found (skipping): ${asset}`);
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
