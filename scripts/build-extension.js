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

  // Background script will be built by vite from src/background.ts
  console.log('✓ background.js (Service Worker) will be built by vite from src/background.ts');

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
