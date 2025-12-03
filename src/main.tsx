import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Ensure WebSocket protocol is secure when page is served over HTTPS.
// Some client code expects a global `socketProtocol` variable — set it here.
try {
  const isSecureContext = typeof window !== 'undefined' && window.location && window.location.protocol === 'https:';
  // Treat non-localhost HTTPS as secure by default.
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  // Prefer 'wss' in secure contexts or when forced by env var.
  // You can force WSS in development with env var `FORCE_WSS=true`.
  // NOTE: env vars are injected at build time; check runtime hostname for accuracy.
  // Expose a global for other modules that expect `socketProtocol`.
  // @ts-ignore - attach to window for runtime access
  (window as any).socketProtocol = process.env.FORCE_WSS === 'true' || isSecureContext ? 'wss' : 'ws';
} catch (e) {
  // ignore in non-browser environments
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
