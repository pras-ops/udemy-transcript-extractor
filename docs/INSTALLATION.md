# 🛠️ Installation Guide

## Option 1: Chrome Web Store

Coming soon.

## Option 2: Load a release unpacked

1. Download the latest release zip and extract it
2. Open `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the extracted folder
5. Pin the extension to your toolbar

## Option 3: Build from source

```bash
git clone https://github.com/pras-ops/udemy-transcript-extractor.git
cd udemy-transcript-extractor
npm install

# Required. The embedding table is a build input and is not committed —
# without it the bundle builds but semantic search has nothing to load.
npm run fetch:model

# Typecheck, lint, test
npm run verify

# Build, then check against Chrome Web Store rules
npm run deploy
```

Then load the **`dist/`** folder via **Load unpacked**, as in Option 2.

## After installing

**Set up the shortcuts.** Two are suggested by default:

| Shortcut | Does |
| --- | --- |
| `Alt+Shift+N` | Write a note against the current moment |
| `Alt+Shift+S` | Capture the frame on screen |

Chrome silently drops a suggested shortcut that conflicts with another
extension, so if one does nothing, check and rebind it at
`chrome://extensions/shortcuts`.

**Reload any lecture tabs you already had open.** Content scripts are injected
at page load, so a tab that was open during installation is not yet running the
extension.

## Requirements

- **Chrome 88+** for everything the extension does on its own
- **A considerably newer Chrome, plus supported hardware**, for the two optional
  features that use the browser's built-in on-device model: reading text off a
  captured frame, and writing prose summaries. The extension probes for it and
  simply does not offer those features when it is absent — nothing else is
  affected
- An account on the platform whose lectures you are reading
- **Node 18+** to build from source

The extension makes no network requests while it runs. You need a connection to
watch the lecture, not to extract it.

## If something goes wrong

| Symptom | First thing to check |
| --- | --- |
| Extension will not load unpacked | Developer mode is enabled, and you selected `dist/`, not the repo root |
| Nothing is extracted | The player's own transcript panel is open — the extension reads what the page renders |
| A shortcut does nothing | `chrome://extensions/shortcuts` for a conflict |
| Build fails | `npm run fetch:model` has been run, and Node is 18+ |

📖 **Everything else: [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)**
