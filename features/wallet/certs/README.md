# Apple Wallet Pass Certificates

This directory contains the certificates required to sign Apple Wallet passes. These files are **not** included in the repository for security reasons.

## Required Files

To enable Apple Wallet pass generation, you need the following files in this directory:

1. **`passcertificate.pem`** - Your Pass Type ID certificate from Apple Developer
2. **`passkey-unencrypted.pem`** - Your unencrypted private key
3. **`Apple_Wallet_CA_Chain.pem`** - Apple WWDR certificate chain

## How to Get These Files

### 1. Get a Pass Type ID Certificate

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to Certificates, Identifiers & Profiles
3. Create a new Pass Type ID
4. Create a certificate for the Pass Type ID
5. Download the certificate (.cer file)

### 2. Convert to PEM Format

```bash
# Convert the certificate
openssl x509 -inform DER -in pass.cer -out passcertificate.pem

# Export private key from Keychain (Mac)
# 1. Open Keychain Access
# 2. Find your Pass Type ID certificate
# 3. Export as .p12 file
# 4. Convert to PEM:
openssl pkcs12 -in Certificates.p12 -out passkey.pem -nodes
# Remove the certificate part, keep only the private key section

# Or create unencrypted key directly:
openssl rsa -in passkey.pem -out passkey-unencrypted.pem
```

### 3. Download Apple WWDR Certificate

Download the Apple Worldwide Developer Relations certificate chain from Apple:
- [Apple PKI](https://www.apple.com/certificateauthority/)

Save it as `Apple_Wallet_CA_Chain.pem`

## Security Notes

- **Never commit these files to version control** - They are already in `.gitignore`
- Keep your private key secure and unencrypted only for development
- For production, use encrypted keys and proper secret management
- These certificates allow signing passes with your Pass Type ID

## Alternative: Use Environment Variables

For production deployments (like Vercel), you can store these as environment variables and write them to disk at runtime. See the deployment documentation for details.

## Testing Without Certificates

The API route will return a helpful error message if certificates are missing. The rest of the app will continue to function normally.
