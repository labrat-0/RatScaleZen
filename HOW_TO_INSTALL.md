# RatScaleZen - Zen Browser Extension Installation Guide

RatScaleZen is a powerful tool that helps you create icons for various platforms in multiple sizes. Follow these steps to install and use it.

## Installation Steps (Zen Browser / Firefox)

1. Open Zen Browser (or Firefox)
2. Navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on..."
4. Navigate to and select the `manifest.json` file from this folder
5. The RatScaleZen extension should now appear in your toolbar

## Using the Extension

1. Click the RatScaleZen icon in your browser toolbar
2. The tool will open in a new window
3. Drop an image or click to select one (up to 5MB)
4. Select the target platforms you want to create icons for
5. Click "Download Icon Pack"
6. A ZIP file will be downloaded containing your icons in all the required sizes

## Troubleshooting

If the extension doesn't open:
1. Right-click the extension icon and check for any error messages
2. Open the Browser Console (Ctrl+Shift+J) to check for errors
3. Make sure jszip.min.js is in the root folder
4. Try reloading the extension from `about:debugging`

## Supported Platforms and Icon Sizes

- Android: 48x48, 72x72, 96x96, 144x144, 192x192, 512x512
- iOS: 40x40, 58x58, 60x60, 80x80, 87x87, 120x120, 180x180, 1024x1024
- Windows: 16x16, 32x32, 44x44, 48x48, 50x50, 150x150, 310x310
- macOS: 16x16, 32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024
- Chrome: 16x16, 32x32, 48x48, 128x128
- Firefox: 16x16, 32x32, 48x48, 64x64, 128x128
- PWA: 48x48, 72x72, 96x96, 144x144, 168x168, 192x192, 512x512

All icon sizes (16 to 1024) are also included in the root folder of the ZIP file.
