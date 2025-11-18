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

  // Note: We're using CheerpX from npm now (@leaningtech/cheerpx)
  // WebVM CDN URLs are blocked by COEP (Cross-Origin-Embedder-Policy)
  // If you need WebVM, build it locally and place in /public directory
  const WEBVM_URLS = [
    // Local build only (if you've built WebVM yourself)
    // CDN URLs removed because they're blocked by COEP headers
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

    // CheerpX from npm should be loaded by the TypeScript integration
    // This loader is just for WebVM/BrowserPod fallback
    // Don't show warnings - CheerpX is loaded via npm import
    return false;
  };

  // Auto-initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCheerpX);
  } else {
    loadCheerpX();
  }
})();

