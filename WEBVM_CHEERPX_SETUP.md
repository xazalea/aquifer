# WebVM/CheerpX Real Integration Setup

## Overview

This document explains how to set up **real** WebVM/CheerpX integration (not simulated) to enable actual Docker container execution in the browser for full Android emulation.

## What is CheerpX?

**CheerpX** is Leaning Technologies' x86 virtualization engine that runs in WebAssembly. It enables:
- Running unmodified Linux binaries in the browser
- Docker container execution
- Full x86 compatibility

**WebVM** is an open-source project built on CheerpX that provides a complete Linux environment.

**BrowserPod** is a commercial product (also from Leaning Technologies) built on CheerpX for running development environments.

## Integration Options

### Option 1: Build WebVM (Recommended for Open Source)

WebVM is open source and can be built from source:

1. **Clone WebVM repository:**
   ```bash
   git clone https://github.com/leaningtech/webvm.git
   cd webvm
   ```

2. **Build WebVM:**
   ```bash
   npm install
   npm run build
   ```

3. **Copy built files to Aquifer:**
   ```bash
   cp dist/webvm.js /path/to/aquifer/public/webvm.js
   cp dist/webvm.wasm /path/to/aquifer/public/webvm.wasm
   # Copy other required files (check WebVM docs)
   ```

4. **WebVM will be automatically loaded** from `/public/webvm.js`

### Option 2: Use BrowserPod SDK (When Available)

BrowserPod SDK will be available for General Availability in November 2025:

1. **Register for BrowserPod:**
   - Visit: https://browserpod.io/
   - Register your interest
   - Get SDK access when available

2. **Integrate BrowserPod SDK:**
   - Load BrowserPod SDK script
   - Initialize with your API key
   - Use BrowserPod's Pod runtime for Docker

3. **Update `load-cheerpx.js`** to include BrowserPod SDK URL

### Option 3: Use CheerpX Directly

CheerpX is available from Leaning Technologies:

1. **Contact Leaning Technologies:**
   - Visit: https://leaningtech.com/cheerpx/
   - Request CheerpX license/access
   - Get CheerpX SDK

2. **Integrate CheerpX:**
   - Load CheerpX script
   - Initialize CheerpX instance
   - Use CheerpX for Docker operations

## Current Implementation

The current implementation:

1. **Tries to load CheerpX/WebVM/BrowserPod** from multiple sources
2. **Uses real Docker execution** (no simulation) when available
3. **Falls back gracefully** to browser emulation if not available

## Files

- `lib/cheerpx-integration.ts` - CheerpX integration class
- `public/load-cheerpx.js` - Script loader for CheerpX/WebVM/BrowserPod
- `lib/webvm-emuhub-integration.ts` - Updated to use real CheerpX

## Verification

To verify real Docker is working:

1. Open browser console
2. Look for: `✅ CheerpX initialized - using real Docker support`
3. Check for: `✅ Docker is available in WebVM/CheerpX`
4. Verify: `✅ EmuHub container created (REAL)`

If you see `⚠️` warnings about simulation, Docker is not actually running.

## Troubleshooting

### "CheerpX/WebVM/BrowserPod not available"

**Solution:** Build WebVM from source or wait for BrowserPod SDK

### "Docker not available"

**Solution:** Ensure WebVM/CheerpX includes Docker support. Some builds may not include Docker.

### "Container creation fails"

**Solution:** 
- Check Docker daemon is running in WebVM
- Verify container image is available
- Check network connectivity

## Next Steps

1. **Build WebVM** from source (recommended)
2. **Or wait for BrowserPod SDK** (November 2025)
3. **Or contact Leaning Technologies** for CheerpX access

Once real WebVM/CheerpX is available, EmuHub will run actual Docker containers in the browser!

