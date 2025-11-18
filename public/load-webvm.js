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
  const WEBVM_CDN_URLS = [
    'https://unpkg.com/@leaningtech/webvm/dist/webvm.js',
    'https://cdn.jsdelivr.net/npm/@leaningtech/webvm/dist/webvm.js',
    '/webvm.js', // Local fallback
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
        console.warn(`Failed to load WebVM from ${url}:`, error);
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
        console.warn('WebVM not available. Docker operations will be limited.');
        console.warn('To enable WebVM:');
        console.warn('1. Add WebVM script to your HTML');
        console.warn('2. Or ensure WebVM is available at one of the CDN URLs');
        console.warn('3. Or place webvm.js in /public directory');
        return false;
      }
    } catch (error) {
      console.error('Failed to initialize WebVM:', error);
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

