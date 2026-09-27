/**
 * Chrome Web Store readiness check, run against the built `dist/`.
 *
 * This exists because of a real, near-miss failure: the extension previously
 * bundled WebLLM, which fetches a compiled `.wasm` model library from a CDN at
 * runtime. Manifest V3 forbids remotely hosted code and the store counts WASM
 * as code, so that alone would have had the listing rejected — and nothing in
 * the build would have told us.
 *
 * The rule being enforced: an extension may fetch external *data* freely, but
 * anything it executes must ship inside the package.
 *
 * Run with `npm run check:store`. Exits non-zero on a hard failure.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '..', 'dist');

const failures = [];
const warnings = [];
const passes = [];

function fail(message) {
  failures.push(message);
}
function warn(message) {
  warnings.push(message);
}
function pass(message) {
  passes.push(message);
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

/* -------------------------------------------------------------------------- */

if (!fs.existsSync(DIST)) {
  console.error('No dist/ directory. Run `npm run build:extension` first.');
  process.exit(1);
}

const files = walk(DIST);
const jsFiles = files.filter((f) => /\.(js|mjs)$/.test(f));
const relative = (f) => path.relative(DIST, f).replace(/\\/g, '/');

/* 1. Remotely hosted code ---------------------------------------------------- */

// Known runtimes that self-fetch executable payloads. Presence of the package
// is the signal; the fetch happens deep inside minified code.
const REMOTE_CODE_PACKAGES = [
  { pattern: /binary-mlc-llm-libs/, name: 'WebLLM model library CDN' },
  { pattern: /@mlc-ai\/web-llm|web-llm/, name: '@mlc-ai/web-llm' },
  // Transformers.js/ORT fetch their WASM at runtime. The extension no longer
  // uses them; if they return, this check should fire before a reviewer does.
  { pattern: /onnxruntime-web/, name: 'onnxruntime-web' },
];

for (const file of jsFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const { pattern, name } of REMOTE_CODE_PACKAGES) {
    if (pattern.test(source)) {
      fail(`${relative(file)} references ${name}, which loads remotely hosted code at runtime.`);
    }
  }
}
if (failures.length === 0) pass('No known remote-code runtimes in the bundle.');

// Dynamic script/WASM loading from an absolute URL.
const REMOTE_LOAD = [
  { pattern: /importScripts\s*\(\s*["'`]https?:/, name: 'importScripts() from a URL' },
  { pattern: /instantiateStreaming\s*\(\s*fetch\s*\(\s*["'`]https?:/, name: 'WASM streamed from a URL' },
  { pattern: /<script[^>]+src=["']https?:/i, name: 'remote <script> tag' },
];

for (const file of files.filter((f) => /\.(js|mjs|html)$/.test(f))) {
  const source = fs.readFileSync(file, 'utf8');
  for (const { pattern, name } of REMOTE_LOAD) {
    if (pattern.test(source)) fail(`${relative(file)} contains ${name}.`);
  }
}

/* 2. Content scripts must be classic scripts ---------------------------------- */

// Content scripts — declared or injected via chrome.scripting — are always
// executed as classic scripts. ESM is fatal: Chrome throws "Cannot use import
// statement outside a module" and extraction dies silently on every page.
// This regressed once already, when a module shared with the popup caused the
// bundler to hoist it into a chunk and emit an `import`.
const manifestPath = path.join(DIST, 'manifest.json');
const manifestForScripts = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  : {};

const contentScriptFiles = new Set(
  (manifestForScripts.content_scripts ?? []).flatMap((entry) => entry.js ?? []),
);
// The popup also injects this on demand for sites outside the declared matches.
contentScriptFiles.add('content-script.js');

for (const name of contentScriptFiles) {
  const file = path.join(DIST, name);
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, 'utf8');
  if (/(^|[;\n])\s*(import|export)[\s{(*]/.test(source)) {
    fail(
      `${name} contains ESM syntax. Content scripts run as classic scripts and will fail to load.`,
    );
  }
}
if (!failures.some((f) => f.includes('ESM syntax'))) {
  pass('Content scripts are classic scripts (no ESM).');
}

/* 3. Required local assets --------------------------------------------------- */

const REQUIRED = [
  'manifest.json',
  'content-script.js',
  'index.html',
  'models/search/embeddings.bin',
  'models/search/vocab.json',
];

for (const required of REQUIRED) {
  if (!fs.existsSync(path.join(DIST, required))) {
    fail(`Missing bundled asset: ${required}. It would have to be fetched at runtime.`);
  }
}
pass(`All ${REQUIRED.length} required assets are bundled.`);

/* 4. Manifest ---------------------------------------------------------------- */

const manifest = JSON.parse(fs.readFileSync(path.join(DIST, 'manifest.json'), 'utf8'));

if (manifest.manifest_version !== 3) fail('Manifest V2 is no longer accepted by the store.');
else pass('Manifest V3.');

// The store requires a 128x128 icon, and without an icons block Chrome shows a
// generic puzzle piece in the toolbar.
const iconSizes = Object.keys(manifest.icons ?? {});
if (iconSizes.length === 0) {
  fail('No "icons" block in the manifest. The store requires at least a 128x128 icon.');
} else if (!manifest.icons['128']) {
  fail('No 128x128 icon. The store requires one.');
} else {
  const missing = iconSizes.filter((size) => !fs.existsSync(path.join(DIST, manifest.icons[size])));
  if (missing.length > 0) fail(`Manifest lists icons that are not in the package: ${missing.join(', ')}`);
  else pass(`Icons present (${iconSizes.join(', ')}px).`);
}

if (!manifest.action?.default_icon) {
  warn('No action.default_icon; the toolbar button falls back to the generic icon.');
}

const csp = manifest.content_security_policy?.extension_pages ?? '';
if (!csp.includes("script-src 'self'")) {
  fail("CSP must restrict script-src to 'self'.");
} else if (/script-src[^;]*https?:/.test(csp)) {
  fail('CSP allows remote script sources.');
} else {
  pass('CSP restricts scripts to the extension itself.');
}

for (const host of manifest.host_permissions ?? []) {
  if (host === '<all_urls>' || host === '*://*/*') {
    warn(`Broad host permission "${host}" invites extra review. activeTab covers most cases.`);
  }
}
if (!(manifest.host_permissions ?? []).some((h) => h === '<all_urls>' || h === '*://*/*')) {
  pass('No all-URLs host permission.');
}

// Every permission should have a defensible justification at review time.
const JUSTIFY = {
  activeTab: 'Read the current tab only when the user clicks the extension.',
  storage: 'Remember export preferences and the last transcript.',
  clipboardWrite: 'Copy the transcript when the user asks.',
  scripting: 'Inject the extractor into the page the user is on.',
  downloads: 'Save exported files.',
  unlimitedStorage:
    'Keep screenshots the user captured from lectures. chrome.storage.local caps at 10 MB, ' +
    'which a few dozen stills exhaust; without this the browser may also evict them under ' +
    'disk pressure. Images stay on the device and are never uploaded.',
};
for (const permission of manifest.permissions ?? []) {
  if (!JUSTIFY[permission]) {
    warn(`Permission "${permission}" has no prepared justification.`);
  }
}

/* 5. Package size ------------------------------------------------------------ */

const totalBytes = files.reduce((sum, f) => sum + fs.statSync(f).size, 0);
const totalMb = totalBytes / 1024 / 1024;
// The hard store limit is 2 GB; this threshold is about keeping the package sane.
if (totalMb > 500) fail(`Package is ${totalMb.toFixed(0)} MB, which is unreasonably large.`);
else pass(`Package is ${totalMb.toFixed(1)} MB (store limit: 2 GB).`);

/* 6. Report ------------------------------------------------------------------ */

console.log('\nChrome Web Store readiness\n' + '='.repeat(40));
for (const message of passes) console.log(`  PASS  ${message}`);
for (const message of warnings) console.log(`  WARN  ${message}`);
for (const message of failures) console.log(`  FAIL  ${message}`);

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} blocking issue(s). This build would likely be rejected.`);
  process.exit(1);
}
console.log(
  warnings.length > 0
    ? `Ready to submit, with ${warnings.length} thing(s) to double-check.`
    : 'Ready to submit.',
);
console.log('Reminder: the store also needs a hosted privacy policy URL.\n');
