/**
 * WebVM Loader
 * 
 * Loads WebVM for Docker container runtime in the browser
 * WebVM provides x86 virtualization via WebAssembly (CheerpX)
 * which enables running Docker containers entirely in the browser
 */

(function() {
  'use strict';

  // Check if WebVM is already loaded
  if (window.WebVM) {
    console.log('WebVM already loaded');
    return;
  }

  // WebVM CDN URLs (adjust based on actual WebVM distribution)
  // Note: WebVM doesn't have an official CDN build yet
  // You would need to build it yourself or use a custom build
  const WEBVM_CDN_URLS = [
    // These URLs are placeholders - WebVM needs to be built and hosted
    // '/webvm.js', // Local fallback - only if you have a built version
  ];

  let webvmLoaded = false;

  // Try to load WebVM from CDN
  const loadWebVMFromCDN = (url) => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => {
        if (window.WebVM) {
          console.log('WebVM loaded from:', url);
          webvmLoaded = true;
          resolve();
        } else {
          reject(new Error('WebVM not found after loading script'));
        }
      };
      script.onerror = () => {
        reject(new Error(`Failed to load WebVM from ${url}`));
      };
      document.head.appendChild(script);
    });
  };

  // Try to load WebVM from multiple sources
  const loadWebVM = async () => {
    for (const url of WEBVM_CDN_URLS) {
      try {
        await loadWebVMFromCDN(url);
        return true;
      } catch (error) {
        // Silently continue to next URL
        continue;
      }
    }
    return false;
  };

  // Initialize WebVM
  const initWebVM = async () => {
    try {
      // Try to load WebVM
      const loaded = await loadWebVM();
      
      if (loaded && window.WebVM) {
        console.log('WebVM is ready for Docker operations');
        // WebVM is now available globally
        return true;
      } else {
        // WebVM not available - this is expected if not loaded
        // Don't show warnings as it's optional
        return false;
      }
    } catch (error) {
      // Silently fail - WebVM is optional
      return false;
    }
  };

  // Auto-initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWebVM);
  } else {
    initWebVM();
  }
})();

