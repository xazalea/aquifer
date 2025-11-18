/**
 * CheerpX/BrowserPod/WebVM Loader
 * 
 * Loads CheerpX (x86 virtualization) or BrowserPod/WebVM which include CheerpX
 * This enables real Docker container execution in the browser
 * 
 * References:
 * - CheerpX: https://leaningtech.com/cheerpx/
 * - BrowserPod: https://browserpod.io/
 * - WebVM: https://github.com/leaningtech/webvm
 */

(function() {
  'use strict';

  // Check if already loaded
  if (window.CheerpX || window.BrowserPod || window.WebVM) {
    console.log('CheerpX/WebVM/BrowserPod already loaded');
    return;
  }

  // Try to load WebVM (which includes CheerpX)
  // WebVM is open source and can be built from: https://github.com/leaningtech/webvm
  const WEBVM_URLS = [
    // Official WebVM build (if available)
    'https://unpkg.com/@leaningtech/webvm@latest/dist/webvm.js',
    'https://cdn.jsdelivr.net/npm/@leaningtech/webvm@latest/dist/webvm.js',
    // Local build (if you've built WebVM yourself)
    '/webvm.js',
    // Alternative: Load from GitHub releases
    'https://github.com/leaningtech/webvm/releases/latest/download/webvm.js',
  ];

  // BrowserPod SDK (when available)
  const BROWSERPOD_URLS = [
    // BrowserPod SDK will be available when GA is released (November 2025)
    // For now, we'll use WebVM which provides similar capabilities
  ];

  let loaded = false;

  const loadScript = (url) => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => {
        if (window.WebVM || window.CheerpX || window.BrowserPod) {
          console.log('✅ Loaded CheerpX/WebVM/BrowserPod from:', url);
          loaded = true;
          resolve();
        } else {
          reject(new Error('CheerpX/WebVM/BrowserPod not found after loading'));
        }
      };
      script.onerror = () => {
        reject(new Error(`Failed to load from ${url}`));
      };
      document.head.appendChild(script);
    });
  };

  const loadCheerpX = async () => {
    // Try WebVM first (open source, includes CheerpX)
    for (const url of WEBVM_URLS) {
      try {
        await loadScript(url);
        if (window.WebVM || window.CheerpX) {
          console.log('✅ CheerpX/WebVM ready for Docker operations');
          return true;
        }
      } catch (error) {
        // Continue to next URL
        continue;
      }
    }

    // Try BrowserPod SDK (when available)
    for (const url of BROWSERPOD_URLS) {
      try {
        await loadScript(url);
        if (window.BrowserPod) {
          console.log('✅ BrowserPod SDK ready');
          return true;
        }
      } catch (error) {
        continue;
      }
    }

    console.warn('⚠️ CheerpX/WebVM/BrowserPod not available. Docker operations will be limited.');
    console.warn('💡 To enable full Docker support:');
    console.warn('   1. Build WebVM from: https://github.com/leaningtech/webvm');
    console.warn('   2. Place webvm.js in /public directory');
    console.warn('   3. Or wait for BrowserPod GA (November 2025)');
    return false;
  };

  // Auto-initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCheerpX);
  } else {
    loadCheerpX();
  }
})();

