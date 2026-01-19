import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./contexts/ThemeContext";
import './test-invoke.js';
import {
  initializeRenderingOptimizations,
  detectDisplayRefreshRate,
  requestMaxRefreshRate,
  enableHardwareAcceleratedScrolling,
  disableFrameRateLimits,
} from "./lib/renderingOptimization";
import logger from "./lib/logger";
import "./lib/performanceMonitor"; // Initialize performance monitoring

// Initialize high-performance rendering
initializeRenderingOptimizations();

// Detect display refresh rate first, then initialize rendering
detectDisplayRefreshRate().then(() => {
  requestMaxRefreshRate();
  enableHardwareAcceleratedScrolling();
  disableFrameRateLimits();
  logger.debug('✓ Rendering system fully initialized');
});

import { Toaster } from 'sonner';

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
      <Toaster position="bottom-right" theme="dark" richColors />
    </ThemeProvider>
  </React.StrictMode>,
);
