#!/usr/bin/env node

/**
 * Direct installation script for React Bits components
 * 
 * This script directly fetches component code from React Bits and saves it to the project.
 * Works without requiring Tailwind CSS or CLI tools.
 * 
 * Usage: node scripts/install-react-bits-direct.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Component list
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

const BASE_URL = 'https://reactbits.dev';
const VARIANT = 'ts/default'; // TypeScript + Plain CSS
const COMPONENTS_DIR = path.join(process.cwd(), 'components', 'react-bits');

// Colors for console
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

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function fetchComponentCode(category, componentName) {
  // Try multiple URL patterns
  const urls = [
    `${BASE_URL}/${VARIANT}/${category}/${componentName}`,
    `${BASE_URL}/api/${VARIANT}/${category}/${componentName}`,
    `${BASE_URL}/r/${componentName}-TS-CSS`,
  ];

  for (const url of urls) {
    try {
      log(`  Trying: ${url}`, 'cyan');
      const response = await fetchURL(url);
      
      // Check if it's HTML (error page) or actual code
      if (response.trim().startsWith('<!DOCTYPE') || response.trim().startsWith('<!doctype')) {
        continue; // Try next URL
      }
      
      return response;
    } catch (error) {
      // Try next URL
      continue;
    }
  }
  
  throw new Error('All URL patterns failed');
}

function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function installComponent(category, componentName) {
  try {
    log(`Installing ${componentName}...`, 'cyan');
    
    // Create category directory
    const categoryDir = path.join(COMPONENTS_DIR, category);
    ensureDirectory(categoryDir);
    
    // Try to fetch component code
    const code = await fetchComponentCode(category, componentName);
    
    // Save component file
    const componentPath = path.join(categoryDir, `${componentName}.tsx`);
    fs.writeFileSync(componentPath, code, 'utf8');
    
    // Try to fetch CSS if it exists separately
    try {
      const cssUrl = `${BASE_URL}/${VARIANT}/${category}/${componentName}.css`;
      const css = await fetchURL(cssUrl);
      if (css && !css.trim().startsWith('<!DOCTYPE')) {
        const cssPath = path.join(categoryDir, `${componentName}.module.css`);
        fs.writeFileSync(cssPath, css, 'utf8');
      }
    } catch (e) {
      // CSS might be inline or not available
    }
    
    log(`✓ ${componentName} installed`, 'green');
    return true;
  } catch (error) {
    log(`✗ Failed: ${error.message}`, 'red');
    return false;
  }
}

async function installAllComponents() {
  log('\n🚀 React Bits Direct Installation\n', 'bright');
  log(`Components directory: ${COMPONENTS_DIR}`, 'blue');
  log(`Total components: ${Object.values(components).flat().length}\n`, 'blue');

  ensureDirectory(COMPONENTS_DIR);

  const results = {
    success: [],
    failed: [],
  };

  for (const [category, componentList] of Object.entries(components)) {
    log(`\n📦 ${category}`, 'yellow');
    log('─'.repeat(50), 'yellow');

    for (const componentName of componentList) {
      const success = await installComponent(category, componentName);
      if (success) {
        results.success.push(`${category}/${componentName}`);
      } else {
        results.failed.push(`${category}/${componentName}`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
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
    log('\n💡 Tip: You may need to install these manually from reactbits.dev', 'yellow');
  }

  // Save results
  const resultsPath = path.join(process.cwd(), 'react-bits-install-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  log(`\n📄 Results saved to: ${resultsPath}`, 'blue');

  log('\n✨ Installation complete!', 'green');
  log(`Components are in: ${COMPONENTS_DIR}`, 'green');
}

// Run
if (require.main === module) {
  installAllComponents().catch((error) => {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { installAllComponents, components };

