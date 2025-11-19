# WebAssembly Migration Guide - Practical Implementation

## Quick Start: Proof of Concept

This guide shows you how to integrate C++ WebAssembly modules into your existing TypeScript project.

## Step 1: Install Emscripten

```bash
# Clone Emscripten SDK
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk

# Install and activate latest version
./emsdk install latest
./emsdk activate latest

# Set up environment (add to ~/.zshrc or ~/.bashrc)
source ./emsdk_env.sh
```

## Step 2: Create C++ Emulator Module

Create `lib/wasm/emulator.cpp`:

```cpp
#include <emscripten.h>
#include <emscripten/bind.h>
#include <cstdint>
#include <cstring>

// Simple ARM instruction emulation (proof of concept)
class ARMEmulator {
private:
    uint32_t registers[16];
    uint8_t* memory;
    uint32_t memorySize;
    
public:
    ARMEmulator() : memory(nullptr), memorySize(0) {
        memset(registers, 0, sizeof(registers));
    }
    
    void init(uint32_t size) {
        if (memory) {
            delete[] memory;
        }
        memorySize = size;
        memory = new uint8_t[size];
        memset(memory, 0, size);
    }
    
    void writeMemory(uint32_t address, uint8_t* data, uint32_t length) {
        if (address + length <= memorySize) {
            memcpy(memory + address, data, length);
        }
    }
    
    void readMemory(uint32_t address, uint8_t* output, uint32_t length) {
        if (address + length <= memorySize) {
            memcpy(output, memory + address, length);
        }
    }
    
    void setRegister(uint8_t reg, uint32_t value) {
        if (reg < 16) {
            registers[reg] = value;
        }
    }
    
    uint32_t getRegister(uint8_t reg) {
        return (reg < 16) ? registers[reg] : 0;
    }
    
    // Execute ARM instruction (simplified)
    void execute(uint32_t instruction) {
        // Simple ADD instruction: ADD Rd, Rn, Rm
        if ((instruction & 0xFFF00000) == 0xE0800000) {
            uint8_t rd = (instruction >> 12) & 0xF;
            uint8_t rn = (instruction >> 16) & 0xF;
            uint8_t rm = instruction & 0xF;
            registers[rd] = registers[rn] + registers[rm];
        }
    }
    
    ~ARMEmulator() {
        if (memory) {
            delete[] memory;
        }
    }
};

// Export to JavaScript
using namespace emscripten;

EMSCRIPTEN_KEEPALIVE
extern "C" {
    static ARMEmulator* g_emulator = nullptr;
    
    void* createEmulator() {
        if (!g_emulator) {
            g_emulator = new ARMEmulator();
        }
        return g_emulator;
    }
    
    void initEmulator(void* emu, uint32_t size) {
        if (emu) {
            static_cast<ARMEmulator*>(emu)->init(size);
        }
    }
    
    void writeMemory(void* emu, uint32_t address, uint8_t* data, uint32_t length) {
        if (emu) {
            static_cast<ARMEmulator*>(emu)->writeMemory(address, data, length);
        }
    }
    
    void readMemory(void* emu, uint32_t address, uint8_t* output, uint32_t length) {
        if (emu) {
            static_cast<ARMEmulator*>(emu)->readMemory(address, output, length);
        }
    }
    
    void setRegister(void* emu, uint8_t reg, uint32_t value) {
        if (emu) {
            static_cast<ARMEmulator*>(emu)->setRegister(reg, value);
        }
    }
    
    uint32_t getRegister(void* emu, uint8_t reg) {
        if (emu) {
            return static_cast<ARMEmulator*>(emu)->getRegister(reg);
        }
        return 0;
    }
    
    void executeInstruction(void* emu, uint32_t instruction) {
        if (emu) {
            static_cast<ARMEmulator*>(emu)->execute(instruction);
        }
    }
    
    void destroyEmulator(void* emu) {
        if (emu == g_emulator) {
            delete g_emulator;
            g_emulator = nullptr;
        }
    }
}
```

## Step 3: Build WebAssembly Module

Create `lib/wasm/Makefile`:

```makefile
EMCC = emcc
CXXFLAGS = -O3 -s WASM=1 -s EXPORTED_FUNCTIONS='["_createEmulator","_initEmulator","_writeMemory","_readMemory","_setRegister","_getRegister","_executeInstruction","_destroyEmulator","_malloc","_free"]' -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString","stringToUTF8"]' -s ALLOW_MEMORY_GROWTH=1 -s MODULARIZE=1 -s EXPORT_NAME='createModule'

emulator.wasm: emulator.cpp
	$(EMCC) $(CXXFLAGS) emulator.cpp -o emulator.js

clean:
	rm -f emulator.js emulator.wasm
```

Build:
```bash
cd lib/wasm
make
```

## Step 4: TypeScript Bridge

Create `lib/wasm-bridge.ts`:

```typescript
export interface WASMEmulator {
  createEmulator(): number;
  initEmulator(ptr: number, size: number): void;
  writeMemory(ptr: number, address: number, data: Uint8Array, length: number): void;
  readMemory(ptr: number, address: number, output: Uint8Array, length: number): void;
  setRegister(ptr: number, reg: number, value: number): void;
  getRegister(ptr: number, reg: number): number;
  executeInstruction(ptr: number, instruction: number): void;
  destroyEmulator(ptr: number): void;
  _malloc(size: number): number;
  _free(ptr: number): void;
  HEAPU8: Uint8Array;
}

export class WASMEmulatorBridge {
  private module: any = null;
  private wasm: WASMEmulator | null = null;
  private emulatorPtr: number | null = null;
  private initialized: boolean = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load WASM module
      const createModule = await import('./wasm/emulator.js');
      this.module = await createModule.default();
      this.wasm = this.module as WASMEmulator;
      
      // Create emulator instance
      this.emulatorPtr = this.wasm.createEmulator();
      
      // Initialize with 64MB memory
      this.wasm.initEmulator(this.emulatorPtr, 64 * 1024 * 1024);
      
      this.initialized = true;
      console.log('WASM Emulator initialized');
    } catch (error) {
      console.error('Failed to initialize WASM emulator:', error);
      throw error;
    }
  }

  writeMemory(address: number, data: Uint8Array): void {
    if (!this.wasm || !this.emulatorPtr) {
      throw new Error('WASM emulator not initialized');
    }

    const dataPtr = this.wasm._malloc(data.length);
    this.wasm.HEAPU8.set(data, dataPtr);
    this.wasm.writeMemory(this.emulatorPtr, address, dataPtr, data.length);
    this.wasm._free(dataPtr);
  }

  readMemory(address: number, length: number): Uint8Array {
    if (!this.wasm || !this.emulatorPtr) {
      throw new Error('WASM emulator not initialized');
    }

    const outputPtr = this.wasm._malloc(length);
    this.wasm.readMemory(this.emulatorPtr, address, outputPtr, length);
    const result = new Uint8Array(this.wasm.HEAPU8.buffer, outputPtr, length);
    const copy = new Uint8Array(result); // Copy to avoid issues
    this.wasm._free(outputPtr);
    return copy;
  }

  setRegister(reg: number, value: number): void {
    if (!this.wasm || !this.emulatorPtr) {
      throw new Error('WASM emulator not initialized');
    }
    this.wasm.setRegister(this.emulatorPtr, reg, value);
  }

  getRegister(reg: number): number {
    if (!this.wasm || !this.emulatorPtr) {
      throw new Error('WASM emulator not initialized');
    }
    return this.wasm.getRegister(this.emulatorPtr, reg);
  }

  executeInstruction(instruction: number): void {
    if (!this.wasm || !this.emulatorPtr) {
      throw new Error('WASM emulator not initialized');
    }
    this.wasm.executeInstruction(this.emulatorPtr, instruction);
  }

  destroy(): void {
    if (this.wasm && this.emulatorPtr) {
      this.wasm.destroyEmulator(this.emulatorPtr);
      this.emulatorPtr = null;
    }
    this.initialized = false;
  }
}
```

## Step 5: Integrate with Existing Code

Update `lib/arm-emulator.ts`:

```typescript
import { WASMEmulatorBridge } from './wasm-bridge';

export class ARMEmulator {
  private wasmBridge: WASMEmulatorBridge | null = null;
  private useWASM: boolean = false;

  async init(): Promise<void> {
    try {
      // Try to load WASM module
      this.wasmBridge = new WASMEmulatorBridge();
      await this.wasmBridge.init();
      this.useWASM = true;
      console.log('Using WASM ARM emulator');
    } catch (error) {
      console.warn('WASM emulator not available, using JavaScript fallback:', error);
      this.useWASM = false;
      // Fall back to existing JavaScript implementation
    }
  }

  writeMemory(address: number, data: Uint8Array): void {
    if (this.useWASM && this.wasmBridge) {
      this.wasmBridge.writeMemory(address, data);
    } else {
      // Existing JavaScript implementation
    }
  }

  // ... other methods
}
```

## Step 6: Update Next.js Config

Update `next.config.js` to handle WASM files:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    
    // Handle WASM files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    
    return config;
  },
};

module.exports = nextConfig;
```

## Step 7: Copy WASM Files to Public

```bash
# Copy built WASM files to public directory
cp lib/wasm/emulator.wasm public/
cp lib/wasm/emulator.js public/
```

Update the import in `wasm-bridge.ts`:

```typescript
const createModule = await import('/emulator.js');
```

## Performance Testing

Create a simple benchmark:

```typescript
// lib/wasm-benchmark.ts
export async function benchmarkWASM() {
  const bridge = new WASMEmulatorBridge();
  await bridge.init();

  const iterations = 1000000;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    bridge.setRegister(0, i);
    bridge.setRegister(1, i + 1);
    bridge.executeInstruction(0xE0800000); // ADD R0, R0, R1
  }

  const end = performance.now();
  const time = end - start;
  const opsPerSecond = (iterations / time) * 1000;

  console.log(`WASM: ${opsPerSecond.toFixed(0)} operations/second`);
  return opsPerSecond;
}
```

## Next Steps

1. **Expand C++ Implementation** - Add full ARM instruction set
2. **Dalvik VM in C++** - Port DEX execution to C++
3. **Graphics Pipeline** - Move OpenGL ES translation to C++
4. **Multi-threading** - Use SharedArrayBuffer for parallel execution

## Troubleshooting

### WASM Module Not Loading
- Check browser console for errors
- Verify WASM files are in `public/` directory
- Check Next.js config for WASM support

### Performance Not Better
- Ensure using `-O3` optimization flag
- Check that WASM is actually being used (not fallback)
- Profile with browser DevTools

### Memory Issues
- Increase `ALLOW_MEMORY_GROWTH` in build flags
- Use `-s INITIAL_MEMORY=67108864` for 64MB initial memory

## Resources

- [Emscripten Documentation](https://emscripten.org/docs/getting_started/index.html)
- [WebAssembly Guide](https://webassembly.org/getting-started/developers-guide/)
- [Next.js WASM Support](https://nextjs.org/docs/api-reference/next.config.js/custom-webpack-config)

