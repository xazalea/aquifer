# WebAssembly Setup Guide - Professional Implementation

## Overview

This project now includes a **high-performance C++ WebAssembly emulator** for ARM instruction execution. This provides significant performance improvements over pure JavaScript emulation.

## Architecture

```
┌─────────────────────────────────────┐
│   Next.js/React Frontend (UI)      │
├─────────────────────────────────────┤
│   TypeScript Bridge Layer           │  ← lib/wasm-bridge.ts
├─────────────────────────────────────┤
│   C++ WebAssembly Module            │  ← lib/wasm/emulator.cpp
│   - ARM Instruction Emulation       │
│   - Memory Management               │
│   - Register Operations             │
└─────────────────────────────────────┘
```

## Prerequisites

### 1. Install Emscripten

Emscripten is required to compile C++ to WebAssembly:

```bash
# Clone Emscripten SDK
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk

# Install latest version
./emsdk install latest
./emsdk activate latest

# Activate in current shell
source ./emsdk_env.sh

# Add to your shell profile (~/.zshrc or ~/.bashrc)
echo 'source /path/to/emsdk/emsdk_env.sh' >> ~/.zshrc
```

### 2. Verify Installation

```bash
emcc --version
# Should show: emcc (Emscripten gcc/clang-like replacement) X.X.X
```

## Building the WebAssembly Module

### Quick Build

```bash
# From project root
./scripts/build-wasm.sh
```

### Manual Build

```bash
cd lib/wasm
make install-deps  # Check for Emscripten
make all           # Build WASM module
make clean         # Clean build artifacts
```

### Build Output

The build process creates:
- `public/wasm/emulator.js` - JavaScript loader and bindings
- `public/wasm/emulator.wasm` - Compiled WebAssembly binary

## Integration

The WASM emulator is automatically integrated into the existing `ARMEmulator` class with a priority-based fallback system:

1. **Custom C++ WASM** (fastest) - Our optimized emulator
2. **Unicorn Engine** - If available
3. **JavaScript Fallback** - arm-js as last resort

### Usage Example

```typescript
import { ARMEmulator } from '@/lib/arm-emulator'

const emulator = new ARMEmulator()

// Initialize (automatically tries WASM first)
await emulator.init()

// Check which emulator is being used
console.log(emulator.getEmulatorType()) // 'wasm', 'unicorn', or 'armjs'

// Use the emulator
emulator.writeMemory(0x1000, new Uint8Array([0x01, 0x02, 0x03]))
emulator.setRegister(0, 0x12345678)
emulator.executeInstruction(0xE0800000) // ADD instruction

// Get statistics
const stats = emulator.getStats()
console.log(`Executed ${stats.instructionCount} instructions`)
```

## Performance Benefits

### Expected Improvements

| Operation | JavaScript | WASM | Improvement |
|----------|-----------|------|-------------|
| Instruction Execution | ~1M ops/s | ~10-50M ops/s | **10-50x** |
| Memory Operations | ~100MB/s | ~500MB/s | **5x** |
| Register Access | ~10M ops/s | ~100M ops/s | **10x** |

*Actual performance depends on browser, hardware, and workload*

### Why WebAssembly is Faster

1. **Near-Native Performance** - Compiled to efficient bytecode
2. **No Garbage Collection** - Manual memory management
3. **Direct Memory Access** - No JavaScript object overhead
4. **Optimized Compilation** - Emscripten optimizes aggressively
5. **SIMD Support** - Can use SIMD instructions for vector operations

## Development Workflow

### 1. Modify C++ Code

Edit `lib/wasm/emulator.cpp`:

```cpp
// Add new ARM instruction support
bool executeNewInstruction(uint32_t instruction) {
    // Implementation
}
```

### 2. Rebuild

```bash
./scripts/build-wasm.sh
```

### 3. Test

The Next.js dev server will automatically pick up the new WASM files. Refresh your browser to test.

### 4. Debug

```bash
# Build with debug symbols
cd lib/wasm
emcc -g -O0 emulator.cpp -o ../../public/wasm/emulator.js
```

Then use browser DevTools to debug the WASM module.

## Troubleshooting

### Build Fails: "emcc: command not found"

**Solution:** Install and activate Emscripten (see Prerequisites)

```bash
source /path/to/emsdk/emsdk_env.sh
```

### WASM Module Not Loading in Browser

**Check:**
1. Files exist in `public/wasm/`
2. Next.js config has WASM support enabled
3. Browser console for errors
4. Network tab shows WASM file loading

**Solution:**
```bash
# Rebuild
./scripts/build-wasm.sh

# Check files
ls -lh public/wasm/
```

### Performance Not Better

**Possible Causes:**
1. WASM module not actually being used (check console logs)
2. Browser doesn't support WASM well
3. Code path not optimized

**Debug:**
```typescript
// Check which emulator is active
console.log(emulator.getEmulatorType()) // Should be 'wasm'
```

### Memory Issues

**Symptoms:** Browser crashes or "out of memory" errors

**Solution:** Adjust memory limits in `lib/wasm/Makefile`:

```makefile
-s INITIAL_MEMORY=67108864      # 64MB initial
-s MAXIMUM_MEMORY=268435456     # 256MB maximum
```

## Advanced Configuration

### Optimize for Size

Edit `lib/wasm/Makefile`:

```makefile
CXXFLAGS = -std=c++17 -Os -Wall  # -Os = optimize for size
```

### Optimize for Speed

```makefile
CXXFLAGS = -std=c++17 -O3 -flto -Wall  # -O3 = maximum optimization, -flto = link-time optimization
```

### Enable SIMD

```makefile
LDFLAGS += -msimd128  # Enable WebAssembly SIMD
```

## Next Steps

1. **Expand Instruction Set** - Add more ARM instructions
2. **Add Thumb Mode** - Support Thumb/Thumb-2 instructions
3. **Optimize Hot Paths** - Profile and optimize frequently executed code
4. **Add Multi-threading** - Use SharedArrayBuffer for parallel execution
5. **Port Dalvik VM** - Move DEX execution to WASM

## Resources

- [Emscripten Documentation](https://emscripten.org/docs/getting_started/index.html)
- [WebAssembly Specification](https://webassembly.org/)
- [ARM Architecture Reference](https://developer.arm.com/documentation)
- [Next.js WASM Support](https://nextjs.org/docs/api-reference/next.config.js/custom-webpack-config)

## Support

If you encounter issues:

1. Check browser console for errors
2. Verify Emscripten installation
3. Rebuild WASM module
4. Check Next.js configuration
5. Review this documentation

For detailed implementation, see:
- `MIGRATION_ANALYSIS.md` - Architecture decisions
- `WASM_MIGRATION_GUIDE.md` - Detailed migration guide
- `lib/wasm-bridge.ts` - TypeScript bridge implementation

