import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function testDeployment() {
  console.log('🧪 Running deployment tests...');
  console.log('================================');
  
  let allTestsPassed = true;
  
  // Test 1: Check manifest.json
  console.log('\n📋 Testing manifest.json...');
  try {
    const manifestPath = path.join(__dirname, '..', 'public', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log('✅ Manifest version:', manifest.version);
    console.log('✅ Manifest name:', manifest.name);
    
    // Check required permissions
    const requiredPermissions = ['activeTab', 'storage', 'scripting'];
    const missingPermissions = requiredPermissions.filter(perm => 
      !manifest.permissions.includes(perm)
    );
    
    if (missingPermissions.length === 0) {
      console.log('✅ All required permissions present');
    } else {
      console.error('❌ Missing permissions:', missingPermissions);
      allTestsPassed = false;
    }
    
  } catch (error) {
    console.error('❌ Manifest.json error:', error.message);
    allTestsPassed = false;
  }
  
  // Test 2: Check build files exist
  console.log('\n📦 Testing build files...');
  const distPath = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distPath)) {
    console.error('❌ dist/ directory not found - run npm run build first');
    allTestsPassed = false;
  } else {
    const distFiles = fs.readdirSync(distPath);
    const requiredFiles = ['manifest.json', 'background.js', 'content-script.js', 'index.html'];
    
    requiredFiles.forEach(file => {
      if (distFiles.includes(file)) {
        const filePath = path.join(distPath, file);
        const stats = fs.statSync(filePath);
        console.log(`✅ ${file} exists (${(stats.size / 1024).toFixed(1)}KB)`);
      } else {
        console.error(`❌ ${file} missing`);
        allTestsPassed = false;
      }
    });
  }
  
  // Test 3: Check file sizes
  console.log('\n📊 Testing file sizes...');
  if (fs.existsSync(distPath)) {
    const distFiles = fs.readdirSync(distPath);
    const largeFiles = distFiles.filter(file => {
      const stats = fs.statSync(path.join(distPath, file));
      return stats.size > 5 * 1024 * 1024; // 5MB
    });
    
    if (largeFiles.length > 0) {
      console.warn('⚠️ Large files detected:');
      largeFiles.forEach(file => {
        const stats = fs.statSync(path.join(distPath, file));
        console.warn(`   ${file}: ${(stats.size / 1024 / 1024).toFixed(1)}MB`);
      });
    } else {
      console.log('✅ No excessively large files detected');
    }
  }
  
  // Test 4: Check package.json version matches manifest
  console.log('\n🔢 Testing version consistency...');
  try {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const manifestPath = path.join(__dirname, '..', 'public', 'manifest.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    if (packageJson.version === manifest.version) {
      console.log('✅ Version numbers match:', packageJson.version);
    } else {
      console.error('❌ Version mismatch:');
      console.error(`   package.json: ${packageJson.version}`);
      console.error(`   manifest.json: ${manifest.version}`);
      allTestsPassed = false;
    }
  } catch (error) {
    console.error('❌ Version check error:', error.message);
    allTestsPassed = false;
  }
  
  // Test 5: Check for security configuration
  console.log('\n🔒 Testing security configuration...');
  try {
    const manifestPath = path.join(__dirname, '..', 'public', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Check for unlimitedStorage permission
    if (manifest.permissions.includes('unlimitedStorage')) {
      console.log('✅ unlimitedStorage permission present (good for large transcripts)');
    } else {
      console.warn('⚠️ unlimitedStorage permission missing');
    }
    
  } catch (error) {
    console.error('❌ Security check error:', error.message);
    allTestsPassed = false;
  }
  
  // Final result
  console.log('\n================================');
  if (allTestsPassed) {
    console.log('🎉 All deployment tests PASSED!');
    console.log('✅ Extension is ready for deployment');
  } else {
    console.log('❌ Some deployment tests FAILED!');
    console.log('⚠️ Fix issues before deploying');
    process.exit(1);
  }
}

// Run tests
testDeployment();
