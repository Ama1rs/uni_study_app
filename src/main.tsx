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

// Initialize high-performance rendering
initializeRenderingOptimizations();

// Detect display refresh rate first, then initialize rendering
detectDisplayRefreshRate().then(() => {
  requestMaxRefreshRate();
  enableHardwareAcceleratedScrolling();
  disableFrameRateLimits();
  console.log('✓ Rendering system fully initialized');
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
