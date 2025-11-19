#!/bin/bash
# Professional WebAssembly Build Script
# Builds the ARM emulator C++ module to WebAssembly

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WASM_DIR="$PROJECT_ROOT/lib/wasm"
OUTPUT_DIR="$PROJECT_ROOT/public/wasm"

echo "=========================================="
echo "Building WebAssembly ARM Emulator"
echo "=========================================="

# Check for Emscripten
if ! command -v emcc &> /dev/null; then
    echo "❌ Emscripten not found!"
    echo ""
    echo "Please install Emscripten:"
    echo "  1. git clone https://github.com/emscripten-core/emsdk.git"
    echo "  2. cd emsdk"
    echo "  3. ./emsdk install latest"
    echo "  4. ./emsdk activate latest"
    echo "  5. source ./emsdk_env.sh"
    echo ""
    echo "Or add emsdk to your PATH"
    exit 1
fi

echo "✅ Emscripten found: $(emcc --version | head -n 1)"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Build WASM module
echo "Building WASM module..."
cd "$WASM_DIR"

if [ -f Makefile ]; then
    make clean || true
    make all
else
    echo "❌ Makefile not found in $WASM_DIR"
    exit 1
fi

# Verify output files
if [ -f "$OUTPUT_DIR/emulator.js" ] && [ -f "$OUTPUT_DIR/emulator.wasm" ]; then
    echo ""
    echo "✅ Build successful!"
    echo "   - JavaScript: $OUTPUT_DIR/emulator.js"
    echo "   - WebAssembly: $OUTPUT_DIR/emulator.wasm"
    echo ""
    
    # Show file sizes
    JS_SIZE=$(du -h "$OUTPUT_DIR/emulator.js" | cut -f1)
    WASM_SIZE=$(du -h "$OUTPUT_DIR/emulator.wasm" | cut -f1)
    echo "   File sizes:"
    echo "   - emulator.js: $JS_SIZE"
    echo "   - emulator.wasm: $WASM_SIZE"
else
    echo ""
    echo "❌ Build failed - output files not found"
    exit 1
fi

echo ""
echo "=========================================="
echo "Build complete!"
echo "=========================================="

