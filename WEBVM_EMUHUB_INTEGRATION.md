# WebVM + EmuHub Combined Integration

## Overview

Aquifer now uses **WebVM + EmuHub** as a **combined solution** where:
1. **WebVM** provides Docker container runtime in the browser
2. **EmuHub** runs inside WebVM's Docker to provide Android emulation
3. Everything runs entirely in the browser - no external server needed!

## How It Works

```
Browser
  └─> WebVM (x86 virtualization via WebAssembly)
       └─> Docker (container runtime)
            └─> EmuHub Container
                 └─> Android Emulator
                      └─> NoVNC (web-based VNC)
                           └─> Your Browser (VNC viewer)
```

### Flow:

1. **WebVM Initialization**
   - WebVM loads and initializes (provides x86 virtualization)
   - Docker daemon starts inside WebVM
   - Docker is ready to run containers

2. **EmuHub Container Startup**
   - Aquifer automatically pulls `mohamedhelmy/emuhub:latest` image
   - Creates and starts EmuHub container with proper configuration
   - Container runs Android emulator with NoVNC server

3. **Connection & Display**
   - EmuHub exposes VNC server on configured port
   - Aquifer connects to EmuHub API
   - VNC viewer displays Android emulator in browser

4. **APK Installation**
   - APKs are uploaded to EmuHub via API
   - EmuHub installs APKs on the Android emulator
   - Apps appear in the emulator's app drawer

## Benefits

✅ **Fully Browser-Based**: No external Docker server needed
✅ **Complete Android**: Full Android framework and compatibility
✅ **Automatic Setup**: Everything happens automatically
✅ **Better Performance**: Native Android emulation
✅ **Multiple Emulators**: Can run multiple Android instances
✅ **Real APK Support**: Full support for all Android features

## Usage

### Automatic (Recommended)

1. **Start Aquifer** (Next.js app)
2. **Select "WebVM + EmuHub"** mode in Control Panel
3. **Wait for initialization** (first time takes longer to pull Docker image)
4. **Android emulator appears** in VNC viewer
5. **Upload and install APKs** as normal

### Manual Configuration

```typescript
const webvmEmuhub = new WebVMEmuHubIntegration({
  webvmMemorySize: 2048 * 1024 * 1024, // 2GB
  emuhubImage: 'mohamedhelmy/emuhub:latest',
  emuhubPort: 8000,
  vncPassword: 'admin',
  emuhubPassword: 'admin',
})

await webvmEmuhub.init()
```

## Technical Details

### WebVM Requirements

- WebVM must be loaded (via `load-webvm.js` script)
- WebVM must support Docker operations
- Sufficient browser memory (recommended 2GB+)

### EmuHub Container

- Image: `mohamedhelmy/emuhub:latest`
- Port: 8000 (configurable)
- Privileged mode: Required for Android emulation
- Environment variables:
  - `VNCPASS`: VNC password
  - `emuhubPASS`: EmuHub admin password
  - `LISTENPORT`: Port for EmuHub server

### Network Architecture

- WebVM provides internal network for containers
- EmuHub container accessible at `localhost:8000` (from WebVM's perspective)
- VNC connections use WebVM's network bridge
- Browser connects to VNC via WebVM's network proxy

## Troubleshooting

### WebVM Not Loading

**Symptoms**: "WebVM not available" in console

**Solutions**:
1. Check if `load-webvm.js` is loaded in HTML
2. Verify WebVM script is accessible
3. Check browser console for script loading errors
4. Ensure WebVM CDN is accessible

### Docker Not Starting in WebVM

**Symptoms**: "Failed to start Docker in WebVM"

**Solutions**:
1. Check WebVM initialization logs
2. Verify WebVM has Docker support enabled
3. Check browser memory (Docker needs significant RAM)
4. Try refreshing the page

### EmuHub Container Not Starting

**Symptoms**: "Failed to start EmuHub container"

**Solutions**:
1. Check WebVM Docker logs
2. Verify EmuHub image can be pulled
3. Check container creation logs
4. Ensure sufficient memory for container

### VNC Connection Issues

**Symptoms**: VNC viewer shows connection error

**Solutions**:
1. Wait for EmuHub to fully start (can take 30-60 seconds)
2. Check EmuHub container logs
3. Verify VNC password is correct
4. Check WebVM network connectivity

## Performance Tips

1. **First Launch**: First time takes longer (pulling Docker image)
   - Subsequent launches are faster (image cached)

2. **Memory**: Ensure sufficient browser memory
   - WebVM: ~500MB
   - Docker: ~500MB
   - EmuHub: ~1GB
   - Android: ~1GB
   - **Total: ~3GB recommended**

3. **Browser**: Use modern browser with good WebAssembly support
   - Chrome/Edge: Best
   - Firefox: Good
   - Safari: May have limitations

## Comparison with Browser Mode

| Feature | Browser Mode | WebVM + EmuHub |
|---------|-------------|----------------|
| Setup | None | WebVM required |
| Android Compatibility | Limited | Full |
| Performance | Moderate | High |
| APK Support | Basic | Complete |
| Memory Usage | Low (~100MB) | High (~3GB) |
| Startup Time | Fast (~1s) | Slow (~30-60s) |
| Game Support | Limited | Full |

## Next Steps

1. **Load WebVM**: Ensure WebVM script is available
2. **Test Integration**: Try "WebVM + EmuHub" mode
3. **Monitor Performance**: Check browser memory usage
4. **Optimize**: Adjust WebVM memory if needed

The integration is complete and ready to use!

