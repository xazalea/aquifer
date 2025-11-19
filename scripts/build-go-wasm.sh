#!/bin/bash
# Professional Go WebAssembly Build Script
# Builds the Go VM orchestrator to WebAssembly

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GO_WASM_DIR="$PROJECT_ROOT/lib/go-wasm"
OUTPUT_DIR="$PROJECT_ROOT/public/wasm"

echo "=========================================="
echo "Building Go WebAssembly VM Orchestrator"
echo "=========================================="

# Check for Go
if ! command -v go &> /dev/null; then
    echo "❌ Go not found!"
    echo ""
    echo "Please install Go:"
    echo "  macOS: brew install go"
    echo "  Or download from: https://golang.org/dl/"
    exit 1
fi

echo "✅ Go found: $(go version)"
echo ""

# Check for WebAssembly target
if ! go env GOOS | grep -q "wasm" 2>/dev/null; then
    echo "Setting up WebAssembly target..."
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Build Go WASM module
echo "Building Go WASM module..."
cd "$GO_WASM_DIR"

# Initialize Go module if needed
if [ ! -f "go.mod" ]; then
    go mod init github.com/aquifer/vm-orchestrator
fi

# Build for WebAssembly
echo "Compiling Go to WebAssembly..."
GOOS=js GOARCH=wasm go build -o "$OUTPUT_DIR/vm-orchestrator.wasm" vm-orchestrator.go

# Copy Go WASM JS support file
if [ -f "$(go env GOROOT)/misc/wasm/wasm_exec.js" ]; then
    cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" "$OUTPUT_DIR/"
    echo "✅ Copied wasm_exec.js"
else
    echo "⚠️  Warning: wasm_exec.js not found. You may need to copy it manually."
fi

# Verify output
if [ -f "$OUTPUT_DIR/vm-orchestrator.wasm" ]; then
    echo ""
    echo "✅ Build successful!"
    echo "   - WebAssembly: $OUTPUT_DIR/vm-orchestrator.wasm"
    echo ""
    
    # Show file size
    WASM_SIZE=$(du -h "$OUTPUT_DIR/vm-orchestrator.wasm" | cut -f1)
    echo "   File size: $WASM_SIZE"
else
    echo ""
    echo "❌ Build failed - output file not found"
    exit 1
fi

echo ""
echo "=========================================="
echo "Build complete!"
echo "=========================================="

