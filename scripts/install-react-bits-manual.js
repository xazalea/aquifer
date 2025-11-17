#!/usr/bin/env node

/**
 * Manual installation guide generator for React Bits components
 * 
 * Since direct API access may not be available, this script generates
 * a manual installation guide with direct links to each component.
 * 
 * Usage: node scripts/install-react-bits-manual.js
 */

const fs = require('fs');
const path = require('path');

const components = {
  TextAnimations: [
    'SplitText', 'TextAnimate', 'LineShadowText', 'AuroraText',
    'NumberTicker', 'AnimatedShinyText', 'AnimatedGradientText',
    'TextReveal', 'HyperText', 'WordRotate', 'TypingAnimation',
    'ScrollBasedVelocity', 'FlipText', 'BoxReveal', 'SparklesText',
    'MorphingText', 'SpinningText',
  ],
  Buttons: [
    'RainbowButton', 'ShimmerButton', 'ShinyButton', 'InteractiveHoverButton',
    'AnimatedSubscribeButton', 'PulsatingButton', 'RippleButton',
  ],
  Backgrounds: [
    'WarpBackground', 'FlickeringGrid', 'AnimatedGridPattern', 'RetroGrid',
    'Ripple', 'DotPattern', 'GridPattern', 'InteractiveGridPattern',
  ],
  UIComponents: [
    'Marquee', 'Terminal', 'HeroVideoDialog', 'BentoGrid', 'AnimatedList',
    'Dock', 'Globe', 'TweetCard', 'ClientTweetCard', 'OrbitingCircles',
    'AvatarCircles', 'IconCloud', 'AnimatedCircularProgressBar',
    'FileTree', 'CodeComparison', 'ScriptCopyBtn', 'ScrollProgress', 'Lens', 'Pointer',
  ],
  SpecialEffects: [
    'AnimatedBeam', 'BorderBeam', 'ShineBorder', 'MagicCard', 'Meteors',
    'NeonGradientCard', 'Confetti', 'Particles', 'CoolMode', 'ScratchToReveal',
  ],
  Animations: ['BlurFade'],
  DeviceMocks: ['Safari', 'Iphone15Pro', 'Android'],
};

function generateManualGuide() {
  let guide = `# React Bits Components - Manual Installation Guide

Since automated installation requires Tailwind CSS (which this project doesn't use),
here are direct links and instructions for manual installation.

## Installation Methods

### Method 1: Copy from React Bits Website

1. Visit https://reactbits.dev
2. Navigate to the component you want
3. Select "TypeScript + Plain CSS" variant
4. Copy the code
5. Save to \`components/react-bits/<Category>/<ComponentName>.tsx\`

### Method 2: Use jsrepo (if it works)

\`\`\`bash
npx jsrepo add https://reactbits.dev/ts/default/<Category>/<ComponentName>
\`\`\`

## Component Links

`;

  for (const [category, componentList] of Object.entries(components)) {
    guide += `\n### ${category}\n\n`;
    
    for (const componentName of componentList) {
      const jsrepoUrl = `https://reactbits.dev/ts/default/${category}/${componentName}`;
      const websiteUrl = `https://reactbits.dev/${category.toLowerCase()}/${componentName.toLowerCase()}`;
      
      guide += `#### ${componentName}\n\n`;
      guide += `- **jsrepo**: \`npx jsrepo add ${jsrepoUrl}\`\n`;
      guide += `- **Website**: ${websiteUrl}\n`;
      guide += `- **Save to**: \`components/react-bits/${category}/${componentName}.tsx\`\n\n`;
    }
  }

  guide += `\n## Quick Install Script

You can also try the jsrepo method with this command:

\`\`\`bash
# Install all components (may require manual intervention)
# Note: This is a bash script example - adjust component names as needed
for category in TextAnimations Buttons Backgrounds UIComponents SpecialEffects Animations DeviceMocks; do
  echo "Installing components from category: $category"
  # You'll need to list components manually for each category
  npx jsrepo add https://reactbits.dev/ts/default/$category/ComponentName || echo "Failed"
done
\`\`\`

Or use the provided npm script:

\`\`\`bash
npm run install-react-bits
\`\`\`

## Notes

- This project uses **TypeScript** and **CSS Modules** (not Tailwind)
- Use the \`ts/default\` variant for jsrepo
- Use the \`TS-CSS\` variant for shadcn (but shadcn requires Tailwind)
- Components will be saved to \`components/react-bits/\` directory
`;

  return guide;
}

// Generate and save guide
const guide = generateManualGuide();
const guidePath = path.join(process.cwd(), 'REACT_BITS_MANUAL_INSTALL.md');
fs.writeFileSync(guidePath, guide, 'utf8');

console.log('✅ Manual installation guide generated!');
console.log(`📄 Saved to: ${guidePath}`);
console.log('\n💡 You can now use this guide to install components manually.');

module.exports = { components, generateManualGuide };

