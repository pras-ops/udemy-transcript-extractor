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

  // Note: the WebLLM chat model is not bundled. It is fetched from the MLC CDN
  // on first use and cached by the browser, and only after the user opts in.

  // The semantic-search model IS bundled: it is ~23 MB, and shipping it means
  // no CDN fetch, no host permission for one, and search that works offline.
  const modelsDir = path.join(__dirname, '../public/models');
  if (fs.existsSync(modelsDir)) {
    fs.cpSync(modelsDir, path.join(distDir, 'models'), { recursive: true });
    console.log('✓ Copied search model');
  } else {
    console.warn('⚠ No search model found - run "npm run fetch:model" first.');
    console.warn('  The extension will build, but semantic search will not load.');
  }

  console.log('✓ Extension build complete!');
  console.log('📁 Extension files are in the dist/ directory');
  console.log('🔧 Load the dist/ folder as an unpacked extension in Chrome');
}

buildExtension().catch(console.error);
