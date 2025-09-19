import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Build script for Chrome Extension
async function buildExtension() {
  console.log('Building Chrome Extension...');

  // Create dist directory if it doesn't exist
  const distDir = path.join(__dirname, '../dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Copy manifest.json
  const manifestPath = path.join(__dirname, '../public/manifest.json');
  const distManifestPath = path.join(distDir, 'manifest.json');
  fs.copyFileSync(manifestPath, distManifestPath);
  console.log('✓ Copied manifest.json');

  // Copy background script
  const backgroundPath = path.join(__dirname, '../public/background.js');
  const distBackgroundPath = path.join(distDir, 'background.js');
  fs.copyFileSync(backgroundPath, distBackgroundPath);
  console.log('✓ Copied background.js');

  // Copy service worker for WebLLM
  const swPath = path.join(__dirname, '../public/sw.ts');
  const distSwPath = path.join(distDir, 'sw.js');
  if (fs.existsSync(swPath)) {
    fs.copyFileSync(swPath, distSwPath);
    console.log('✓ Copied service worker (sw.js)');
  }

  // Copy offscreen document and script
  const offscreenHtmlPath = path.join(__dirname, '../public/offscreen.html');
  const distOffscreenHtmlPath = path.join(distDir, 'offscreen.html');
  if (fs.existsSync(offscreenHtmlPath)) {
    fs.copyFileSync(offscreenHtmlPath, distOffscreenHtmlPath);
    console.log('✓ Copied offscreen.html');
  }

  const offscreenJsPath = path.join(__dirname, '../public/offscreen.js');
  const distOffscreenJsPath = path.join(distDir, 'offscreen.js');
  if (fs.existsSync(offscreenJsPath)) {
    fs.copyFileSync(offscreenJsPath, distOffscreenJsPath);
    console.log('✓ Copied offscreen.js');
  }

  // Copy icons (if they exist)
  const iconsDir = path.join(__dirname, '../public/icons');
  const distIconsDir = path.join(distDir, 'icons');
  if (fs.existsSync(iconsDir)) {
    if (!fs.existsSync(distIconsDir)) {
      fs.mkdirSync(distIconsDir, { recursive: true });
    }
    fs.readdirSync(iconsDir).forEach(file => {
      fs.copyFileSync(
        path.join(iconsDir, file),
        path.join(distIconsDir, file)
      );
    });
    console.log('✓ Copied icons');
  }

  console.log('✓ Extension build complete!');
  console.log('📁 Extension files are in the dist/ directory');
  console.log('🔧 Load the dist/ folder as an unpacked extension in Chrome');
}

buildExtension().catch(console.error);
