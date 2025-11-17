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
      
      // For now, we'll create a stub that can be replaced
      console.warn('Unicorn Engine CDN not available. Please compile Unicorn to WASM.');
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
      console.log('Unicorn Engine loaded from local build');
      return wasmModule;
    } catch (error) {
      console.warn('Failed to load Unicorn from local build:', error);
      throw error;
    }
  };

  // Initialize Unicorn Engine
  const initUnicorn = async () => {
    try {
      // Try local first, then CDN
      return await loadFromLocal().catch(() => loadFromCDN());
    } catch (error) {
      console.warn('Unicorn Engine not available. ARM emulation will be limited.');
      console.warn('To enable full ARM emulation:');
      console.warn('1. Compile Unicorn Engine to WebAssembly using Emscripten');
      console.warn('2. Place unicorn.wasm in /public directory');
      console.warn('3. Or integrate arm-js as a JavaScript fallback');
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

