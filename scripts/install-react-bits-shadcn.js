#!/usr/bin/env node

/**
 * Alternative script using shadcn CLI for React Bits components
 * 
 * This script installs all available React Bits components using shadcn CLI.
 * Since this project uses TypeScript and CSS Modules, we use the 'TS-CSS' variant.
 * 
 * Usage: node scripts/install-react-bits-shadcn.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Same component list as the jsrepo version
const components = {
  TextAnimations: [
    'SplitText',
    'TextAnimate',
    'LineShadowText',
    'AuroraText',
    'NumberTicker',
    'AnimatedShinyText',
    'AnimatedGradientText',
    'TextReveal',
    'HyperText',
    'WordRotate',
    'TypingAnimation',
    'ScrollBasedVelocity',
    'FlipText',
    'BoxReveal',
    'SparklesText',
    'MorphingText',
    'SpinningText',
  ],
  Buttons: [
    'RainbowButton',
    'ShimmerButton',
    'ShinyButton',
    'InteractiveHoverButton',
    'AnimatedSubscribeButton',
    'PulsatingButton',
    'RippleButton',
  ],
  Backgrounds: [
    'WarpBackground',
    'FlickeringGrid',
    'AnimatedGridPattern',
    'RetroGrid',
    'Ripple',
    'DotPattern',
    'GridPattern',
    'InteractiveGridPattern',
  ],
  UIComponents: [
    'Marquee',
    'Terminal',
    'HeroVideoDialog',
    'BentoGrid',
    'AnimatedList',
    'Dock',
    'Globe',
    'TweetCard',
    'ClientTweetCard',
    'OrbitingCircles',
    'AvatarCircles',
    'IconCloud',
    'AnimatedCircularProgressBar',
    'FileTree',
    'CodeComparison',
    'ScriptCopyBtn',
    'ScrollProgress',
    'Lens',
    'Pointer',
  ],
  SpecialEffects: [
    'AnimatedBeam',
    'BorderBeam',
    'ShineBorder',
    'MagicCard',
    'Meteors',
    'NeonGradientCard',
    'Confetti',
    'Particles',
    'CoolMode',
    'ScratchToReveal',
  ],
  Animations: [
    'BlurFade',
  ],
  DeviceMocks: [
    'Safari',
    'Iphone15Pro',
    'Android',
  ],
};

const BASE_URL = 'https://reactbits.dev/r';
const VARIANT = 'TS-CSS'; // TypeScript + Plain CSS

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function installComponent(category, componentName) {
  const url = `${BASE_URL}/${componentName}-${VARIANT}`;
  const command = `npx shadcn@latest add ${url}`;
  
  try {
    log(`Installing ${componentName}...`, 'cyan');
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    log(`✓ ${componentName} installed successfully`, 'green');
    return true;
  } catch (error) {
    log(`✗ Failed to install ${componentName}: ${error.message}`, 'red');
    return false;
  }
}

function installAllComponents() {
  log('\n🚀 Starting React Bits Component Installation (shadcn method)\n', 'bright');
  log(`Variant: ${VARIANT} (TypeScript + Plain CSS)`, 'blue');
  log(`Total components to install: ${Object.values(components).flat().length}\n`, 'blue');

  const results = {
    success: [],
    failed: [],
  };

  for (const [category, componentList] of Object.entries(components)) {
    log(`\n📦 Category: ${category}`, 'yellow');
    log('─'.repeat(50), 'yellow');

    for (const componentName of componentList) {
      const success = installComponent(category, componentName);
      if (success) {
        results.success.push(`${category}/${componentName}`);
      } else {
        results.failed.push(`${category}/${componentName}`);
      }
    }
  }

  log('\n' + '='.repeat(50), 'bright');
  log('📊 Installation Summary', 'bright');
  log('='.repeat(50), 'bright');
  log(`✓ Successfully installed: ${results.success.length}`, 'green');
  log(`✗ Failed: ${results.failed.length}`, results.failed.length > 0 ? 'red' : 'green');

  if (results.failed.length > 0) {
    log('\nFailed components:', 'yellow');
    results.failed.forEach(component => {
      log(`  - ${component}`, 'red');
    });
  }

  const resultsPath = path.join(process.cwd(), 'react-bits-install-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  log(`\n📄 Results saved to: ${resultsPath}`, 'blue');

  log('\n✨ Installation complete!', 'green');
}

if (require.main === module) {
  installAllComponents();
}

module.exports = { installAllComponents, components };

