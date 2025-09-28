import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import "./i18n"; 
import './index.css'
// add this small shim at the top or near your root bootstrap
const API = (import.meta.env.VITE_API_BASE || "/api").replace(/\/+$/, "");
const BACKEND = (import.meta.env.VITE_BACKEND_BASE || "/api").replace(/\/+$/, "");

// optional globals for quick debugging in DevTools
if (typeof window !== "undefined") {
  (window as any).__API_BASE__ = API;
  (window as any).__BACKEND__ = BACKEND;
}

createRoot(document.getElementById("root")!).render(<App />);
