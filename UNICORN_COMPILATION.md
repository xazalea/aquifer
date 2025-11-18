# Compiling Unicorn Engine to WebAssembly

This guide explains how to compile Unicorn Engine to WebAssembly for use in Aquifer.

## Prerequisites

1. **Emscripten SDK** - Install from https://emscripten.org/docs/getting_started/downloads.html
2. **Unicorn Engine source** - Clone from https://github.com/unicorn-engine/unicorn
3. **CMake** - Required for building Unicorn
4. **Python 3** - Required for Emscripten

## Installation Steps

### 1. Install Emscripten

```bash
# Clone emsdk
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk

# Install and activate latest SDK
./emsdk install latest
./emsdk activate latest

# Activate PATH and other environment variables
source ./emsdk_env.sh
```

### 2. Clone Unicorn Engine

```bash
git clone https://github.com/unicorn-engine/unicorn.git
cd unicorn
```

### 3. Build Unicorn for WebAssembly

Create a build script `build-wasm.sh`:

```bash
#!/bin/bash

# Set Emscripten environment
source /path/to/emsdk/emsdk_env.sh

# Create build directory
mkdir -p build-wasm
cd build-wasm

# Configure with Emscripten
emcmake cmake .. \
  -DCMAKE_BUILD_TYPE=Release \
  -DUNICORN_ARCH="arm" \
  -DUNICORN_SHARED=OFF \
  -DCMAKE_C_FLAGS="-O3 -s WASM=1 -s EXPORTED_FUNCTIONS='[\"_malloc\",\"_free\",\"_uc_open\",\"_uc_close\",\"_uc_mem_map\",\"_uc_mem_write\",\"_uc_emu_start\",\"_uc_emu_stop\",\"_uc_reg_write\",\"_uc_reg_read\"]' -s EXPORTED_RUNTIME_METHODS='[\"ccall\",\"cwrap\"]'"

# Build
emmake make -j$(nproc)

# The output will be in build-wasm/unicorn.js and build-wasm/unicorn.wasm
```

### 4. Copy Files to Public Directory

```bash
# Copy the compiled files to your Aquifer public directory
cp build-wasm/unicorn.wasm /path/to/aquifer/public/
cp build-wasm/unicorn.js /path/to/aquifer/public/  # If generated
```

### 5. Update load-unicorn.js

The `load-unicorn.js` script will automatically detect and load `unicorn.wasm` from the `/public` directory.

## Alternative: Using Pre-built Binaries

If you don't want to compile yourself, you can:

1. **Check for community builds** - Some developers share pre-built WASM files
2. **Use Docker** - Build in a containerized environment
3. **Use GitHub Actions** - Set up automated builds

## Docker Build (Alternative Method)

```dockerfile
FROM emscripten/emsdk:latest

WORKDIR /build

# Clone Unicorn
RUN git clone https://github.com/unicorn-engine/unicorn.git

WORKDIR /build/unicorn

# Build for WebAssembly
RUN mkdir build-wasm && cd build-wasm && \
    emcmake cmake .. \
      -DCMAKE_BUILD_TYPE=Release \
      -DUNICORN_ARCH="arm" \
      -DUNICORN_SHARED=OFF && \
    emmake make -j$(nproc)

# Output will be in build-wasm/unicorn.wasm
```

## Verification

After compilation, verify the WASM file:

```bash
file public/unicorn.wasm
# Should show: WebAssembly (wasm) binary module version 0x1
```

## Integration

Once `unicorn.wasm` is in the `/public` directory:

1. The `load-unicorn.js` script will automatically load it
2. The ARM emulator will use Unicorn for native code execution
3. Games with native libraries will work better

## Troubleshooting

### Build Fails

- Ensure Emscripten is properly activated: `emcc --version`
- Check that all dependencies are installed
- Try building with fewer parallel jobs: `make -j1`

### WASM File Too Large

- Use `-Oz` instead of `-O3` for maximum size optimization
- Enable dead code elimination: `-s DEAD_FUNCTIONS_ELIMINATION=1`

### Runtime Errors

- Check browser console for WASM loading errors
- Verify WASM file is served with correct MIME type: `application/wasm`
- Ensure WebAssembly is supported in your browser

## Notes

- Unicorn Engine is large - expect the WASM file to be several MB
- ARM emulation is computationally intensive
- Consider using `arm-js` as a lighter-weight fallback for simple cases

## References

- Unicorn Engine: https://github.com/unicorn-engine/unicorn
- Emscripten: https://emscripten.org/
- WebAssembly: https://webassembly.org/

