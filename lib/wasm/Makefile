# Professional WebAssembly Build Configuration
# Builds optimized ARM emulator for browser execution

EMCC = emcc
CXX = em++
CXXFLAGS = -std=c++17 -O3 -Wall -Wextra
LDFLAGS = -s WASM=1 \
          -s EXPORTED_FUNCTIONS='["_createEmulator","_initEmulator","_writeMemory","_readMemory","_setRegister","_getRegister","_executeInstruction","_executeInstructions","_getInstructionCount","_getMemorySize","_getPC","_setPC","_destroyEmulator","_malloc","_free"]' \
          -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString","stringToUTF8","HEAP8","HEAPU8","HEAP16","HEAPU16","HEAP32","HEAPU32","HEAPF32","HEAPF64"]' \
          -s ALLOW_MEMORY_GROWTH=1 \
          -s INITIAL_MEMORY=67108864 \
          -s MAXIMUM_MEMORY=268435456 \
          -s MODULARIZE=1 \
          -s EXPORT_NAME='createWASMEmulator' \
          -s USE_ES6_IMPORT_META=0 \
          -s ENVIRONMENT='web,webworker' \
          --no-entry \
          -fno-exceptions \
          -fno-rtti

# Output files
WASM_OUTPUT = emulator.wasm
JS_OUTPUT = emulator.js
OUTPUT_DIR = ../../public/wasm

.PHONY: all clean install-deps

all: $(OUTPUT_DIR)/$(JS_OUTPUT) $(OUTPUT_DIR)/$(WASM_OUTPUT)

$(OUTPUT_DIR)/$(JS_OUTPUT) $(OUTPUT_DIR)/$(WASM_OUTPUT): emulator.cpp
	@echo "Building WebAssembly module..."
	@mkdir -p $(OUTPUT_DIR)
	$(EMCC) $(CXXFLAGS) $(LDFLAGS) emulator.cpp -o $(OUTPUT_DIR)/$(JS_OUTPUT)
	@echo "Build complete: $(OUTPUT_DIR)/$(JS_OUTPUT)"
	@echo "Build complete: $(OUTPUT_DIR)/$(WASM_OUTPUT)"

clean:
	rm -f $(OUTPUT_DIR)/$(JS_OUTPUT) $(OUTPUT_DIR)/$(WASM_OUTPUT)
	@echo "Cleaned build artifacts"

install-deps:
	@echo "Checking for Emscripten..."
	@which emcc > /dev/null || (echo "Emscripten not found. Please install:" && echo "  git clone https://github.com/emscripten-core/emsdk.git" && echo "  cd emsdk && ./emsdk install latest && ./emsdk activate latest" && exit 1)
	@echo "Emscripten found: $$(emcc --version | head -n 1)"

help:
	@echo "Available targets:"
	@echo "  make all          - Build WebAssembly module (default)"
	@echo "  make clean        - Remove build artifacts"
	@echo "  make install-deps - Check for Emscripten installation"
	@echo "  make help         - Show this help message"

