/**
 * Unicorn Engine Loader
 * 
 * Loads Unicorn Engine for ARM emulation
 * Tries multiple sources: CDN, local build, or fallback
 */

(function() {
  'use strict';

  // Check if Unicorn is already loaded
  if (window.Unicorn) {
    console.log('Unicorn Engine already loaded');
    return;
  }

  // Try to load from CDN (if available)
  const loadFromCDN = () => {
    return new Promise((resolve, reject) => {
      // Note: Unicorn Engine doesn't have an official CDN build
      // You would need to compile it to WebAssembly yourself
      // or use a pre-built version
      
      // Silently reject - Unicorn is optional, arm-js fallback will be used
      reject(new Error('Unicorn Engine not available from CDN'));
    });
  };

  // Try to load from local build
  const loadFromLocal = async () => {
    try {
      // Try to load WASM module
      const wasmModule = await WebAssembly.instantiateStreaming(
        fetch('/unicorn.wasm')
      );
      
      // Initialize Unicorn bindings
      // This would require JavaScript bindings for Unicorn
      return wasmModule;
    } catch (error) {
      // Silently fail - Unicorn is optional, arm-js fallback will be used
      throw error;
    }
  };

  // Initialize Unicorn Engine
  const initUnicorn = async () => {
    try {
      // Try local first, then CDN
      return await loadFromLocal().catch(() => loadFromCDN());
    } catch (error) {
      // Unicorn Engine not available - this is expected, arm-js fallback will be used
      // Don't show warnings as it's optional
      return null;
    }
  };

  // Auto-initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUnicorn);
  } else {
    initUnicorn();
  }
})();

