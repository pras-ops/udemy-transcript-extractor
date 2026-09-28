#!/usr/bin/env node
/**
 * Zip `dist/` into the archive the Chrome Web Store accepts.
 *
 * Two details decide whether an upload is accepted, and neither produces a
 * useful error when wrong:
 *
 * 1. `manifest.json` must sit at the **root** of the archive. Zipping the
 *    `dist` folder itself buries it at `dist/manifest.json` and the store
 *    rejects the package.
 * 2. Paths inside a zip must use **forward slashes** (APPNOTE 4.4.17.1).
 *    PowerShell's `Compress-Archive` writes backslashes, which some
 *    extractors treat as part of the filename rather than as a directory.
 *
 * Written by hand rather than shelling out, so neither depends on which zip
 * tool happens to be installed. Entries are **stored**, not deflated: the bulk
 * of the package is an already-compressed model and PNG icons, so compressing
 * again costs time and saves almost nothing. This mirrors `src/lib/zip.ts`,
 * which is unit tested.
 */

import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');

if (!existsSync(resolve(dist, 'manifest.json'))) {
  console.error('No dist/manifest.json — run `npm run deploy` first.');
  process.exit(1);
}

const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const manifestVersion = JSON.parse(readFileSync(resolve(dist, 'manifest.json'), 'utf8')).version;

// A mismatch means the store would advertise one version while running another.
if (version !== manifestVersion) {
  console.error(`Version mismatch: package.json is ${version}, manifest is ${manifestVersion}.`);
  process.exit(1);
}

/* -------------------------------------------------------------------------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Every file under `dir`, as archive-relative forward-slash paths. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(relative(dist, full).split(/[\\/]/).join('/'));
  }
  return out;
}

function dosDateTime(date) {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date:
      ((Math.max(1980, date.getFullYear()) - 1980) << 9) |
      ((date.getMonth() + 1) << 5) |
      date.getDate(),
  };
}

const paths = walk(dist).sort();
const now = new Date();
const { time, date } = dosDateTime(now);

const local = [];
const central = [];
let offset = 0;

for (const path of paths) {
  const name = Buffer.from(path, 'utf8');
  const data = readFileSync(resolve(dist, path));
  const crc = crc32(data);

  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4); // version needed
  header.writeUInt16LE(0, 6); // flags
  header.writeUInt16LE(0, 8); // method: store
  header.writeUInt16LE(time, 10);
  header.writeUInt16LE(date, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(name.length, 26);
  header.writeUInt16LE(0, 28); // extra
  local.push(header, name, data);

  const entry = Buffer.alloc(46);
  entry.writeUInt32LE(0x02014b50, 0);
  entry.writeUInt16LE(20, 4); // version made by
  entry.writeUInt16LE(20, 6); // version needed
  entry.writeUInt16LE(0, 8);
  entry.writeUInt16LE(0, 10);
  entry.writeUInt16LE(time, 12);
  entry.writeUInt16LE(date, 14);
  entry.writeUInt32LE(crc, 16);
  entry.writeUInt32LE(data.length, 20);
  entry.writeUInt32LE(data.length, 24);
  entry.writeUInt16LE(name.length, 28);
  entry.writeUInt16LE(0, 30); // extra
  entry.writeUInt16LE(0, 32); // comment
  entry.writeUInt16LE(0, 34); // disk
  entry.writeUInt16LE(0, 36); // internal attrs
  entry.writeUInt32LE(0, 38); // external attrs
  entry.writeUInt32LE(offset, 42);
  central.push(entry, name);

  offset += header.length + name.length + data.length;
}

const centralBytes = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(0, 4);
end.writeUInt16LE(0, 6);
end.writeUInt16LE(paths.length, 8);
end.writeUInt16LE(paths.length, 10);
end.writeUInt32LE(centralBytes.length, 12);
end.writeUInt32LE(offset, 16);
end.writeUInt16LE(0, 20);

const output = resolve(root, `transcript-extractor-v${version}.zip`);
if (existsSync(output)) rmSync(output);
writeFileSync(output, Buffer.concat([...local, centralBytes, end]));

console.log(`Packaged ${paths.length} files from dist/`);
for (const path of paths) console.log(`  ${path}`);
console.log(`\n${output}`);
console.log(`Size: ${(statSync(output).size / 1024 / 1024).toFixed(1)} MB`);
console.log('\nUpload at https://chrome.google.com/webstore/devconsole');
