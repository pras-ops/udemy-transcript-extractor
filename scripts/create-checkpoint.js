import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Checkpoint Backup Script
async function createCheckpoint() {
  console.log('🔒 Creating stable checkpoint backup...');
  
  const projectRoot = path.join(__dirname, '..');
  const backupDir = path.join(projectRoot, 'checkpoint_backup');
  
  // Create backup directory
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Critical files to backup
  const filesToBackup = [
    'public/manifest.json',
    'src/lib/udemy-extractor.ts',
    'src/lib/content-script.ts',
    'src/lib/extension-service.ts',
    'src/components/generated/TranscriptExtractorPopup.tsx',
    'package.json',
    'vite.config.ts',
    'scripts/build-extension.js',
    'CHECKPOINT.md'
  ];
  
  // Create subdirectories and copy files
  for (const file of filesToBackup) {
    const srcPath = path.join(projectRoot, file);
    const destPath = path.join(backupDir, file);
    
    if (fs.existsSync(srcPath)) {
      // Create directory if it doesn't exist
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      // Copy file
      fs.copyFileSync(srcPath, destPath);
      console.log(`✓ Backed up: ${file}`);
    } else {
      console.log(`⚠ File not found: ${file}`);
    }
  }
  
  // Create restore script
  const restoreScript = `import fs from 'fs';
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
      console.log(\`✓ Restored: \${file}\`);
    }
  }
  
  console.log('✅ Checkpoint restored successfully!');
  console.log('🔧 Run "npm run build:extension" to rebuild');
}

restoreCheckpoint().catch(console.error);`;
  
  fs.writeFileSync(path.join(backupDir, 'restore-checkpoint.js'), restoreScript);
  console.log('✓ Created restore script');
  
  // Create timestamp file
  const timestamp = new Date().toISOString();
  fs.writeFileSync(path.join(backupDir, 'checkpoint-info.json'), JSON.stringify({
    created: timestamp,
    version: '1.0.0',
    status: 'STABLE - All features working',
    features: [
      'Transcript extraction from Udemy',
      'Clipboard copy functionality',
      'File download (txt, md, json)',
      'Course structure display',
      'Auto content script injection',
      'Smart transcript panel detection',
      'Error handling and recovery'
    ]
  }, null, 2));
  
  console.log('✅ Stable checkpoint created successfully!');
  console.log('📁 Backup location:', backupDir);
  console.log('🔄 To restore: node checkpoint_backup/restore-checkpoint.js');
}

createCheckpoint().catch(console.error);
