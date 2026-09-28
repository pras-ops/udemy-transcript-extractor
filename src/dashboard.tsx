import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { Dashboard } from './components/dashboard/Dashboard';
import { applyTheme } from './lib/theme';

// Before first paint, or the page flashes the wrong colours.
applyTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Dashboard />
  </StrictMode>,
);
