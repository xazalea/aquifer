# Gaming Optimizations

## Overview

Aquifer has been enhanced with comprehensive gaming optimizations for **3D games** and **multiplayer gaming** with minimal lag and crashes.

## Key Features

### 1. Low-Latency Input Handling (`lib/gaming-optimizer.ts`)

**Problem:** Input lag makes games feel unresponsive.

**Solution:**
- Immediate input processing (no queuing delays)
- Input events dispatched instantly
- Configurable max latency (default: 16ms for 60 FPS)

**Usage:**
```typescript
import { gamingOptimizer } from '@/lib/gaming-optimizer'

// Handle input with low latency
gamingOptimizer.handleInput('touch', { x: 100, y: 200 })
```

### 2. Optimized WebGL Rendering (`lib/game-renderer.ts`)

**Problem:** WebGL performance issues cause frame drops.

**Solution:**
- WebGL2 with optimal context settings
- Texture compression support
- Shader program caching
- Texture caching
- VSync control
- Power preference for dedicated GPU

**Features:**
- Automatic extension detection and enabling
- Optimal WebGL state configuration
- Mipmap generation for textures
- Efficient texture management

**Usage:**
```typescript
import { GameRenderer } from '@/lib/game-renderer'

const renderer = new GameRenderer({
  canvas: canvasElement,
  enableVSync: true,
  enableTextureCompression: true,
})

// Create cached shader
const program = renderer.createShaderProgram(vertexShader, fragmentShader, 'my-shader')

// Create cached texture
const texture = renderer.createTexture(image, 'my-texture')

// Start render loop
renderer.startRenderLoop((deltaTime) => {
  // Render frame
})
```

### 3. Multiplayer Network Optimization (`lib/multiplayer-network.ts`)

**Problem:** Network lag ruins multiplayer games.

**Solution:**
- WebSocket with binary protocol
- Message compression
- Reliable/unreliable message channels
- Automatic reconnection
- Latency measurement
- Message queuing for offline periods

**Features:**
- Low-latency unreliable messages for game state
- Reliable messages for critical events
- Automatic reconnection with exponential backoff
- Ping/pong for latency tracking

**Usage:**
```typescript
import { MultiplayerNetwork } from '@/lib/multiplayer-network'

const network = new MultiplayerNetwork({
  serverUrl: 'wss://game-server.com',
  enableCompression: true,
  enablePrediction: true,
})

await network.connect()

// Send unreliable message (low latency)
network.sendUnreliable({ type: 'player-move', x: 100, y: 200 })

// Send reliable message (guaranteed)
network.sendReliable({ type: 'player-action', action: 'jump' })

// Handle messages
network.on('game-state', (data, timestamp) => {
  // Update game state
})
```

### 4. Game Crash Recovery (`lib/game-crash-recovery.ts`)

**Problem:** Game crashes lose player progress.

**Solution:**
- Automatic state saving
- Crash detection
- State restoration
- Auto-save every 30 seconds
- IndexedDB persistence

**Features:**
- Detects unhandled errors and promise rejections
- Saves game state automatically
- Restores state after crash
- Crash report logging

**Usage:**
```typescript
import { gameCrashRecovery } from '@/lib/game-crash-recovery'

// Save game state
gameCrashRecovery.saveState({
  playerPosition: { x: 100, y: 200 },
  score: 5000,
  level: 3,
})

// Enable auto-save
gameCrashRecovery.enableAutoSave(() => {
  return getCurrentGameState()
})
```

### 5. Audio Support (`lib/gaming-optimizer.ts`)

**Problem:** Games need audio with low latency.

**Solution:**
- Low-latency AudioContext
- Audio buffer preloading
- Immediate audio playback
- Volume control

**Usage:**
```typescript
// Preload audio
const audioBuffer = await gamingOptimizer.preloadAsset('sound.mp3', 'audio')

// Play audio with low latency
gamingOptimizer.playAudio(audioBuffer, 0.8) // 80% volume
```

### 6. Frame Timing Control (`lib/gaming-optimizer.ts`)

**Problem:** Inconsistent frame rates cause stuttering.

**Solution:**
- Frame timing measurement
- FPS calculation
- Frame rate stability checking
- VSync control

**Usage:**
```typescript
// Start frame timing
const stopTiming = gamingOptimizer.startFrameTiming()

// In render loop
const frameTime = stopTiming()
const fps = gamingOptimizer.getFPS()
const isStable = gamingOptimizer.isFrameRateStable()
```

### 7. Asset Preloading (`lib/gaming-optimizer.ts`)

**Problem:** Loading assets during gameplay causes stuttering.

**Solution:**
- Preload images, audio, JSON, binary files
- Parallel loading
- Asset caching
- Background preloading

**Usage:**
```typescript
// Preload single asset
const image = await gamingOptimizer.preloadAsset('texture.png', 'image')

// Preload multiple assets
await gamingOptimizer.preloadAssets([
  { url: 'texture1.png', type: 'image' },
  { url: 'texture2.png', type: 'image' },
  { url: 'sound.mp3', type: 'audio' },
])
```

## Enhanced Game Engine

The `GameEngine` class has been enhanced to use all gaming optimizations:

```typescript
import { GameEngine } from '@/lib/game-engine'

const gameEngine = new GameEngine(canvas)

// Start game with multiplayer support
await gameEngine.startGame('com.example.game', dexFiles, 'wss://game-server.com')

// Handle input with low latency
gameEngine.handleInput('touch', { x: 100, y: 200 })

// Play sound
gameEngine.playSound(audioBuffer, 0.8)
```

## Performance Targets

### Frame Rate
- **Target:** 60 FPS stable
- **Minimum:** 30 FPS (with frame skipping)
- **VSync:** Enabled by default

### Latency
- **Input Latency:** < 16ms (1 frame at 60 FPS)
- **Network Latency:** < 100ms (for multiplayer)
- **Audio Latency:** < 50ms

### Memory
- **Texture Cache:** Automatic cleanup
- **Shader Cache:** Persistent across frames
- **Asset Preloading:** Configurable limits

## Best Practices

### 1. Preload Assets Before Game Start
```typescript
// Preload all game assets before starting
await gamingOptimizer.preloadAssets([
  { url: 'textures/player.png', type: 'image' },
  { url: 'textures/enemy.png', type: 'image' },
  { url: 'sounds/jump.mp3', type: 'audio' },
])

// Then start game
gameEngine.startGame(...)
```

### 2. Use Unreliable Messages for Frequent Updates
```typescript
// Player position updates (frequent, can be dropped)
network.sendUnreliable({ type: 'position', x: 100, y: 200 })

// Player actions (infrequent, must be reliable)
network.sendReliable({ type: 'action', action: 'shoot' })
```

### 3. Save State Regularly
```typescript
// Save state after important events
gameCrashRecovery.saveState({
  level: currentLevel,
  score: currentScore,
  playerPosition: player.position,
})
```

### 4. Monitor Performance
```typescript
// Check FPS regularly
const fps = gamingOptimizer.getFPS()
if (fps < 30) {
  // Reduce quality or enable frame skipping
}

// Check network latency
const latency = network.getLatency()
if (latency > 200) {
  // Show lag warning to player
}
```

## Testing

### Frame Rate Test
```typescript
const fps = gamingOptimizer.getFPS()
console.log(`Current FPS: ${fps}`)
console.log(`Stable: ${gamingOptimizer.isFrameRateStable()}`)
```

### Latency Test
```typescript
const latency = await gamingOptimizer.measureLatency()
console.log(`Network latency: ${latency}ms`)
```

### Crash Recovery Test
```typescript
// Simulate crash
throw new Error('Test crash')

// Check if state was restored
const restored = gameCrashRecovery.restoreState()
console.log('State restored:', restored)
```

## Troubleshooting

### Low FPS
1. Check if VSync is enabled
2. Reduce texture sizes
3. Enable frame skipping
4. Disable antialiasing
5. Check GPU usage

### High Input Latency
1. Enable low-latency mode
2. Reduce input queue size
3. Process input immediately
4. Check browser performance

### Network Lag
1. Check server latency
2. Enable compression
3. Use unreliable messages for frequent updates
4. Implement client-side prediction

### Crashes
1. Check crash reports: `gameCrashRecovery.getCrashReports()`
2. Enable auto-save
3. Save state before risky operations
4. Check WebGL context loss handling

## Future Enhancements

1. **Client-Side Prediction** - Predict player movement before server confirmation
2. **Interpolation** - Smooth movement between network updates
3. **Lag Compensation** - Account for network delay in game logic
4. **WebWorker Integration** - Offload game logic to workers
5. **WebAssembly Game Code** - Compile game logic to WASM for better performance

