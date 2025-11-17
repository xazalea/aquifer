# Unicorn Engine Setup Guide

## Overview

To enable **real Android game execution**, Aquifer needs ARM native code emulation. This guide explains how to integrate Unicorn Engine.

## What is Unicorn Engine?

[Unicorn Engine](https://github.com/unicorn-engine/unicorn) is a lightweight, multi-architecture CPU emulator framework based on QEMU. It supports ARM, ARM64, x86, and more.

## Integration Options

### Option 1: Compile Unicorn to WebAssembly (Recommended)

This gives you full control and best performance.

#### Prerequisites:
- Emscripten SDK (for compiling C to WebAssembly)
- Unicorn Engine source code
- Basic C/C++ build tools

#### Steps:

1. **Install Emscripten:**
```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

2. **Clone Unicorn Engine:**
```bash
git clone https://github.com/unicorn-engine/unicorn.git
cd unicorn
```

3. **Compile to WebAssembly:**
```bash
# Create a build directory
mkdir build-wasm
cd build-wasm

# Configure with Emscripten
emcmake cmake .. -DCMAKE_BUILD_TYPE=Release

# Build
emmake make -j4

# This will generate unicorn.js and unicorn.wasm
```

4. **Copy to Aquifer:**
```bash
cp unicorn.js /path/to/aquifer/public/
cp unicorn.wasm /path/to/aquifer/public/
```

5. **Load in app:**
The `load-unicorn.js` script will automatically detect and load it.

### Option 2: Use arm-js (JavaScript Fallback)

[arm-js](https://github.com/ozaki-r/arm-js) is a JavaScript ARM emulator. It's slower but works without compilation.

#### Integration:

1. **Add arm-js to your project:**
```bash
# Clone arm-js
git clone https://github.com/ozaki-r/arm-js.git
# Copy relevant files to your project
```

2. **Integrate with ARMEmulator:**
Modify `lib/arm-emulator.ts` to use arm-js when Unicorn is not available.

### Option 3: Use Pre-built WASM (If Available)

Some projects provide pre-built Unicorn WASM modules. Check:
- GitHub releases
- npm packages (if any)
- Community builds

## Current Status

✅ **Framework Ready:**
- Unicorn integration code (`lib/unicorn-integration.ts`)
- ARM emulator wrapper (`lib/arm-emulator.ts`)
- Native library loading
- Function call interface

⚠️ **Needs:**
- Actual Unicorn Engine WASM build
- Or arm-js integration
- Or pre-built WASM module

## Testing

Once Unicorn is loaded, you can test it:

```javascript
// In browser console
const emulator = new ARMEmulator()
await emulator.init()
console.log('ARM Emulator available:', emulator.isAvailable())
```

## Performance Notes

- **Unicorn Engine (WASM):** Near-native performance, best for games
- **arm-js (JavaScript):** Slower but works everywhere
- **Hybrid:** Use Unicorn for performance-critical code, arm-js for fallback

## Next Steps

1. Choose integration method (WASM recommended)
2. Compile or obtain Unicorn Engine
3. Test with a simple native library
4. Integrate with game execution

The code structure is ready - just needs the actual emulator!

