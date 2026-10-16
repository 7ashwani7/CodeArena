import '@testing-library/jest-dom';
import React from 'react';

// Ensure React is available globally for JSX runtime in Vitest jsdom
globalThis.React = React;

if (typeof window !== 'undefined') {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
