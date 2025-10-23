import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme.js';
import { normalizeAllData } from './data-normalizer.js';

// One-time data normalization on first app boot (idempotent guard)
try {
  const flagKey = 'dataNormalizedOnBoot';
  if (!localStorage.getItem(flagKey)) {
    const summary = normalizeAllData();
    try { localStorage.setItem(flagKey, new Date().toISOString()); } catch {/* ignore */}
    // Lightweight visibility in console for developers
    console.log('Normalized localStorage datasets on boot:', summary);
  }
} catch {/* ignore envs without localStorage (SSR not used here) */}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
