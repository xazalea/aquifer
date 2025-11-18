# EmuHub Integration Testing Guide

## Overview

This document outlines the testing strategy for the EmuHub integration to ensure it works reliably as the default emulation mode.

## Testing Checklist

### 1. Connection Testing

- [ ] **Local EmuHub Server**
  - Start EmuHub Docker container locally: `docker run -d -p 8000:8000 --privileged mohamedhelmy/emuhub:latest`
  - Verify Aquifer connects to `http://localhost:8000`
  - Check console for connection success messages

- [ ] **WebVM + EmuHub**
  - Verify WebVM initializes (if available)
  - Check Docker container creation in WebVM
  - Verify EmuHub container starts inside WebVM
  - Check health endpoint responses

- [ ] **Fallback Behavior**
  - When EmuHub is unavailable, verify graceful fallback to browser emulation
  - No error states shown to user
  - Smooth transition between modes

### 2. Emulator Creation

- [ ] **Auto-Creation**
  - Verify emulator is created automatically on first use
  - Check emulator status transitions: `starting` → `running`
  - Verify VNC URL is generated correctly

- [ ] **Multiple Emulators**
  - Test creating multiple emulators
  - Verify each has unique ID and VNC URL
  - Check emulator list refresh

### 3. VNC Viewer

- [ ] **Display**
  - Verify VNC viewer loads in iframe
  - Check fullscreen display
  - Verify touch/mouse input works
  - Test keyboard input

- [ ] **Loading States**
  - Show loading spinner while waiting for emulator
  - Display helpful messages during initialization
  - Handle timeout gracefully

### 4. APK Installation

- [ ] **Upload**
  - Test APK upload via file input
  - Test APK installation from App Store
  - Verify installation progress indicators

- [ ] **Installation Flow**
  - Check APK is sent to EmuHub API
  - Verify installation completes
  - Test app appears in emulator

### 5. Mode Switching

- [ ] **Browser → EmuHub**
  - Switch from browser mode to EmuHub
  - Verify clean transition
  - Check no memory leaks

- [ ] **EmuHub → Browser**
  - Switch from EmuHub to browser mode
  - Verify EmuHub container stops
  - Check browser emulator initializes

### 6. Error Handling

- [ ] **Connection Failures**
  - Test with EmuHub server down
  - Verify graceful fallback
  - Check error messages are user-friendly

- [ ] **Timeout Handling**
  - Test slow network conditions
  - Verify timeouts are handled
  - Check retry logic works

### 7. Performance

- [ ] **Startup Time**
  - Measure time to first emulator display
  - Check for performance regressions
  - Verify no blocking operations

- [ ] **Memory Usage**
  - Monitor memory during emulator use
  - Check for memory leaks
  - Verify cleanup on mode switch

## Test Scenarios

### Scenario 1: First-Time User
1. Open Aquifer
2. EmuHub mode is default (webvm-emuhub)
3. System tries to connect to EmuHub
4. If unavailable, falls back to browser mode
5. User can still use the app

**Expected**: Smooth experience, no errors

### Scenario 2: EmuHub Available
1. EmuHub server running on localhost:8000
2. Aquifer connects successfully
3. Emulator is created/retrieved
4. VNC viewer displays Android emulator
5. User can install and run APKs

**Expected**: Full Android emulation works

### Scenario 3: WebVM Available
1. WebVM is loaded and initialized
2. Docker starts in WebVM
3. EmuHub container runs in WebVM
4. Emulator accessible via VNC

**Expected**: Complete browser-based Android emulation

### Scenario 4: Mode Switching
1. Start in EmuHub mode
2. Switch to browser mode
3. Switch back to EmuHub mode
4. Verify both modes work

**Expected**: Clean transitions, no errors

## Debugging

### Console Logs to Watch

- `🚀 Initializing WebVM + EmuHub integration...`
- `✅ Connected to existing EmuHub server at...`
- `📦 No existing EmuHub server found, trying WebVM...`
- `✅ WebVM + EmuHub integration initialized successfully`
- `📱 Getting or creating Android emulator...`
- `✅ WebVM + EmuHub emulation initialized:`
- `📺 VNC URL:`

### Common Issues

1. **Connection Refused**
   - EmuHub server not running
   - Wrong port number
   - Firewall blocking connection

2. **VNC URL Not Available**
   - Emulator still starting
   - Check emulator status
   - Wait for emulator to be ready

3. **WebVM Not Available**
   - WebVM library not loaded
   - Check `load-webvm.js` script
   - Verify WebVM is available globally

## Success Criteria

✅ EmuHub is the default mode
✅ Connection to EmuHub works (local or WebVM)
✅ Emulator creation/retrieval works
✅ VNC viewer displays correctly
✅ APK installation works
✅ Mode switching is smooth
✅ Graceful fallback to browser mode
✅ No console errors
✅ Good user experience

## Next Steps

After thorough testing:
1. Document any issues found
2. Fix critical bugs
3. Optimize performance
4. Update user documentation
5. Deploy to production

