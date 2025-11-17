# Aquifer

A web-based Android VM that runs in your browser, allowing you to run APKs and Android OS directly in the browser.

## Features

- 🚀 Run Android OS in your browser
- 📱 Install and run APK files
- 🎮 Full Android emulation experience
- 🌐 No server-side processing required (client-side only)

## Getting Started

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Deployment

This app is configured for Vercel deployment. Simply push to your repository and connect it to Vercel.

## Architecture

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **APK Parser**: Real APK file parsing and extraction
- **DEX Parser**: Android bytecode (DEX) file parsing
- **Dalvik VM**: Functional Dalvik Virtual Machine for executing Android apps
- **Android Framework**: System classes and services
- **Client-side emulation**: All processing happens in the browser

## Real Android Emulation

This project now includes **real Android emulation capabilities**:

### ✅ Implemented Features

- **APK Parsing**: Extracts DEX files, manifest, and resources from APK files
- **DEX Execution**: Parses and executes Android Dalvik bytecode
- **Dalvik VM**: Functional virtual machine for running Android apps
- **Android Framework**: System classes (Activity, Context, System, etc.)
- **App Installation**: Real APK installation with DEX loading
- **App Launching**: Execute apps through the Dalvik VM

### 🔧 How It Works

1. **Upload APK**: User uploads an APK file
2. **Parse APK**: System extracts DEX files and resources
3. **Parse DEX**: DEX files are parsed to extract classes and methods
4. **Load into VM**: Classes are loaded into the Dalvik VM
5. **Execute**: Apps can be launched and executed

See `INTEGRATION_COMPLETE.md` for detailed documentation.

## Inspiration

This project is inspired by:
- [webos_dalvik](https://github.com/kai4785/webos_dalvik) - Dalvik VM porting
- [android-vm-webrtc](https://github.com/appdevperev/android-vm-webrtc) - Android VM with WebRTC
- [windows-on-web](https://github.com/luybe21br/windows-on-web) - Windows in browser
- [webvm](https://github.com/leaningtech/webvm) - Web-based VM
- [v86](https://github.com/copy/v86) - x86 emulator in browser

