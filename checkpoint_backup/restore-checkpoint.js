import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Restore from Checkpoint
async function restoreCheckpoint() {
  console.log('🔄 Restoring from stable checkpoint...');
  
  const projectRoot = path.join(__dirname, '..');
  const backupDir = __dirname;
  
  const filesToRestore = [
    'public/manifest.json',
    'src/lib/udemy-extractor.ts',
    'src/lib/content-script.ts',
    'src/lib/extension-service.ts',
    'src/components/generated/TranscriptExtractorPopup.tsx',
    'package.json',
    'vite.config.ts',
    'scripts/build-extension.js'
  ];
  
  for (const file of filesToRestore) {
    const srcPath = path.join(backupDir, file);
    const destPath = path.join(projectRoot, file);
    
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`✓ Restored: ${file}`);
    }
  }
  
  console.log('✅ Checkpoint restored successfully!');
  console.log('🔧 Run "npm run build:extension" to rebuild');
}

restoreCheckpoint().catch(console.error);