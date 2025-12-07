# Apple Wallet Setup Guide for Legacy Wealth Card

## Current Status

✅ **Assets:** Icon, logo, and background images exist in `features/wallet/template/`
✅ **Code:** Signing implementation complete using `node-forge`
✅ **Template:** Pass.json structure is ready
❌ **Certificates:** Missing Apple Developer certificates
❌ **Configuration:** Placeholder values in pass.json

---

## Step-by-Step Setup

### Step 1: Apple Developer Account Setup

**Requirement:** Active Apple Developer Program membership ($99/year)

1. Go to https://developer.apple.com/account/
2. Enroll in Apple Developer Program if not already enrolled
3. Note your **Team ID** (found in Membership section)

---

### Step 2: Create Pass Type Identifier

1. Log into https://developer.apple.com/account/
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → **+** (Add button)
4. Select **Pass Type IDs** → Click **Continue**
5. Register a Pass Type ID:
   - **Description:** Legacy Wealth Card
   - **Identifier:** `pass.com.workdieretire.legacy` (or your domain)
   - Click **Register**

6. **Save this identifier** - you'll need it later

---

### Step 3: Create Pass Type Certificate

1. In Apple Developer Portal, go to **Certificates**
2. Click **+** (Add certificate)
3. Select **Pass Type ID Certificate** → **Continue**
4. Choose your Pass Type ID from Step 2 → **Continue**
5. Follow instructions to create a Certificate Signing Request (CSR):

   **On macOS:**
   - Open **Keychain Access**
   - Menu: **Keychain Access** → **Certificate Assistant** → **Request a Certificate From a Certificate Authority**
   - Fill in:
     - Email: Your email
     - Common Name: "Work Die Retire Pass"
     - CA Email: Leave empty
     - Select: **Saved to disk**
   - Save as `PassCertificateRequest.certSigningRequest`

6. Upload the CSR file
7. Download the certificate (e.g., `pass.cer`)

---

### Step 4: Export Certificate & Private Key

1. Double-click the downloaded `pass.cer` to add it to Keychain Access
2. In Keychain Access, find the certificate under **My Certificates**
3. Expand the certificate to see the private key
4. Select **both** the certificate and private key
5. Right-click → **Export 2 items...**
6. Save as `Certificates.p12`
7. **Set a password** (remember it!)

---

### Step 5: Convert Certificates to PEM Format

Run these commands in Terminal:

```bash
# Navigate to your project
cd /home/user/retirement_calc_demo_2025/features/wallet/certs

# Extract certificate
openssl pkcs12 -in ~/Downloads/Certificates.p12 -clcerts -nokeys -out passcertificate.pem

# Extract private key (encrypted)
openssl pkcs12 -in ~/Downloads/Certificates.p12 -nocerts -out passkey.pem

# Remove passphrase from private key (for automated signing)
openssl rsa -in passkey.pem -out passkey-unencrypted.pem

# Enter the password you set when exporting
```

---

### Step 6: Download Apple WWDR Certificate

```bash
# Download Apple's WWDR G4 certificate
curl -o AppleWWDRCAG4.cer https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer

# Convert to PEM
openssl x509 -inform DER -in AppleWWDRCAG4.cer -out Apple_Wallet_CA_Chain.pem

# Verify the certificate
openssl x509 -in Apple_Wallet_CA_Chain.pem -text -noout | grep "Issuer:"
```

**Expected output:** Should show "Apple Inc."

---

### Step 7: Update pass.json Configuration

Edit `features/wallet/template/pass.json`:

```json
{
  "passTypeIdentifier": "pass.com.workdieretire.legacy",  // Your actual Pass Type ID from Step 2
  "teamIdentifier": "YOUR_TEAM_ID",                       // Your Team ID from Step 1
  "organizationName": "Work Die Retire",
  ...
}
```

---

### Step 8: Test the Setup

**Option A: Using Environment Variables (Recommended for Production)**

```bash
# Set environment variables
export WALLET_CERT_PEM="$(cat features/wallet/certs/passcertificate.pem)"
export WALLET_KEY_PEM="$(cat features/wallet/certs/passkey-unencrypted.pem)"
export WALLET_WWDR_PEM="$(cat features/wallet/certs/Apple_Wallet_CA_Chain.pem)"

# Start the dev server
npm run dev
```

**Option B: Using Files on Disk (Development Only)**

The certificates will be automatically loaded from `features/wallet/certs/` if environment variables are not set.

---

### Step 9: Verify Pass Generation

1. Start your development server
2. Generate a legacy wealth calculation
3. Click **"Add to Apple Wallet"**
4. Check browser console for:
   - ✓ "Using Apple Wallet certificates from..."
   - ✓ "Manifest signed successfully using node-forge"
   - ✓ "Pass generated successfully"

5. Download the `.pkpass` file
6. Verify structure:
   ```bash
   unzip -l LegacyCard-*.pkpass
   ```

   **Expected files:**
   - pass.json
   - manifest.json
   - signature (should NOT be empty)
   - icon.png, icon@2x.png
   - logo.png
   - background.png

---

### Step 10: Test on iOS Device

1. **Email the .pkpass file** to yourself
2. Open on iPhone/iPad
3. Tap the file → Should show "Add to Apple Wallet" sheet
4. Verify the card displays correctly with:
   - ✅ Legacy amount
   - ✅ Success rate
   - ✅ Withdrawal rate
   - ✅ Background colors
   - ✅ QR code on back

---

## Production Deployment (Vercel/Cloud)

### Environment Variables Setup

1. In Vercel Dashboard → Settings → Environment Variables
2. Add these three variables:

   **WALLET_CERT_PEM:**
   ```
   -----BEGIN CERTIFICATE-----
   [Paste entire passcertificate.pem contents]
   -----END CERTIFICATE-----
   ```

   **WALLET_KEY_PEM:**
   ```
   -----BEGIN PRIVATE KEY-----
   [Paste entire passkey-unencrypted.pem contents]
   -----END PRIVATE KEY-----
   ```

   **WALLET_WWDR_PEM:**
   ```
   -----BEGIN CERTIFICATE-----
   [Paste entire Apple_Wallet_CA_Chain.pem contents]
   -----END CERTIFICATE-----
   ```

3. Redeploy your application

---

## Security Checklist

- ✅ Add `features/wallet/certs/` to `.gitignore`
- ✅ Never commit `.pem` or `.p12` files to git
- ✅ Use environment variables in production
- ✅ Restrict API endpoint with rate limiting (optional)
- ✅ Use HTTPS in production (Vercel provides this automatically)

---

## Troubleshooting

### "Pass cannot be read" error on iOS

**Cause:** Invalid signature or incorrect certificate chain

**Solutions:**
1. Verify certificates are in correct PEM format
2. Check that Pass Type ID matches in both Apple Developer Portal and pass.json
3. Ensure Team ID is correct
4. Verify WWDR certificate is G4 version (not G2 or G3)

### "signManifest failed" error

**Cause:** Missing or corrupt certificates

**Solutions:**
1. Check environment variables are set correctly
2. Verify certificate files exist in `features/wallet/certs/`
3. Check server logs for specific error message

### Pass downloads but nothing happens

**Cause:** Testing on non-iOS device

**Solution:** Apple Wallet passes only work on iOS/iPadOS/watchOS devices

### Images not showing in pass

**Cause:** Incorrect image dimensions or format

**Solution:** Verify PNG files match exact dimensions:
- icon.png: 29x29px
- icon@2x.png: 58x58px
- logo.png: 160x50px
- background.png: 180x220px

---

## Quick Start Commands

```bash
# Navigate to project
cd /home/user/retirement_calc_demo_2025

# Create certificates directory
mkdir -p features/wallet/certs

# Add to .gitignore
echo "features/wallet/certs/*.pem" >> .gitignore
echo "features/wallet/certs/*.p12" >> .gitignore

# Convert your certificates (after obtaining from Apple)
cd features/wallet/certs
openssl pkcs12 -in ~/Downloads/Certificates.p12 -clcerts -nokeys -out passcertificate.pem
openssl pkcs12 -in ~/Downloads/Certificates.p12 -nocerts -out passkey.pem
openssl rsa -in passkey.pem -out passkey-unencrypted.pem

# Download WWDR cert
curl -o AppleWWDRCAG4.cer https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer
openssl x509 -inform DER -in AppleWWDRCAG4.cer -out Apple_Wallet_CA_Chain.pem

# Test
cd ../../..
npm run dev
```

---

## Resources

- [Apple Wallet Developer Guide](https://developer.apple.com/documentation/walletpasses)
- [PassKit Package Format Reference](https://developer.apple.com/library/archive/documentation/UserExperience/Reference/PassKit_Bundle/Chapters/Introduction.html)
- [Apple Certificate Authority](https://www.apple.com/certificateauthority/)

---

## Support

If you encounter issues, check:
1. Server console logs for detailed error messages
2. Browser console for client-side errors
3. Certificate expiration dates (Keychain Access on macOS)
