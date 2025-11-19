/**
 * Professional ARM Emulator Core - WebAssembly Module
 * 
 * High-performance ARM instruction emulation for Android native code execution.
 * Optimized for WebAssembly with minimal memory overhead and maximum speed.
 */

#include <emscripten.h>
#include <emscripten/bind.h>
#include <cstdint>
#include <cstring>
#include <cstdlib>
#include <vector>
#include <memory>

// ARM Emulator Core
class ARMEmulatorCore {
private:
    // ARM Registers (R0-R15, CPSR)
    uint32_t registers[17];
    
    // Memory management
    uint8_t* memory;
    uint32_t memorySize;
    uint32_t memoryCapacity;
    
    // Execution state
    bool isRunning;
    uint32_t pc;  // Program Counter
    uint32_t sp;  // Stack Pointer
    uint32_t lr;  // Link Register
    
    // Performance tracking
    uint64_t instructionCount;
    
    // Memory allocation helper
    bool ensureMemory(uint32_t size) {
        if (size <= memoryCapacity) return true;
        
        uint32_t newCapacity = memoryCapacity * 2;
        while (newCapacity < size) newCapacity *= 2;
        
        uint8_t* newMemory = (uint8_t*)realloc(memory, newCapacity);
        if (!newMemory) return false;
        
        // Zero new memory
        memset(newMemory + memoryCapacity, 0, newCapacity - memoryCapacity);
        
        memory = newMemory;
        memoryCapacity = newCapacity;
        return true;
    }
    
public:
    ARMEmulatorCore() 
        : memory(nullptr)
        , memorySize(0)
        , memoryCapacity(0)
        , isRunning(false)
        , pc(0)
        , sp(0)
        , lr(0)
        , instructionCount(0)
    {
        memset(registers, 0, sizeof(registers));
    }
    
    ~ARMEmulatorCore() {
        if (memory) {
            free(memory);
            memory = nullptr;
        }
    }
    
    // Initialize emulator with memory size
    bool init(uint32_t initialSize) {
        if (memory) {
            free(memory);
        }
        
        memoryCapacity = initialSize > 0 ? initialSize : 64 * 1024 * 1024; // Default 64MB
        memory = (uint8_t*)calloc(memoryCapacity, 1);
        if (!memory) return false;
        
        memorySize = memoryCapacity;
        isRunning = false;
        pc = 0;
        sp = memoryCapacity - 4; // Stack grows downward
        lr = 0;
        instructionCount = 0;
        
        // Initialize stack pointer
        registers[13] = sp; // R13 = SP
        registers[15] = pc; // R15 = PC
        
        return true;
    }
    
    // Memory operations
    bool writeMemory(uint32_t address, const uint8_t* data, uint32_t length) {
        if (!memory) return false;
        if (address + length > memoryCapacity) {
            if (!ensureMemory(address + length)) return false;
        }
        
        memcpy(memory + address, data, length);
        if (address + length > memorySize) {
            memorySize = address + length;
        }
        return true;
    }
    
    bool readMemory(uint32_t address, uint8_t* output, uint32_t length) const {
        if (!memory || address + length > memorySize) return false;
        memcpy(output, memory + address, length);
        return true;
    }
    
    // Register operations
    void setRegister(uint8_t reg, uint32_t value) {
        if (reg < 16) {
            registers[reg] = value;
            if (reg == 13) sp = value;  // Update SP
            if (reg == 15) pc = value;  // Update PC
        } else if (reg == 16) {
            // CPSR (Condition Code Register)
            registers[16] = value;
        }
    }
    
    uint32_t getRegister(uint8_t reg) const {
        if (reg < 16) return registers[reg];
        if (reg == 16) return registers[16]; // CPSR
        return 0;
    }
    
    // Instruction execution
    bool executeInstruction(uint32_t instruction) {
        if (!memory) return false;
        
        instructionCount++;
        
        // ARM instruction decoding and execution
        uint32_t opcode = (instruction >> 26) & 0x3;
        uint32_t cond = (instruction >> 28) & 0xF;
        
        // Check condition code
        if (!checkCondition(cond)) {
            return true; // Condition not met, skip instruction
        }
        
        // Data Processing instructions (AND, EOR, SUB, RSB, ADD, ADC, SBC, RSC, TST, TEQ, CMP, CMN, ORR, MOV, BIC, MVN)
        if (opcode == 0x0 && ((instruction >> 25) & 0x1) == 0) {
            return executeDataProcessing(instruction);
        }
        
        // Branch instructions
        if (opcode == 0x2) {
            return executeBranch(instruction);
        }
        
        // Load/Store instructions
        if (opcode == 0x1 || (opcode == 0x0 && ((instruction >> 25) & 0x1) == 1)) {
            return executeLoadStore(instruction);
        }
        
        // Unknown instruction - return false to indicate error
        return false;
    }
    
    // Execute multiple instructions
    uint32_t executeInstructions(const uint32_t* instructions, uint32_t count) {
        uint32_t executed = 0;
        for (uint32_t i = 0; i < count; i++) {
            if (executeInstruction(instructions[i])) {
                executed++;
            } else {
                break; // Stop on error
            }
        }
        return executed;
    }
    
    // Get execution statistics
    uint64_t getInstructionCount() const {
        return instructionCount;
    }
    
    uint32_t getMemorySize() const {
        return memorySize;
    }
    
    uint32_t getPC() const {
        return pc;
    }
    
    void setPC(uint32_t value) {
        pc = value;
        registers[15] = value;
    }
    
private:
    // Condition code checking
    bool checkCondition(uint32_t cond) const {
        uint32_t cpsr = registers[16];
        bool N = (cpsr >> 31) & 1; // Negative
        bool Z = (cpsr >> 30) & 1; // Zero
        bool C = (cpsr >> 29) & 1; // Carry
        bool V = (cpsr >> 28) & 1; // Overflow
        
        switch (cond) {
            case 0x0: return Z;           // EQ (Equal)
            case 0x1: return !Z;           // NE (Not Equal)
            case 0x2: return C;            // CS/HS (Carry Set)
            case 0x3: return !C;          // CC/LO (Carry Clear)
            case 0x4: return N;           // MI (Minus/Negative)
            case 0x5: return !N;           // PL (Plus/Positive)
            case 0x6: return V;           // VS (Overflow Set)
            case 0x7: return !V;          // VC (Overflow Clear)
            case 0x8: return C && !Z;      // HI (Unsigned Higher)
            case 0x9: return !C || Z;      // LS (Unsigned Lower or Same)
            case 0xA: return N == V;       // GE (Signed Greater or Equal)
            case 0xB: return N != V;       // LT (Signed Less Than)
            case 0xC: return !Z && (N == V); // GT (Signed Greater Than)
            case 0xD: return Z || (N != V); // LE (Signed Less or Equal)
            case 0xE: return true;        // AL (Always)
            case 0xF: return true;         // AL (Always) - deprecated
            default: return true;
        }
    }
    
    // Data Processing instruction execution
    bool executeDataProcessing(uint32_t instruction) {
        uint32_t op = (instruction >> 21) & 0xF;
        bool S = (instruction >> 20) & 0x1; // Set condition codes
        uint8_t Rn = (instruction >> 16) & 0xF;
        uint8_t Rd = (instruction >> 12) & 0xF;
        
        // Get first operand
        uint32_t op1 = registers[Rn];
        
        // Get second operand (immediate or register)
        uint32_t op2;
        bool immediate = (instruction >> 25) & 0x1;
        if (immediate) {
            uint32_t imm = instruction & 0xFF;
            uint8_t rotate = ((instruction >> 8) & 0xF) * 2;
            op2 = (imm >> rotate) | (imm << (32 - rotate));
        } else {
            uint8_t Rm = instruction & 0xF;
            op2 = registers[Rm];
            
            // Handle shift operations
            uint32_t shiftType = (instruction >> 5) & 0x3;
            uint32_t shiftAmount;
            bool shiftImm = (instruction >> 4) & 0x1;
            
            if (shiftImm) {
                shiftAmount = (instruction >> 7) & 0x1F;
            } else {
                uint8_t Rs = (instruction >> 8) & 0xF;
                shiftAmount = registers[Rs] & 0xFF;
            }
            
            switch (shiftType) {
                case 0x0: op2 = op2 << shiftAmount; break; // LSL
                case 0x1: op2 = op2 >> shiftAmount; break; // LSR
                case 0x2: op2 = (int32_t)op2 >> shiftAmount; break; // ASR
                case 0x3: op2 = (op2 >> shiftAmount) | (op2 << (32 - shiftAmount)); break; // ROR
            }
        }
        
        // Execute operation
        uint32_t result = 0;
        bool carry = false;
        
        switch (op) {
            case 0x0: result = op1 & op2; break; // AND
            case 0x1: result = op1 ^ op2; break; // EOR
            case 0x2: result = op1 - op2; carry = op1 >= op2; break; // SUB
            case 0x3: result = op2 - op1; carry = op2 >= op1; break; // RSB
            case 0x4: result = op1 + op2; carry = (result < op1); break; // ADD
            case 0x5: result = op1 + op2 + ((registers[16] >> 29) & 1); carry = (result < op1); break; // ADC
            case 0x6: result = op1 - op2 - (1 - ((registers[16] >> 29) & 1)); carry = (result < op1); break; // SBC
            case 0x7: result = op2 - op1 - (1 - ((registers[16] >> 29) & 1)); carry = (result < op2); break; // RSC
            case 0x8: result = op1 & op2; S = true; break; // TST
            case 0x9: result = op1 ^ op2; S = true; break; // TEQ
            case 0xA: result = op1 - op2; S = true; carry = op1 >= op2; break; // CMP
            case 0xB: result = op1 + op2; S = true; carry = (result < op1); break; // CMN
            case 0xC: result = op1 | op2; break; // ORR
            case 0xD: result = op2; break; // MOV
            case 0xE: result = op1 & ~op2; break; // BIC
            case 0xF: result = ~op2; break; // MVN
        }
        
        // Update destination register (except for TST, TEQ, CMP, CMN)
        if (op < 0x8 || op > 0xB) {
            if (Rd == 15) {
                // Writing to PC
                pc = result;
            } else {
                registers[Rd] = result;
            }
        }
        
        // Update condition codes if S bit is set
        if (S && (Rd != 15 || op >= 0x8)) {
            uint32_t cpsr = registers[16];
            cpsr &= ~0xF0000000; // Clear condition flags
            cpsr |= ((result >> 31) & 1) << 31; // N
            cpsr |= ((result == 0) ? 1 : 0) << 30; // Z
            cpsr |= (carry ? 1 : 0) << 29; // C
            // V flag calculation would go here for signed overflow
            registers[16] = cpsr;
        }
        
        return true;
    }
    
    // Branch instruction execution
    bool executeBranch(uint32_t instruction) {
        bool L = (instruction >> 24) & 0x1; // Link bit
        int32_t offset = (instruction & 0xFFFFFF) << 2;
        if (offset & 0x2000000) {
            offset |= 0xFC000000; // Sign extend
        }
        
        if (L) {
            lr = pc + 4; // Save return address
            registers[14] = lr;
        }
        
        pc = pc + 8 + offset; // PC is 8 bytes ahead in ARM
        registers[15] = pc;
        
        return true;
    }
    
    // Load/Store instruction execution
    bool executeLoadStore(uint32_t instruction) {
        bool L = (instruction >> 20) & 0x1; // Load (1) or Store (0)
        bool B = (instruction >> 22) & 0x1; // Byte (1) or Word (0)
        uint8_t Rn = (instruction >> 16) & 0xF;
        uint8_t Rd = (instruction >> 12) & 0xF;
        
        uint32_t baseAddr = registers[Rn];
        
        // Calculate address (with offset)
        uint32_t offset = 0;
        bool immediate = (instruction >> 25) & 0x1;
        if (immediate) {
            offset = instruction & 0xFFF;
        } else {
            uint8_t Rm = instruction & 0xF;
            offset = registers[Rm];
        }
        
        bool U = (instruction >> 23) & 0x1; // Up (1) or Down (0)
        bool P = (instruction >> 24) & 0x1; // Pre-indexing (1) or Post-indexing (0)
        
        uint32_t address;
        if (P) {
            address = U ? (baseAddr + offset) : (baseAddr - offset);
        } else {
            address = baseAddr;
        }
        
        if (!memory || address + (B ? 1 : 4) > memorySize) {
            return false;
        }
        
        if (L) {
            // Load
            if (B) {
                registers[Rd] = memory[address];
            } else {
                registers[Rd] = *(uint32_t*)(memory + address);
            }
            if (Rd == 15) {
                pc = registers[Rd];
            }
        } else {
            // Store
            if (B) {
                memory[address] = registers[Rd] & 0xFF;
            } else {
                *(uint32_t*)(memory + address) = registers[Rd];
            }
        }
        
        // Update base register for post-indexing
        if (!P) {
            registers[Rn] = U ? (baseAddr + offset) : (baseAddr - offset);
        }
        
        return true;
    }
};

// C API for JavaScript interop
extern "C" {
    static ARMEmulatorCore* g_emulator = nullptr;
    
    EMSCRIPTEN_KEEPALIVE
    void* createEmulator() {
        if (g_emulator) {
            delete g_emulator;
        }
        g_emulator = new ARMEmulatorCore();
        return g_emulator;
    }
    
    EMSCRIPTEN_KEEPALIVE
    bool initEmulator(void* emu, uint32_t size) {
        if (!emu) return false;
        return static_cast<ARMEmulatorCore*>(emu)->init(size);
    }
    
    EMSCRIPTEN_KEEPALIVE
    bool writeMemory(void* emu, uint32_t address, uint8_t* data, uint32_t length) {
        if (!emu) return false;
        return static_cast<ARMEmulatorCore*>(emu)->writeMemory(address, data, length);
    }
    
    EMSCRIPTEN_KEEPALIVE
    bool readMemory(void* emu, uint32_t address, uint8_t* output, uint32_t length) {
        if (!emu) return false;
        return static_cast<ARMEmulatorCore*>(emu)->readMemory(address, output, length);
    }
    
    EMSCRIPTEN_KEEPALIVE
    void setRegister(void* emu, uint8_t reg, uint32_t value) {
        if (emu) {
            static_cast<ARMEmulatorCore*>(emu)->setRegister(reg, value);
        }
    }
    
    EMSCRIPTEN_KEEPALIVE
    uint32_t getRegister(void* emu, uint8_t reg) {
        if (emu) {
            return static_cast<ARMEmulatorCore*>(emu)->getRegister(reg);
        }
        return 0;
    }
    
    EMSCRIPTEN_KEEPALIVE
    bool executeInstruction(void* emu, uint32_t instruction) {
        if (!emu) return false;
        return static_cast<ARMEmulatorCore*>(emu)->executeInstruction(instruction);
    }
    
    EMSCRIPTEN_KEEPALIVE
    uint32_t executeInstructions(void* emu, uint32_t* instructions, uint32_t count) {
        if (!emu) return 0;
        return static_cast<ARMEmulatorCore*>(emu)->executeInstructions(instructions, count);
    }
    
    EMSCRIPTEN_KEEPALIVE
    uint64_t getInstructionCount(void* emu) {
        if (!emu) return 0;
        return static_cast<ARMEmulatorCore*>(emu)->getInstructionCount();
    }
    
    EMSCRIPTEN_KEEPALIVE
    uint32_t getMemorySize(void* emu) {
        if (!emu) return 0;
        return static_cast<ARMEmulatorCore*>(emu)->getMemorySize();
    }
    
    EMSCRIPTEN_KEEPALIVE
    uint32_t getPC(void* emu) {
        if (!emu) return 0;
        return static_cast<ARMEmulatorCore*>(emu)->getPC();
    }
    
    EMSCRIPTEN_KEEPALIVE
    void setPC(void* emu, uint32_t value) {
        if (emu) {
            static_cast<ARMEmulatorCore*>(emu)->setPC(value);
        }
    }
    
    EMSCRIPTEN_KEEPALIVE
    void destroyEmulator(void* emu) {
        if (emu == g_emulator) {
            delete g_emulator;
            g_emulator = nullptr;
        }
    }
}

