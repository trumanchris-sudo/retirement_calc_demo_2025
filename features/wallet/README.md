# Apple Wallet Pass Integration

This directory contains the infrastructure for generating Apple Wallet passes for the Legacy Wealth calculator.

## Required Assets

Place these PNG files in `wallet/template/` directory:

### 1. icon.png
- **Dimensions:** 29x29 pixels
- **Design:** Simplified wealth/legacy icon (e.g., stylized dollar sign, family tree, or mountain peak)
- **Background:** Transparent
- **Color:** Should work on dark blue background (#224D9F)

### 2. icon@2x.png
- **Dimensions:** 58x58 pixels
- **Design:** Same as icon.png, just 2x resolution

### 3. logo.png
- **Dimensions:** 160x50 pixels (or 320x100 for @2x)
- **Design:** "Work Die Retire" wordmark or simplified logo
- **Color:** White text/logo to contrast with dark blue background
- **Position:** Appears in the top-left of the pass

### 4. background.png (optional)
- **Dimensions:** 180x220 pixels (@2x: 360x440)
- **Design:** Subtle gradient reminiscent of the card's radial gradient
  - Effect: Dark blue gradient (top: #2a4cf7 → bottom: #0d1f6d)
  - Keep it subtle so text remains readable
- **Position:** Appears behind the card content

**Color Space:** All images should use sRGB color space for consistency.

## Setup Instructions

### 1. Install Dependencies

The archiver package is needed for ZIP creation:

```bash
npm install archiver
npm install -D @types/archiver
```

### 2. Create Asset Files

Create the required PNG assets following the specifications above and place them in `wallet/template/`.

### 3. Test the Integration (Pre-Signing)

The system will work without real Apple certificates but passes won't be valid for actual import into Wallet. You can test the structure:

```bash
# Generate a test pass (will have empty signature)
# Click the "Add to Apple Wallet" button in your app
# Inspect the downloaded .pkpass file:
unzip -l LegacyCard.pkpass

# Expected contents:
# - pass.json
# - manifest.json
# - signature (empty for now)
# - icon.png, icon@2x.png, logo.png, background.png
```

### 4. Apple Developer Setup (REQUIRED FOR PRODUCTION)

#### a. Create Pass Type ID
1. Log into https://developer.apple.com
2. Go to Certificates, Identifiers & Profiles
3. Create a new Pass Type ID (Identifiers > Pass Type IDs)
4. Note your Pass Type Identifier (e.g., `pass.com.yourcompany.legacy`)
5. Replace `pass.com.example.legacy` in `wallet/template/pass.json` with your actual ID

#### b. Create Pass Type Certificate
1. In Apple Developer Portal, create a Pass Type Certificate for your Pass Type ID
2. Download the certificate (.cer file)
3. Open in Keychain Access (macOS)
4. Export as .p12 with private key
5. Convert to PEM format:
   ```bash
   # Extract certificate
   openssl pkcs12 -in Certificates.p12 -clcerts -nokeys -out passcertificate.pem

   # Extract private key
   openssl pkcs12 -in Certificates.p12 -nocerts -out passkey.pem
   ```

#### c. Download Apple WWDR Certificate
1. Go to https://www.apple.com/certificateauthority/
2. Download the WWDR G4 certificate
3. Convert to PEM:
   ```bash
   openssl x509 -inform DER -in AppleWWDRCAG4.cer -out AppleWWDRCA.pem
   ```

#### d. Place Certificates
Create `wallet/certs/` directory and place:
- `passcertificate.pem` (your certificate)
- `passkey.pem` (your private key)
- `AppleWWDRCA.pem` (Apple's root cert)

**SECURITY NOTE:** Add `wallet/certs/` to `.gitignore` to prevent committing certificates.

### 5. Implement Real Signing

Replace the `signManifest` function in `app/api/wallet/legacy/route.ts`:

```typescript
import { execSync } from 'child_process';

async function signManifest(
  manifestPath: string,
  outputPath: string
): Promise<void> {
  const certsDir = path.join(process.cwd(), 'wallet/certs');

  execSync(`openssl smime -binary -sign \
    -certfile ${certsDir}/AppleWWDRCA.pem \
    -signer ${certsDir}/passcertificate.pem \
    -inkey ${certsDir}/passkey.pem \
    -in ${manifestPath} \
    -out ${outputPath} \
    -outform DER \
    -passin pass:YOUR_P12_PASSWORD`);
}
```

Alternatively, use a Node library like `node-forge` for pure JavaScript signing.

### 6. Update Pass Configuration

Edit `wallet/template/pass.json`:
- Replace `TEAMIDPLACEHOLDER` with your Apple Developer Team ID
- Replace `pass.com.example.legacy` with your actual Pass Type Identifier

## Integration with Calculator

To add the Wallet button to your calculator results:

```typescript
import AddToWalletButton from '@/components/AddToWalletButton';
import { LegacyResult } from '@/lib/walletPass';

function YourResultsComponent({ calculationResult }: { calculationResult: CalculationResult }) {
  // Map your calculation result to LegacyResult format
  const legacyResult: LegacyResult = {
    legacyAmount: calculationResult.eol,
    legacyAmountDisplay: fmt(calculationResult.eol),
    legacyType: calculationResult.eol > threshold ? "Perpetual Legacy" : "Finite Legacy",
    withdrawalRate: 0.035, // Your withdrawal rate
    successProbability: 1 - calculationResult.probRuin,
    explanationText: `Your retirement plan projects ${calculationResult.eol > threshold ? 'perpetual' : 'finite'} wealth...`,
  };

  return (
    <div>
      {/* Your existing result UI */}
      <AddToWalletButton result={legacyResult} />
    </div>
  );
}
```

## Debugging

### Generate Manifest for Inspection
```bash
npx tsx wallet/scripts/generateManifest.ts
```

### Check Pass Structure
```bash
unzip -l LegacyCard.pkpass
```

### Validate Pass JSON
```bash
cat wallet/template/pass.json | jq .
```

## Troubleshooting

### "Pass cannot be read" error in Wallet
- **Cause:** Invalid signature
- **Fix:** Ensure certificate chain is correct and signing command is working
- **Test:** Try signing a test manifest manually with openssl

### "Pass already exists"
- **Cause:** Serial number collision
- **Fix:** Serial numbers are auto-generated with timestamp + random, should be unique

### Images not showing
- **Cause:** Incorrect file sizes or formats
- **Fix:** Verify PNG format and exact dimensions match Apple specs

### Colors look wrong
- **Cause:** RGB values don't match expected colors
- **Fix:** Use sRGB color space, check backgroundColor in pass.json

### Pass downloads but clicking does nothing
- **Cause:** Likely on a non-iOS device
- **Note:** Apple Wallet passes only work on iOS/iPadOS/watchOS

## Security Considerations

1. **Never commit certificates:** Add `wallet/certs/` to `.gitignore`
2. **Protect private keys:** Use environment variables or secrets manager in production
3. **Rate limiting:** Consider adding rate limits to the API endpoint
4. **Authentication:** Add user authentication if passes contain sensitive data
5. **Validation:** Always validate request data before generating passes

## Production Deployment

1. Ensure all certificates are properly configured
2. Test signing process end-to-end
3. Set up proper error logging and monitoring
4. Consider CDN for pass distribution if high volume
5. Implement pass updates API if you need to push updates to existing passes

## Resources

- [Apple Wallet Developer Guide](https://developer.apple.com/documentation/walletpasses)
- [PassKit Package Format Reference](https://developer.apple.com/library/archive/documentation/UserExperience/Reference/PassKit_Bundle/Chapters/Introduction.html)
- [Pass Design and Creation](https://developer.apple.com/design/human-interface-guidelines/wallet)
