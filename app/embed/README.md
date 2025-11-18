# Aquifer Embed Feature

## Overview

The embed feature allows you to embed Android games and apps directly into your website using a simple iframe.

## Usage

### Basic Embed

```html
<iframe 
  src="https://aquiferx.vercel.app/embed/https://example.com/game.apk"
  width="100%"
  height="600px"
  frameborder="0"
  allowfullscreen
></iframe>
```

### URL Format

```
/embed/[APK_URL]
```

The APK URL can be:
- Full URL: `https://example.com/game.apk`
- Encoded URL: Special characters are automatically handled
- Direct file: `https://cdn.example.com/apps/game.apk`

### Examples

```html
<!-- Embed a game from a CDN -->
<iframe 
  src="https://aquiferx.vercel.app/embed/https://cdn.example.com/games/subway-surfers.apk"
  width="100%"
  height="800px"
  style="border: none;"
  allowfullscreen
></iframe>

<!-- Embed with custom dimensions -->
<iframe 
  src="https://aquiferx.vercel.app/embed/https://example.com/my-game.apk"
  width="100%"
  height="100vh"
  style="border: none; min-height: 600px;"
  allowfullscreen
></iframe>
```

## Features

✅ **Fullscreen Mode** - Automatically enters fullscreen
✅ **Beautiful Loading Screen** - Shows "aquifer." logo during loading
✅ **No UI Elements** - Clean, distraction-free experience
✅ **Optimized Performance** - Uses fastest Android VM method
✅ **Automatic APK Installation** - Downloads and installs APK automatically
✅ **Progress Indicator** - Shows loading progress

## Loading States

1. **Initializing emulator** (0-30%)
2. **Loading Android** (30-70%)
3. **Downloading APK** (70-90%)
4. **Installing app** (90-100%)

## Styling

The embed page is designed to be:
- **Fullscreen** - Takes up entire viewport
- **Responsive** - Works on all screen sizes
- **Clean** - No UI elements, just the Android screen

## Customization

You can customize the iframe:

```html
<iframe 
  src="https://aquiferx.vercel.app/embed/[APK_URL]"
  width="100%"
  height="600px"
  style="
    border: 2px solid #667eea;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  "
  allowfullscreen
></iframe>
```

## Error Handling

If the APK fails to load, the embed will show:
- Error message
- Hint about checking the URL
- Beautiful error screen with logo

## Performance

- **Fast Startup** - Optimized Android VM (30-60s)
- **Cached Resources** - APK and images cached
- **Efficient Rendering** - Optimized canvas/VNC display

## Browser Compatibility

Works in all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers

## Security

- **CORS** - APK URLs must allow cross-origin requests
- **HTTPS** - Recommended for production
- **Sandboxed** - Runs in isolated environment

## Examples

### WordPress

```html
[iframe src="https://aquiferx.vercel.app/embed/https://example.com/game.apk" width="100%" height="600"]
```

### React

```jsx
<iframe 
  src={`https://aquiferx.vercel.app/embed/${apkUrl}`}
  width="100%"
  height="600px"
  allowFullScreen
/>
```

### HTML

```html
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
  <iframe 
    src="https://aquiferx.vercel.app/embed/https://example.com/game.apk"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
    allowfullscreen
  ></iframe>
</div>
```

## Troubleshooting

### APK not loading
- Check that the URL is accessible
- Ensure CORS is enabled on the APK server
- Verify the URL is a direct link to the APK file

### Loading stuck
- Check browser console for errors
- Verify network connection
- Try a different APK URL

### Display issues
- Ensure iframe has proper dimensions
- Check that allowfullscreen is enabled
- Verify browser supports WebAssembly

