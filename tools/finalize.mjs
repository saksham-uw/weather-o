#!/usr/bin/env node
// Turns rendered out/<city>/*.png + *.mp4 into Live Photo pairs (macOS only) and writes out/manifest.json.
// Used by CI after the Linux render jobs; also works locally.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CITIES, LOCATIONS, combos, fileStem } from '../web/engine/catalog.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'out');
const LIVEPHOTO = path.join(ROOT, 'bin', 'livephoto');

if (!fs.existsSync(LIVEPHOTO)) {
  fs.mkdirSync(path.dirname(LIVEPHOTO), { recursive: true });
  execFileSync('swiftc', ['-O', path.join(ROOT, 'tools', 'livephoto.swift'), '-o', LIVEPHOTO], { stdio: 'inherit' });
}

const missing = [];
let made = 0;
for (const city of CITIES) {
  for (const combo of combos(city)) {
    const stem = path.join(OUT, city, fileStem(city, combo));
    if (!fs.existsSync(`${stem}.png`) || !fs.existsSync(`${stem}.mp4`)) { missing.push(path.basename(stem)); continue; }
    if (!fs.existsSync(`${stem}.MOV`)) { execFileSync(LIVEPHOTO, [`${stem}.png`, `${stem}.mp4`, stem]); made++; }
  }
}

const manifest = {
  generated: new Date().toISOString(),
  cities: LOCATIONS,
  files: Object.fromEntries(CITIES.map((c) => [c, combos(c).map((k) => fileStem(c, k))])),
};
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Live Photos made: ${made}. Manifest written.`);
if (missing.length) {
  console.error(`Missing renders (${missing.length}):\n  ${missing.join('\n  ')}`);
  process.exit(1);
}
