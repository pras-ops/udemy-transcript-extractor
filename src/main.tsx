import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { applyTheme } from './lib/theme';

// Before first paint, or the popup flashes the wrong colours. The same call
// runs in the dashboard entry, so both surfaces resolve the theme identically.
applyTheme();

// Opt this page into the fixed-size panel rules. The dashboard deliberately
// does not, so it scrolls and its text can be selected.
document.body.classList.add('is-popup');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
