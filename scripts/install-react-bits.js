#!/usr/bin/env node

/**
 * Script to install ALL React Bits components
 * 
 * This script installs all available React Bits components using jsrepo CLI.
 * Since this project uses TypeScript and CSS Modules, we use the 'ts/default' variant.
 * 
 * Usage: node scripts/install-react-bits.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Comprehensive list of React Bits components organized by category
// Based on React Bits documentation and common component libraries
const components = {
  // Text Animations
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

  // Buttons
  Buttons: [
    'RainbowButton',
    'ShimmerButton',
    'ShinyButton',
    'InteractiveHoverButton',
    'AnimatedSubscribeButton',
    'PulsatingButton',
    'RippleButton',
  ],

  // Backgrounds
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

  // UI Components
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

  // Special Effects
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

  // Animations
  Animations: [
    'BlurFade',
  ],

  // Device Mocks
  DeviceMocks: [
    'Safari',
    'Iphone15Pro',
    'Android',
  ],
};

// Base URL for React Bits
const BASE_URL = 'https://reactbits.dev';
const VARIANT = 'ts/default'; // TypeScript + Plain CSS (matches our project)

// Colors for console output
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
  const url = `${BASE_URL}/${VARIANT}/${category}/${componentName}`;
  const command = `npx jsrepo add ${url}`;
  
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
  log('\n🚀 Starting React Bits Component Installation\n', 'bright');
  log(`Variant: ${VARIANT} (TypeScript + Plain CSS)`, 'blue');
  log(`Total components to install: ${Object.values(components).flat().length}\n`, 'blue');

  const results = {
    success: [],
    failed: [],
  };

  // Install components by category
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
      
      // Small delay to avoid rate limiting
      if (componentList.indexOf(componentName) < componentList.length - 1) {
        // Only delay between components, not after the last one
        // Uncomment if you experience rate limiting:
        // await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  // Summary
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
    log('\n💡 Tip: You can retry failed installations individually:', 'yellow');
    log('   npx jsrepo add https://reactbits.dev/ts/default/<Category>/<Component>', 'cyan');
  }

  // Save results to file
  const resultsPath = path.join(process.cwd(), 'react-bits-install-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  log(`\n📄 Results saved to: ${resultsPath}`, 'blue');

  log('\n✨ Installation complete!', 'green');
  log('Components are now available in your project.', 'green');
}

// Run the installation
if (require.main === module) {
  installAllComponents();
}

module.exports = { installAllComponents, components };

