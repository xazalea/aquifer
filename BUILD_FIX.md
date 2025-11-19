# Build Fix - WASM Module Loading

## Issue

Next.js build was failing with:
```
Module not found: Can't resolve '/wasm/emulator.js'
```

## Root Cause

Next.js cannot import files from the `public` directory as modules during build time. Files in `public` are served statically and must be loaded at runtime.

## Solution

Changed WASM loading to:
1. **Runtime-only loading** - Only load in browser, not during SSR/build
2. **Script tag approach** - Use `<script>` tags for Emscripten-generated modules
3. **Graceful fallback** - Handle missing WASM files gracefully

## Changes Made

### `lib/wasm-bridge.ts`
- Changed from `import('/wasm/emulator.js')` to script tag loading
- Added browser check (`typeof window === 'undefined'`)
- Use Emscripten's `locateFile` callback for WASM path

### `lib/go-wasm-bridge.ts`
- Changed from `import('/wasm/wasm_exec.js')` to script tag loading
- Added browser check
- Proper error handling

## Building WASM Files

WASM files must be built **before** deploying:

```bash
# Build C++ WASM
npm run build:wasm

# Build Go WASM
npm run build:go-wasm

# Or build all
npm run build:all
```

The built files should be committed to `public/wasm/`:
- `public/wasm/emulator.js`
- `public/wasm/emulator.wasm`
- `public/wasm/vm-orchestrator.wasm`
- `public/wasm/wasm_exec.js`

## Vercel Deployment

For Vercel deployments:

1. **Pre-build WASM files** locally or in CI
2. **Commit built files** to `public/wasm/`
3. **Vercel will serve them** as static assets

The `.vercelignore` file ensures source files aren't processed during build.

## Runtime Behavior

- If WASM files are missing, the emulator gracefully falls back to:
  1. Unicorn Engine (if available)
  2. JavaScript fallback (arm-js)

- The build will succeed even if WASM files aren't present
- WASM loading only happens in the browser at runtime

## Testing

```bash
# Build WASM files
npm run build:all

# Verify files exist
ls -la public/wasm/

# Build Next.js
npm run build

# Should succeed now!
```

