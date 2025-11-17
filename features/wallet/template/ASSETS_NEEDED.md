# Asset Files Required

Create these PNG files and place them in this directory (`wallet/template/`):

## 1. icon.png
- **Size:** 29x29 pixels
- **Format:** PNG with transparency
- **Design Ideas:**
  - Simplified dollar sign ($) with upward arrow
  - Minimalist family tree icon
  - Mountain peak representing wealth growth
  - Abstract geometric wealth symbol
- **Colors:** Should contrast well on dark blue (#224D9F)
- **Style:** Clean, simple, recognizable at small size

## 2. icon@2x.png
- **Size:** 58x58 pixels
- **Format:** PNG with transparency
- **Design:** Exact same design as icon.png, just 2x resolution

## 3. logo.png
- **Size:** 160x50 pixels (standard) or 320x100 pixels (@2x)
- **Format:** PNG
- **Design:** "Work Die Retire" wordmark
- **Colors:** White text on transparent background
- **Style:** Match your brand typography
- **Position:** Will appear top-left of the Wallet pass

## 4. background.png (optional but recommended)
- **Size:** 180x220 pixels (standard) or 360x440 pixels (@2x)
- **Format:** PNG
- **Design:** Subtle gradient background
  - Top color: #2a4cf7 (bright blue)
  - Bottom color: #0d1f6d (dark blue)
  - Create smooth vertical gradient
  - Keep it subtle - text must remain readable
- **Style:** Reminiscent of the "Perpetual Legacy" card gradient

## Design Tools

You can create these assets using:
- **Figma** (recommended for web-based design)
- **Sketch** (macOS design tool)
- **Adobe Illustrator** or **Photoshop**
- **Canva** (simplified online option)
- **GIMP** (free open-source alternative)

## Quick Start Template

1. Create a new document with the appropriate dimensions
2. Use transparent background for icons
3. Design at @2x size first, then scale down to 1x
4. Export as PNG-24 with transparency
5. Verify file sizes are correct
6. Place in this directory

## Testing

Once you've created the assets, verify them:

```bash
# Check file dimensions
file icon.png
# Should show: PNG image data, 29 x 29...

# Generate manifest to verify files are readable
npx tsx ../scripts/generateManifest.ts
```

## Color Palette Reference

From the Legacy Card design:
- **Primary Blue:** #2a4cf7
- **Mid Blue:** #122d9f
- **Dark Blue:** #0d1f6d
- **White:** #ffffff
- **Light Blue (labels):** #cfe1ff

Use these colors to maintain visual consistency between the web card and Wallet pass.
