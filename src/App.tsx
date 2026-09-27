import { TranscriptExtractorPopup } from './components/generated/TranscriptExtractorPopup';

/**
 * Theme is applied once in `main.tsx` from the stored preference and owned
 * thereafter by the popup's toggle. This component deliberately does not touch
 * `documentElement` — it used to reset the theme to light on every render,
 * which undid the toggle.
 */
function App() {
  return <TranscriptExtractorPopup />;
}

export default App;
