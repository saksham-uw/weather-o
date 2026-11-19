#!/usr/bin/env node
// Renders dioramas to wallpaper files with headless Chrome. Free: no AI, everything is procedural.
//
//   node render.mjs --sample                          4 versions each for the sample cities + 2x2 preview
//   node render.mjs --all [--city delhi]              full matrix (every time x weather)
//   node render.mjs --city delhi --time dusk --weather rain
// Options: --size 1179x2556  --fps 30  --still (skip video/Live Photo)  --force
//          --gl metal|swiftshader (default metal; CI runners have no GPU -> swiftshader)
//          --season winter (single render)
//          --time dawn (with --all: only that time of day)
//          --no-live  render png + mp4 only (Linux CI); Live Photos are made later by tools/finalize.mjs
//
// Output: out/<city>/<city>_<time>_<weather>.png      still wallpaper
//                                   .mp4      seamless loop (preview)
//                                   .HEIC/.MOV Live Photo pair (import both into Photos together)

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { serve } from './serve.mjs';
import { CITIES, LOCATIONS, combos, fileStem } from './web/engine/catalog.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'out');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f, d) => (args.includes(f) ? args[args.indexOf(f) + 1] : d);
const [W, H] = opt('--size', '1179x2556').split('x').map(Number);
const FPS = Number(opt('--fps', 30));
const FORCE = flag('--force');

const GL = opt('--gl', process.env.RENDER_GL || 'metal');

const SAMPLE = {
  toronto: [['dawn', 'partly_cloudy', 'normal'], ['day', 'clear', 'winter'], ['dusk', 'snow', 'normal'], ['night', 'rain', 'normal']],
  mississauga: [['dawn', 'fog', 'normal'], ['day', 'partly_cloudy', 'normal'], ['dusk', 'clear', 'winter'], ['night', 'thunderstorm', 'normal']],
  delhi: [['dawn', 'fog', 'normal'], ['day', 'partly_cloudy', 'normal'], ['dusk', 'rain', 'normal'], ['night', 'thunderstorm', 'normal']],
  udaipur: [['dawn', 'clear', 'normal'], ['day', 'overcast', 'normal'], ['dusk', 'partly_cloudy', 'normal'], ['night', 'rain', 'normal']],
};

// job = [city, { time, weather, season }]
let jobs = [];
const only = opt('--city') ? opt('--city').split(',') : null;
if (flag('--sample')) jobs = Object.entries(SAMPLE).filter(([c]) => !only || only.includes(c)).flatMap(([c, l]) => l.map(([time, weather, season]) => [c, { time, weather, season }]));
else if (flag('--all')) jobs = (only || CITIES).flatMap((c) => combos(c).filter((k) => !opt('--time') || k.time === opt('--time')).map((k) => [c, k]));
else jobs = [[opt('--city', 'delhi'), { time: opt('--time', 'day'), weather: opt('--weather', 'clear'), season: opt('--season', 'normal') }]];

// Build the Live Photo tool on first use (compiled binary isn't kept in git).
const LIVEPHOTO = path.join(ROOT, 'bin', 'livephoto');
const LIVE = !flag('--still') && !flag('--no-live');
if (LIVE && !fs.existsSync(LIVEPHOTO)) {
  console.log('building bin/livephoto…');
  fs.mkdirSync(path.dirname(LIVEPHOTO), { recursive: true });
  execFileSync('swiftc', ['-O', path.join(ROOT, 'tools', 'livephoto.swift'), '-o', LIVEPHOTO], { stdio: 'inherit' });
}

const server = await serve(0);
const port = server.address().port;
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    ...(GL === 'swiftshader'
      ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']
      : ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl']),
    // GitHub's Ubuntu runners block Chrome's user-namespace sandbox.
    ...(process.env.CI ? ['--no-sandbox'] : []),
  ],
  protocolTimeout: 600_000,
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('page error:', e.message));
page.on('console', (m) => m.type() === 'error' && console.error('console:', m.text()));
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${port}/web/?render&w=${W}&h=${H}`, { waitUntil: 'load' });
await page.waitForFunction('window.engine && window.engine.ready');
const loopSeconds = await page.evaluate(() => window.engine.loopSeconds);

const grab = (u) => page.evaluate((u) => { window.engine.renderAt(u); return document.getElementById('c').toDataURL('image/png').split(',')[1]; }, u);

for (const [city, combo] of jobs) {
  const dir = path.join(OUT, city);
  fs.mkdirSync(dir, { recursive: true });
  const stem = path.join(dir, fileStem(city, combo));
  const doneMarker = flag('--still') ? `${stem}.png` : LIVE ? `${stem}.MOV` : `${stem}.mp4`;
  if (fs.existsSync(`${stem}.png`) && fs.existsSync(doneMarker) && !FORCE) { console.log(`skip ${path.basename(stem)}`); continue; }
  const t0 = Date.now();
  await page.evaluate((s) => window.engine.setup(s), { city, ...combo });
  fs.writeFileSync(`${stem}.png`, Buffer.from(await grab(0), 'base64'));
  if (!flag('--still')) {
    // Frames are piped straight into ffmpeg (no temp files on disk).
    // yuv420p needs even dimensions; the sub-pixel stretch is invisible.
    const ew = W + (W % 2), eh = H + (H % 2);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-vf', `scale=${ew}:${eh}`, '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${stem}.mp4`],
      { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((res, rej) => ff.on('close', (c) => (c ? rej(new Error(`ffmpeg exit ${c}`)) : res())));
    const n = Math.round(loopSeconds * FPS);
    for (let i = 0; i < n; i++) {
      if (!ff.stdin.write(Buffer.from(await grab(i / n), 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
    }
    ff.stdin.end();
    await done;
    if (LIVE) execFileSync(LIVEPHOTO, [`${stem}.png`, `${stem}.mp4`, stem]);
  }
  console.log(`${path.basename(stem)}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

// 2x2 preview per sample city (plays each loop 3x).
if (flag('--sample')) {
  for (const [city, list] of Object.entries(SAMPLE)) {
    const vids = list.map(([time, weather, season]) => path.join(OUT, city, `${fileStem(city, { time, weather, season })}.mp4`));
    if (!vids.every((v) => fs.existsSync(v))) continue;
    const out = path.join(OUT, city, `${city}_preview.mp4`);
    const scale = vids.map((_, i) => `[${i}:v]scale=540:1170,setsar=1[v${i}]`).join(';');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...vids.flatMap((v) => ['-stream_loop', '2', '-i', v]), '-filter_complex',
      `${scale};[v0][v1][v2][v3]xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0[v]`, '-map', '[v]',
      '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
    console.log(`preview -> ${path.relative(ROOT, out)}`);
  }
}

// Manifest the Shortcut reads: cities with coordinates + every available file stem.
if (flag('--manifest')) {
  const manifest = { cities: LOCATIONS, files: Object.fromEntries(CITIES.map((c) => [c, combos(c).map((k) => fileStem(c, k))])) };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('manifest -> out/manifest.json');
}

await browser.close();
server.close();
