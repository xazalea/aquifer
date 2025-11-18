# Android VM Setup Guide

## Current Implementation

We're using **CheerpX** (x86 virtualization) with **WebVM's Debian disk image** to create a real Linux VM in the browser. This provides:

- ✅ Real Linux filesystem (Debian)
- ✅ Full command execution
- ✅ Ability to install Android emulator inside Linux
- ✅ Docker support (can run EmuHub)

## How It Works

1. **CheerpX loads Debian disk image** from WebVM's CDN
   - URL: `wss://disks.webvm.io/debian_large_20230522_5044875331.ext2`
   - This is a real ext2 filesystem with Debian Linux installed

2. **Linux VM is created** with proper mount points:
   - `/` - Root filesystem (ext2, writable via overlay)
   - `/web` - Web server files
   - `/data` - JavaScript data
   - `/dev`, `/proc`, `/sys` - Linux device filesystems

3. **Commands can be executed** in the Linux VM
   - Full bash shell
   - Can install packages via apt
   - Can run Docker (if available)

## Installing Android Emulator

Once the Linux VM is running, you can install Android emulator:

### Option 1: Install Android-x86 in QEMU

```bash
# Inside the Linux VM
sudo apt-get update
sudo apt-get install -y qemu-system-x86

# Download Android-x86 ISO
wget https://www.android-x86.org/releases/android-x86-9.0-r2.iso

# Run Android in QEMU
qemu-system-x86_64 -m 2048 -cdrom android-x86-9.0-r2.iso -boot d
```

### Option 2: Use Android Emulator (AOSP)

```bash
# Install Android SDK
sudo apt-get install -y openjdk-11-jdk
wget https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip
unzip commandlinetools-linux-9477386_latest.zip

# Setup Android SDK
export ANDROID_HOME=$HOME/android-sdk
mkdir -p $ANDROID_HOME/cmdline-tools
mv cmdline-tools $ANDROID_HOME/cmdline-tools/latest

# Install emulator
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "emulator" "platform-tools" "platforms;android-30"

# Create and run AVD
$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager create avd -n test -k "system-images;android-30;google_apis;x86_64"
$ANDROID_HOME/emulator/emulator -avd test
```

### Option 3: Use Docker with Android Emulator

```bash
# Install Docker (if not available)
sudo apt-get install -y docker.io

# Run Android emulator in Docker
docker run -d -p 5900:5900 -p 6080:6080 budtmo/docker-android-x86-8.1
```

## Current Status

✅ **CheerpX integration** - Real x86 virtualization
✅ **Debian disk image** - Full Linux filesystem
✅ **Command execution** - Can run Linux commands
⚠️ **Android emulator** - Needs to be installed inside Linux VM

## Next Steps

1. **Test Linux VM** - Verify commands work
2. **Install Android emulator** - Choose one of the options above
3. **Configure networking** - For Android apps to work
4. **Integrate with UI** - Display Android screen in browser

## Troubleshooting

### "Could not mount FS type: ext2"
- **Cause**: Disk image not loaded or Cross-Origin Isolation not enabled
- **Fix**: Ensure COEP/COOP headers are set, check disk image URL

### "Device does not exist"
- **Cause**: Block device creation failed
- **Fix**: Check network connection, try HTTP fallback

### Commands not working
- **Cause**: Linux VM not initialized
- **Fix**: Call `init()` first, wait for VM creation

## References

- [WebVM Disk Images](https://github.com/leaningtech/webvm/releases)
- [CheerpX Documentation](https://cheerpx.io/docs)
- [Android-x86](https://www.android-x86.org/)
- [QEMU Documentation](https://www.qemu.org/documentation/)

