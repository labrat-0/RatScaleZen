# RatScaleZen

<div align="center">

</div>

Browser extension that generates platform-specific icon sets from a single image. Drop in a PNG, select your target platforms, and download a ZIP with every size you need. Runs entirely in-browser -- no uploads, no servers, no API keys. Built for Zen Browser and Firefox.

## What does it do?

RatScaleZen takes one image and resizes it into the exact icon dimensions required by each platform -- Android, iOS, Windows, macOS, Chrome, Firefox, and PWA. Output is a ZIP file organized into platform subfolders, each containing only the sizes that platform needs.

No build tools, no CLI, no dependencies to install. Click the extension icon, drop an image, pick your platforms, download.

## Features

- **7 platforms**: Android, iOS, Windows, macOS, Chrome, Firefox, PWA -- each with correct icon sizes
- **Platform subfolders**: ZIP output organized by platform, with a flat copy of all sizes at the root
- **Drag-and-drop or file picker**: Works on desktop and mobile (including iOS Safari photo capture)
- **Live preview**: See resized icons before downloading, with platform badges showing which platforms use each size
- **Batch size deduplication**: Shared sizes across platforms are generated once, not duplicated
- **ZIP export**: One-click download via JSZip, no server round-trip
- **Keyboard shortcut**: `Alt+R` opens the extension
- **100% local**: All processing happens in-browser using Canvas API. No data leaves your device

## Platform sizes

| Platform | Sizes (px) | Count |
|----------|-----------|-------|
| Android | 48, 72, 96, 144, 192, 512 | 6 |
| iOS | 40, 58, 60, 80, 87, 120, 180, 1024 | 8 |
| Windows | 16, 32, 44, 48, 50, 150, 310 | 7 |
| macOS | 16, 32, 64, 128, 256, 512, 1024 | 7 |
| Chrome | 16, 32, 48, 128 | 4 |
| Firefox | 16, 32, 48, 64, 128 | 5 |
| PWA | 48, 72, 96, 144, 168, 192, 512 | 7 |

Select individual platforms or "Select All" to generate the full set. The ZIP includes platform-specific subfolders plus a flat root folder with all unique sizes.

## Installation

### Temporary install (developer mode)

1. Download or clone this repository
2. Open Zen Browser or Firefox
3. Navigate to `about:debugging#/runtime/this-firefox`
4. Click **Load Temporary Add-on...**
5. Select `manifest.json` from the project directory
6. The RatScaleZen icon appears in your toolbar

### Permanent install

1. Navigate to `about:addons`
2. Click the gear icon and select **Install Add-on From File...**
3. Select the packaged `.xpi` file

## Usage

1. Click the RatScaleZen icon in your toolbar (or press `Alt+R`)
2. The app opens in a dedicated window
3. Drag and drop an image, or click to select one
4. Check the platforms you want icons for
5. Click **Download Icon Pack**
6. Save the ZIP file -- icons are ready to use

### Supported input formats

PNG, JPEG, WebP, GIF, SVG. Maximum file size: 5 MB (desktop version) / 10 MB (full page version).

### ZIP output structure

```
myimage_icons/
  android/
    icon_48x48.png
    icon_72x72.png
    ...
    README.txt
  ios/
    icon_40x40.png
    icon_58x58.png
    ...
    README.txt
  chrome/
  firefox/
  windows/
  macos/
  pwa/
  icon_16x16.png      (flat copies of all unique sizes)
  icon_32x32.png
  ...
  icon_1024x1024.png
  README.txt
```

Each platform subfolder contains only the sizes required by that platform, plus a `README.txt` with metadata.

---

## Browser compatibility

- **Zen Browser** -- primary target
- **Firefox 109+** -- fully supported (Manifest V2, `browser.*` APIs)
- Other Gecko-based browsers should work but are untested

This is a Gecko/Firefox extension. It does not support Chromium-based browsers (Chrome, Edge, Brave) without porting to Manifest V3 and the `chrome.*` API.

---

## Technical details

- Pure JavaScript -- no frameworks, no build step, no transpilation
- Canvas API for image resizing with `imageSmoothingQuality: 'high'`
- JSZip for client-side ZIP generation with DEFLATE compression
- `browser.downloads` API for save-as dialog
- `browser.storage.local` for window state persistence
- `browser.windows` API for dedicated app window management
- Two UI variants: `full_page.html` (feature-rich with live preview, confetti, CRT effects) and `minimal_full_page.html` (streamlined, mobile-compatible, batch-optimized)
- Background script tracks active window to prevent duplicate instances
- Manifest V2 with `browser_action` and `gecko` browser-specific settings

---

## Project structure

```
RatScaleZen/
  icons/                    Extension icons (16-1024px) + logo.png
  platform_icons/           Platform SVGs (android, chrome, firefox, ios, macos, pwa, windows)
  background.js             Window management, install handler
  popup.js                  Auto-opens the app window from browser action
  popup.html                Minimal popup shell
  full_page.js              Full UI: drag-drop, live preview, platform selector, ZIP export
  full_page.html            Full UI markup
  minimal_full_page.js      Streamlined UI: mobile support, batch processing, Safari/iOS handling
  minimal_full_page.html    Streamlined UI markup
  animations.js             Digital rain, cheese rain, JSZip verification
  ratscale.css              CRT terminal theme (green-on-dark, scanlines, JetBrains Mono)
  jszip.min.js              JSZip library (bundled)
  manifest.json             Extension manifest (MV2, Gecko)
  PRIVACY.md                Privacy policy
  HOW_TO_INSTALL.md         Installation guide
  LICENSE                   MIT License
```

---

## Limitations

- **Aspect ratio is not preserved.** All icons are square. Non-square source images are stretched to fit. Use a square source image for best results.
- **No upscaling quality guarantee.** If your source image is smaller than the largest target size (e.g., 1024x1024), the output will be a scaled-up version of a low-resolution input. Start with the largest size you need.
- **Gecko/Firefox only.** Manifest V2 with `browser.*` APIs. Does not work in Chrome, Edge, or other Chromium-based browsers without porting.
- **Temporary add-on resets on restart.** Extensions loaded via `about:debugging` are removed when the browser restarts. Use the `.xpi` install method for persistence.

---

## FAQ

### Does this upload my images anywhere?

No. All image processing happens locally in your browser using the Canvas API. No network requests are made. See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

### What image format should I use?

PNG with transparency is ideal. JPEG, WebP, GIF, and SVG also work. The output is always PNG.

### Can I add custom sizes?

Not through the UI. The sizes are defined per-platform in `SIZE_RULES` in both `full_page.js` and `minimal_full_page.js`. You can modify those objects to add or remove sizes.

### What's the difference between the two UI versions?

`full_page.html` has the complete feature set: live preview grid, confetti effects, CRT terminal aesthetic, debug panel (F2), troubleshooting section. `minimal_full_page.html` is a stripped-down version optimized for mobile devices with batch processing and Safari/iOS compatibility.

### Why does the popup close immediately?

By design. The popup (`popup.js`) auto-opens the full app in a dedicated window and closes itself. The app runs in its own window, not inside the popup.

---

## Privacy

All processing is local. No data is collected, stored, or transmitted. See [PRIVACY.md](PRIVACY.md).

## License

MIT. See [LICENSE](LICENSE).

## Author

**Mick Donahue (labrat)**

- Website: [ratbyte.dev](https://ratbyte.dev)
- GitHub: [@labrat-0](https://github.com/labrat-0)
