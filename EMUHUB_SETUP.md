# WebVM + EmuHub Integration Guide

## Overview

Aquifer now uses **WebVM + EmuHub** combined integration. WebVM provides Docker container runtime in the browser, and EmuHub runs inside Docker to provide full Android emulation via NoVNC. This gives you access to complete Android emulators running entirely in your browser.

## How It Works

**WebVM** (https://github.com/leaningtech/webvm) provides:
- Browser-based Docker/container runtime
- x86 virtualization via WebAssembly (CheerpX)
- Ability to run Docker containers in the browser

**EmuHub** (https://github.com/mohamed-helmy/emuhub) provides:
- Android emulators running in Docker containers
- NoVNC web-based VNC client
- Full Android framework support

**Combined**: WebVM runs Docker, Docker runs EmuHub, EmuHub provides Android emulation - all in your browser!

## What This Provides

- **Full Android Environment**: Complete Android OS running in Docker
- **Multiple Emulators**: Run multiple Android instances simultaneously
- **Web-Based Access**: Control emulators through your browser (NoVNC)
- **Better Compatibility**: Full Android framework support

## Setup Instructions

### Automatic Setup (Recommended)

**No manual setup required!** Aquifer will automatically:

1. **Initialize WebVM** - Provides Docker runtime in browser
2. **Start Docker in WebVM** - Docker daemon runs inside WebVM
3. **Pull EmuHub Image** - Downloads `mohamedhelmy/emuhub:latest`
4. **Start EmuHub Container** - Runs EmuHub inside WebVM's Docker
5. **Connect to EmuHub** - Establishes connection for Android emulation

### Using WebVM + EmuHub in Aquifer

1. **Start Aquifer** (your Next.js app)

2. **In the Control Panel**, you'll see an "Emulation Mode" selector

3. **Select "WebVM + EmuHub"** mode (or "Auto" to auto-detect)

4. **Aquifer will automatically:**
   - Initialize WebVM
   - Start Docker in WebVM
   - Pull and start EmuHub container
   - Wait for EmuHub to be ready
   - List available emulators
   - Create a new emulator if none exist
   - Provide a VNC interface for the emulator

## Configuration

The WebVM + EmuHub integration is automatically configured, but you can customize:

```typescript
const webvmEmuhub = new WebVMEmuHubIntegration({
  webvmMemorySize: 2048 * 1024 * 1024, // 2GB for WebVM
  emuhubImage: 'mohamedhelmy/emuhub:latest',
  emuhubPort: 8000,
  vncPassword: 'admin',
  emuhubPassword: 'admin',
})
```

## Benefits of WebVM + EmuHub Mode

✅ **Full Android Compatibility**: Complete Android framework
✅ **Better Performance**: Native Android emulation
✅ **Browser-Based**: Everything runs in the browser (no external server needed)
✅ **Multiple Devices**: Test on different Android versions
✅ **Real APK Testing**: Full support for all Android features
✅ **No External Dependencies**: WebVM provides Docker, no local Docker needed

## Limitations

⚠️ **WebVM Required**: WebVM must be loaded and initialized
⚠️ **Resource Intensive**: WebVM + Docker + Android uses significant memory
⚠️ **Initialization Time**: First startup takes time to pull Docker images
⚠️ **Browser Compatibility**: Requires modern browser with WebAssembly support

## Hybrid Approach

Aquifer supports **hybrid emulation**:

- **Browser Mode**: Works everywhere, no setup needed (current Aquifer implementation)
- **WebVM + EmuHub Mode**: Full Android emulation via WebVM's Docker + EmuHub
- **Auto Mode**: Automatically selects the best available option

You can switch between modes at any time!

## Troubleshooting

### WebVM + EmuHub Not Available

1. **Check WebVM Loading**: Ensure WebVM script is loaded
   - Check browser console for WebVM initialization errors
   - Verify WebVM is available: `window.WebVM`

2. **Check WebVM Docker**: WebVM must support Docker
   - WebVM should have Docker daemon running
   - Check WebVM logs for Docker errors

3. **Check EmuHub Container**: Container should start automatically
   - Check WebVM container list
   - Verify EmuHub image was pulled
   - Check container logs in WebVM

4. **Check Browser Console**: Look for initialization errors
   - WebVM initialization errors
   - Docker startup errors
   - EmuHub connection errors

### Connection Issues

- Ensure WebVM is properly initialized
- Check WebVM's Docker is running
- Verify EmuHub container started successfully
- Check VNC password matches
- Check browser console for detailed errors

## Next Steps

1. Set up EmuHub using Docker
2. Start Aquifer
3. Select "EmuHub" mode in the Control Panel
4. Enjoy full Android emulation!

For more information, see the [EmuHub repository](https://github.com/mohamed-helmy/emuhub).

