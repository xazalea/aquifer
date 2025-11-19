# Blazor WebAssembly Alternative - Complete Setup Guide

If you decide to go with Blazor WebAssembly instead of the hybrid approach, here's how to set it up.

## Why Consider Blazor?

- **C# Performance** - Better than JavaScript for CPU-intensive emulation
- **Strong Typing** - Catch errors at compile time
- **Rich Ecosystem** - .NET libraries available
- **Better Memory Management** - More predictable than JavaScript GC
- **Familiar Syntax** - If you know C#, easier than C++

## Project Structure

```
aquifer-blazor/
├── Client/                    # Blazor WebAssembly
│   ├── Components/            # Razor components
│   │   ├── AndroidVM.razor
│   │   ├── ControlPanel.razor
│   │   └── AppStore.razor
│   ├── Services/              # Emulation services
│   │   ├── AndroidEmulatorService.cs
│   │   ├── APKParserService.cs
│   │   └── DalvikVMService.cs
│   ├── Models/                # Data models
│   │   ├── APKInfo.cs
│   │   └── InstalledApp.cs
│   ├── wwwroot/               # Static assets
│   │   ├── index.html
│   │   ├── css/
│   │   └── js/
│   ├── Program.cs
│   └── App.razor
├── Shared/                    # Shared code
│   └── Models/
└── Server/                    # Optional ASP.NET Core backend
    └── Controllers/
```

## Step 1: Install .NET SDK

```bash
# macOS
brew install --cask dotnet-sdk

# Or download from https://dotnet.microsoft.com/download
```

## Step 2: Create Blazor WebAssembly Project

```bash
# Create new Blazor WebAssembly project
dotnet new blazorwasm -n AquiferBlazor -o aquifer-blazor

cd aquifer-blazor
```

## Step 3: Project Structure

### Client/Program.cs

```csharp
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using AquiferBlazor.Client;
using AquiferBlazor.Client.Services;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

// Register services
builder.Services.AddScoped(sp => new HttpClient 
{ 
    BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) 
});
builder.Services.AddScoped<AndroidEmulatorService>();
builder.Services.AddScoped<APKParserService>();
builder.Services.AddScoped<DalvikVMService>();

await builder.Build().RunAsync();
```

### Client/Services/AndroidEmulatorService.cs

```csharp
using System;
using System.Threading.Tasks;
using Microsoft.JSInterop;

namespace AquiferBlazor.Client.Services
{
    public class AndroidEmulatorService
    {
        private readonly IJSRuntime _jsRuntime;
        private bool _isRunning = false;
        
        public AndroidEmulatorService(IJSRuntime jsRuntime)
        {
            _jsRuntime = jsRuntime;
        }
        
        public async Task InitializeAsync(string canvasId)
        {
            await _jsRuntime.InvokeVoidAsync("initCanvas", canvasId);
        }
        
        public async Task StartAsync()
        {
            if (_isRunning) return;
            
            _isRunning = true;
            await _jsRuntime.InvokeVoidAsync("startEmulator");
        }
        
        public async Task StopAsync()
        {
            if (!_isRunning) return;
            
            _isRunning = false;
            await _jsRuntime.InvokeVoidAsync("stopEmulator");
        }
        
        public async Task InstallAPKAsync(byte[] apkData)
        {
            // Parse APK in C#
            var parser = new APKParserService();
            var apkInfo = await parser.ParseAPKAsync(apkData);
            
            // Install via JavaScript interop
            await _jsRuntime.InvokeVoidAsync("installAPK", apkInfo);
        }
    }
}
```

### Client/Services/APKParserService.cs

```csharp
using System;
using System.IO;
using System.IO.Compression;
using System.Threading.Tasks;
using AquiferBlazor.Shared.Models;

namespace AquiferBlazor.Client.Services
{
    public class APKParserService
    {
        public async Task<APKInfo> ParseAPKAsync(byte[] apkData)
        {
            return await Task.Run(() =>
            {
                using var stream = new MemoryStream(apkData);
                using var archive = new ZipArchive(stream, ZipArchiveMode.Read);
                
                var info = new APKInfo();
                
                // Extract AndroidManifest.xml
                var manifestEntry = archive.GetEntry("AndroidManifest.xml");
                if (manifestEntry != null)
                {
                    using var manifestStream = manifestEntry.Open();
                    // Parse manifest...
                }
                
                // Extract DEX files
                foreach (var entry in archive.Entries)
                {
                    if (entry.Name.EndsWith(".dex"))
                    {
                        using var dexStream = entry.Open();
                        // Parse DEX...
                    }
                }
                
                return info;
            });
        }
    }
}
```

### Client/Components/AndroidVM.razor

```razor
@using AquiferBlazor.Client.Services
@inject AndroidEmulatorService EmulatorService
@inject IJSRuntime JSRuntime

<div class="android-vm-container">
    <canvas id="android-canvas" 
            @ref="canvasRef"
            @onmousedown="HandleMouseDown"
            @onmousemove="HandleMouseMove"
            @onmouseup="HandleMouseUp"
            @ontouchstart="HandleTouchStart"
            @ontouchmove="HandleTouchMove"
            @ontouchend="HandleTouchEnd">
    </canvas>
    
    <div class="controls">
        <button @onclick="StartVM" disabled="@isRunning">Start VM</button>
        <button @onclick="StopVM" disabled="@!isRunning">Stop VM</button>
    </div>
</div>

@code {
    private ElementReference canvasRef;
    private bool isRunning = false;
    
    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (firstRender)
        {
            await EmulatorService.InitializeAsync("android-canvas");
        }
    }
    
    private async Task StartVM()
    {
        await EmulatorService.StartAsync();
        isRunning = true;
        StateHasChanged();
    }
    
    private async Task StopVM()
    {
        await EmulatorService.StopAsync();
        isRunning = false;
        StateHasChanged();
    }
    
    private void HandleMouseDown(MouseEventArgs e) { }
    private void HandleMouseMove(MouseEventArgs e) { }
    private void HandleMouseUp(MouseEventArgs e) { }
    private void HandleTouchStart(TouchEventArgs e) { }
    private void HandleTouchMove(TouchEventArgs e) { }
    private void HandleTouchEnd(TouchEventArgs e) { }
}
```

### Client/wwwroot/js/emulator.js

```javascript
// JavaScript interop for WebGL and Canvas
window.initCanvas = (canvasId) => {
    const canvas = document.getElementById(canvasId);
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    // Initialize WebGL...
};

window.startEmulator = () => {
    // Start emulator rendering loop
};

window.stopEmulator = () => {
    // Stop emulator
};

window.installAPK = (apkInfo) => {
    // Install APK
};
```

## Step 4: WebGL Integration

Since Blazor doesn't have direct WebGL bindings, use JavaScript interop:

```csharp
// Client/Services/WebGLService.cs
public class WebGLService
{
    private readonly IJSRuntime _jsRuntime;
    
    public async Task<int> CreateShaderAsync(int type, string source)
    {
        return await _jsRuntime.InvokeAsync<int>("createShader", type, source);
    }
    
    public async Task UseProgramAsync(int program)
    {
        await _jsRuntime.InvokeVoidAsync("useProgram", program);
    }
}
```

## Step 5: Performance Optimization

### AOT Compilation (Ahead-of-Time)

```xml
<!-- Client/AquiferBlazor.Client.csproj -->
<PropertyGroup>
  <RunAOTCompilation>true</RunAOTCompilation>
</PropertyGroup>
```

This compiles C# to WebAssembly for better performance, but increases bundle size.

### Trim Unused Code

```xml
<PropertyGroup>
  <PublishTrimmed>true</PublishTrimmed>
</PropertyGroup>
```

## Step 6: Build and Run

```bash
# Development
dotnet run --project Client/AquiferBlazor.Client.csproj

# Production build
dotnet publish -c Release
```

## Migration Strategy

### Phase 1: Port Core Logic
1. Port `APKParser` to C#
2. Port `DEXParser` to C#
3. Port `DalvikVM` to C#

### Phase 2: Port UI
1. Convert React components to Razor
2. Port state management
3. Port event handlers

### Phase 3: Optimize
1. Enable AOT compilation
2. Optimize memory usage
3. Add WebGL rendering

## Pros and Cons

### Pros
- ✅ Better performance for CPU-intensive tasks
- ✅ Strong typing prevents bugs
- ✅ Rich .NET ecosystem
- ✅ Better memory management

### Cons
- ❌ Complete rewrite required
- ❌ Larger bundle size (~2-5MB)
- ❌ Slower initial load
- ❌ Smaller community for web projects
- ❌ JavaScript interop needed for WebGL/DOM

## Recommendation

**Use Blazor if:**
- You're comfortable with C#
- You want strong typing throughout
- You're willing to do a complete rewrite
- Performance is critical and you can accept larger bundle size

**Use Hybrid (WASM + TypeScript) if:**
- You want to keep React/Next.js
- You want incremental migration
- You want smaller bundle size
- You want faster startup time

## Next Steps

1. Create proof-of-concept Blazor project
2. Port one component (e.g., APK parser)
3. Measure performance vs TypeScript
4. Decide based on results

