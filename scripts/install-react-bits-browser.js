#!/usr/bin/env node

/**
 * Browser-based installation helper for React Bits components
 * 
 * Since React Bits doesn't expose a public API, this script generates:
 * 1. A list of all component URLs to visit
 * 2. Instructions for copying components
 * 3. A helper script to organize copied components
 * 
 * Usage: node scripts/install-react-bits-browser.js
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

const COMPONENTS_DIR = path.join(process.cwd(), 'components', 'react-bits');

function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function generateComponentStub(category, componentName) {
  return `/**
 * ${componentName} - React Bits Component
 * 
 * This is a placeholder. To install:
 * 1. Visit: https://reactbits.dev
 * 2. Search for "${componentName}"
 * 3. Select "TypeScript + Plain CSS" variant
 * 4. Copy the code and replace this file
 * 
 * Category: ${category}
 * Component: ${componentName}
 */

export function ${componentName}() {
  return (
    <div>
      {/* Replace with actual component code from reactbits.dev */}
      <p>${componentName} - Install from https://reactbits.dev</p>
    </div>
  );
}
`;
}

function generateInstallationScript() {
  let script = `#!/bin/bash

# React Bits Component Installation Helper
# This script creates component directories and placeholder files

# Create base directory
mkdir -p components/react-bits

`;

  for (const [category, componentList] of Object.entries(components)) {
    script += `# ${category}\n`;
    script += `mkdir -p components/react-bits/${category}\n\n`;
    
    for (const componentName of componentList) {
      script += `# ${componentName}\n`;
      script += `echo "Creating placeholder for ${componentName}..."\n`;
      script += `cat > components/react-bits/${category}/${componentName}.tsx << 'EOF'\n`;
      script += generateComponentStub(category, componentName);
      script += `EOF\n\n`;
    }
  }

  script += `echo "✅ Component placeholders created!"\n`;
  script += `echo "📝 Now visit https://reactbits.dev and copy component code to replace placeholders"\n`;

  return script;
}

function generateHTMLHelper() {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React Bits Component Installer Helper</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #0a0a0a;
      color: #fff;
    }
    .component {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 15px;
      margin: 10px 0;
    }
    .component h3 {
      margin: 0 0 10px 0;
      color: #667eea;
    }
    .links {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .link {
      background: #667eea;
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      text-decoration: none;
      display: inline-block;
    }
    .link:hover {
      background: #5568d3;
    }
    .category {
      margin: 30px 0;
      border-top: 2px solid #333;
      padding-top: 20px;
    }
    .category h2 {
      color: #3DDC84;
    }
    .progress {
      background: #2a2a2a;
      padding: 10px;
      border-radius: 6px;
      margin: 10px 0;
    }
    .progress-bar {
      background: #3DDC84;
      height: 8px;
      border-radius: 4px;
      width: 0%;
      transition: width 0.3s;
    }
  </style>
</head>
<body>
  <h1>🚀 React Bits Component Installer</h1>
  <p>Click each component link, copy the code, and save to the specified location.</p>
  
  <div class="progress">
    <div>Progress: <span id="progress">0</span> / <span id="total">0</span></div>
    <div class="progress-bar" id="progressBar"></div>
  </div>

`;

  let totalComponents = 0;
  for (const componentList of Object.values(components)) {
    totalComponents += componentList.length;
  }

  html += `  <script>
    const total = ${totalComponents};
    let completed = 0;
    const checkboxes = {};
    
    function updateProgress() {
      completed = Object.values(checkboxes).filter(v => v).length;
      document.getElementById('progress').textContent = completed;
      document.getElementById('total').textContent = total;
      const percent = (completed / total) * 100;
      document.getElementById('progressBar').style.width = percent + '%';
    }
    
    function toggleComponent(category, name) {
      const key = category + '/' + name;
      checkboxes[key] = !checkboxes[key];
      updateProgress();
      localStorage.setItem('reactBitsProgress', JSON.stringify(checkboxes));
    }
    
    // Load saved progress
    const saved = localStorage.getItem('reactBitsProgress');
    if (saved) {
      Object.assign(checkboxes, JSON.parse(saved));
      updateProgress();
      // Restore checkbox states
      Object.keys(checkboxes).forEach(key => {
        if (checkboxes[key]) {
          const [cat, name] = key.split('/');
          const checkbox = document.querySelector(\`input[onchange*="'\${name}'"]\`);
          if (checkbox) checkbox.checked = true;
        }
      });
    }
  </script>
`;

  for (const [category, componentList] of Object.entries(components)) {
    html += `  <div class="category">
    <h2>${category}</h2>
`;

    for (const componentName of componentList) {
      const componentSlug = componentName.toLowerCase();
      const categorySlug = category.toLowerCase();
      const url = `https://reactbits.dev/${categorySlug}/${componentSlug}`;
      const filePath = `components/react-bits/${category}/${componentName}.tsx`;
      
      html += `    <div class="component">
      <h3>${componentName}</h3>
      <div class="links">
        <a href="${url}" target="_blank" class="link">📦 View Component</a>
        <label style="cursor: pointer; color: #888;">
          <input type="checkbox" onchange="toggleComponent('${category}', '${componentName}')">
          Installed
        </label>
      </div>
      <p style="color: #888; font-size: 0.9em; margin: 10px 0 0 0;">
        Save to: <code>${filePath}</code><br>
        Variant: <strong>TypeScript + Plain CSS</strong>
      </p>
    </div>
`;
    }

    html += `  </div>
`;
  }

  html += `</body>
</html>`;

  return html;
}

function main() {
  console.log('🚀 Generating React Bits installation helpers...\n');

  // Create components directory structure
  ensureDirectory(COMPONENTS_DIR);
  for (const category of Object.keys(components)) {
    ensureDirectory(path.join(COMPONENTS_DIR, category));
  }

  // Generate installation script
  const installScript = generateInstallationScript();
  const scriptPath = path.join(process.cwd(), 'install-react-bits.sh');
  fs.writeFileSync(scriptPath, installScript, 'utf8');
  fs.chmodSync(scriptPath, '755');
  console.log(`✅ Created: ${scriptPath}`);

  // Generate HTML helper
  const html = generateHTMLHelper();
  const htmlPath = path.join(process.cwd(), 'react-bits-installer.html');
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log(`✅ Created: ${htmlPath}`);

  // Create placeholder components
  let created = 0;
  for (const [category, componentList] of Object.entries(components)) {
    for (const componentName of componentList) {
      const componentPath = path.join(COMPONENTS_DIR, category, `${componentName}.tsx`);
      if (!fs.existsSync(componentPath)) {
        const stub = generateComponentStub(category, componentName);
        fs.writeFileSync(componentPath, stub, 'utf8');
        created++;
      }
    }
  }

  console.log(`✅ Created ${created} placeholder component files`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Open react-bits-installer.html in your browser`);
  console.log(`   2. Click each component link`);
  console.log(`   3. Copy the TypeScript + Plain CSS code`);
  console.log(`   4. Replace the placeholder files in components/react-bits/`);
  console.log(`\n✨ Or run: ./install-react-bits.sh to create all placeholders`);
}

if (require.main === module) {
  main();
}

module.exports = { components, generateComponentStub };

