import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { NotificationProvider } from './components/ui/NotificationSystem';
import { injectCriticalCSS } from './utils/criticalCSS';
import { initWebVitalsMonitoring } from './utils/webVitalsMonitor';
import { silenceConsoleInProduction } from './utils/consoleSilencer';

// Suppress React DevTools warning in development
silenceConsoleInProduction();
if (process.env.NODE_ENV === 'development') {
  // Silence React DevTools download suggestion
  if (typeof window !== 'undefined') {
    (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      isDisabled: false,
      supportsFiber: true,
      inject: (..._args: any[]) => {
        // Provide a harmless return to satisfy no-empty-function
        return { renderer: 'noop' } as any;
      },
      onCommitFiberRoot: (..._args: any[]) => {
        // Intentionally no-op
        return undefined;
      },
      onCommitFiberUnmount: (..._args: any[]) => {
        // Intentionally no-op
        return undefined;
      },
    };
  }
}

// Initialize performance monitoring
initWebVitalsMonitoring();

// Font optimization disabled to prevent preload warnings
// FontOptimizer.preloadCriticalFonts();

// Inject critical CSS before any rendering
injectCriticalCSS();
// preloadCriticalResources(); // Disabled to prevent unused preload warnings

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </React.StrictMode>
);
