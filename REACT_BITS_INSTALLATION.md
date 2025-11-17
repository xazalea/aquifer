# React Bits Component Installation Guide

This guide explains how to install ALL React Bits components into the Aquifer project.

## ⚠️ Important Note

**This project uses CSS Modules (not Tailwind CSS)**, which means:
- ❌ `shadcn` CLI won't work (requires Tailwind CSS)
- ✅ `jsrepo` CLI should work (try it first)
- ✅ Manual installation always works (copy from website)

## Overview

React Bits provides over 110 animated and interactive React components. This project includes multiple methods to install them.

## Installation Methods

### Method 1: jsrepo (Recommended - Try This First)

Uses the `jsrepo` CLI tool (doesn't require Tailwind):

```bash
npm run install-react-bits
```

Or directly:
```bash
node scripts/install-react-bits.js
```

**Note**: If this fails, try Method 3 (Manual Installation).

### Method 2: Direct Fetch (Experimental)

Attempts to directly fetch components from React Bits:

```bash
npm run install-react-bits-direct
```

**Note**: This may not work if React Bits doesn't expose a public API.

### Method 3: Manual Installation (Always Works)

Generate a guide with all component links:

```bash
npm run install-react-bits-manual
```

This creates `REACT_BITS_MANUAL_INSTALL.md` with:
- Direct links to each component
- Copy-paste ready commands
- Step-by-step instructions

Then visit https://reactbits.dev and copy components manually.

### ❌ Method 4: shadcn (Won't Work)

**This method requires Tailwind CSS and will fail** because this project uses CSS Modules instead.

If you see errors like "No Tailwind CSS configuration found", use Method 1 or Method 3 instead.

## Component Categories

The installation script installs components from these categories:

### 📝 Text Animations (17 components)
- SplitText, TextAnimate, LineShadowText, AuroraText
- NumberTicker, AnimatedShinyText, AnimatedGradientText
- TextReveal, HyperText, WordRotate, TypingAnimation
- ScrollBasedVelocity, FlipText, BoxReveal
- SparklesText, MorphingText, SpinningText

### 🔘 Buttons (7 components)
- RainbowButton, ShimmerButton, ShinyButton
- InteractiveHoverButton, AnimatedSubscribeButton
- PulsatingButton, RippleButton

### 🎨 Backgrounds (8 components)
- WarpBackground, FlickeringGrid, AnimatedGridPattern
- RetroGrid, Ripple, DotPattern
- GridPattern, InteractiveGridPattern

### 🧩 UI Components (19 components)
- Marquee, Terminal, HeroVideoDialog, BentoGrid
- AnimatedList, Dock, Globe, TweetCard
- ClientTweetCard, OrbitingCircles, AvatarCircles
- IconCloud, AnimatedCircularProgressBar
- FileTree, CodeComparison, ScriptCopyBtn
- ScrollProgress, Lens, Pointer

### ✨ Special Effects (10 components)
- AnimatedBeam, BorderBeam, ShineBorder
- MagicCard, Meteors, NeonGradientCard
- Confetti, Particles, CoolMode, ScratchToReveal

### 🎬 Animations (1 component)
- BlurFade

### 📱 Device Mocks (3 components)
- Safari, Iphone15Pro, Android

**Total: 65+ components**

## Project Configuration

This project uses:
- **TypeScript** (`.tsx` files)
- **CSS Modules** (`.module.css` files)
- **No Tailwind CSS**

Therefore, components are installed using the `ts/default` variant (TypeScript + Plain CSS).

## Installation Process

1. **Run the installation script**:
   ```bash
   npm run install-react-bits
   ```

2. **Wait for completion**: The script will install all components sequentially.

3. **Check results**: After completion, check `react-bits-install-results.json` for a summary.

4. **Components location**: Components will be installed in your `components/` directory (or as configured by jsrepo/shadcn).

## Manual Installation

If you prefer to install components individually:

### Using jsrepo:
```bash
npx jsrepo add https://reactbits.dev/ts/default/TextAnimations/SplitText
```

### Using shadcn:
```bash
npx shadcn@latest add https://reactbits.dev/r/SplitText-TS-CSS
```

## Troubleshooting

### Installation Fails

If a component fails to install:

1. **Check the error message** in the console
2. **Verify the component name** exists on React Bits
3. **Try manual installation** for that specific component
4. **Check network connection** - components are fetched from reactbits.dev

### Component Not Found

Some components may have different names or may not exist. The script will continue with other components.

### Rate Limiting

If you experience rate limiting, you can:
1. Add delays between installations (uncomment delay in script)
2. Install components in smaller batches
3. Use manual installation for specific components

## Using Installed Components

After installation, import and use components like:

```tsx
import { SplitText } from '@/components/react-bits/SplitText'

export default function MyComponent() {
  return <SplitText text="Hello World" />
}
```

## Customization

All React Bits components are fully customizable:
- Modify styles in their CSS files
- Adjust props and behavior
- Integrate with your existing design system

## Notes

- Components are installed with TypeScript types
- CSS is included as CSS Modules
- All components are client-side compatible
- No additional dependencies required (beyond what React Bits provides)

## Resources

- [React Bits Documentation](https://reactbits.dev)
- [React Bits GitHub](https://github.com/DavidHDev/react-bits)
- [jsrepo Documentation](https://github.com/jsrepo/jsrepo)
- [shadcn Documentation](https://ui.shadcn.com)

## Support

If you encounter issues:
1. Check the installation results JSON file
2. Review component documentation on React Bits
3. Verify your project setup matches requirements

