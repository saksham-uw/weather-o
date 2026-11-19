// Diorama world: board, camera, time-of-day lighting, and weather that lives strictly inside the board.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { TAU, rng, mat, mesh, box, makeShared, resetMaterials } from './kit.js';

export const HALF = 5;            // play area is [-HALF, HALF]
const BOARD = 10.6;               // wooden board footprint
const BOARD_H = 1.1;

// ---- time of day --------------------------------------------------------------------------
const TIMES = {
  dawn: { sky: ['#f3b8a6', '#b9a3d6'], sun: { pos: [9, 3.2, 3], color: '#ffb183', i: 2.2 }, hemi: ['#f6c9c0', '#5d4d6b', 0.9], lights: 0.35 },
  day: { sky: ['#8ec5f2', '#e3f1fb'], sun: { pos: [5, 11, 8], color: '#fff3df', i: 3.0 }, hemi: ['#d6ebff', '#8b8577', 1.1], lights: 0 },
  dusk: { sky: ['#f08259', '#5d3a78'], sun: { pos: [-2, 3.2, 10], color: '#ff8a45', i: 2.4 }, hemi: ['#ff9c7a', '#3d2a4f', 0.8], lights: 0.85 },
  night: { sky: ['#0d1836', '#2a3d72'], sun: { pos: [4, 10, 7], color: '#9db2ff', i: 1.1 }, hemi: ['#5a6fae', '#1a1a2e', 1.0], lights: 1 },
};

// ---- weather -------------------------------------------------------------------------------
const WEATHER = {
  clear: { clouds: 0, dark: 0, wind: 0.6 },
  partly_cloudy: { clouds: 3, cloudColor: '#ffffff', dark: 0.05, wind: 0.8 },
  overcast: { clouds: 7, cloudColor: '#c9ccd3', dark: 0.35, wind: 1 },
  rain: { clouds: 6, cloudColor: '#9aa0ab', dark: 0.45, rain: 700, wind: 1.3 },
  thunderstorm: { clouds: 7, cloudColor: '#6c7280', dark: 0.62, rain: 1000, lightning: true, wind: 1.8 },
  snow: { clouds: 5, cloudColor: '#e3e7ee', dark: 0.25, snow: 500, wind: 0.5 },
  fog: { clouds: 0, dark: 0.2, fog: true, wind: 0.3 },
};

const GREY = new THREE.Color('#8a8f99');

function skyTexture(top, bottom) {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, top); grad.addColorStop(1, bottom);
  g.fillStyle = grad; g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function woodTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#6a3d24'; g.fillRect(0, 0, 512, 64);
  const r = rng(7);
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `rgba(${40 + r() * 30},${20 + r() * 15},10,${0.25 + r() * 0.3})`;
    g.lineWidth = 1 + r() * 2;
    g.beginPath();
    const y = r() * 64;
    g.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x / 60 + i) * 3 * r());
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function softDot(color = '#ffffff') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, color); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class World {
  constructor(canvas, { width, height, pixelRatio = 1 }) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.camera = new THREE.OrthographicCamera();
    this.resize(width, height);
  }

  resize(width, height) {
    this.width = width; this.height = height;
    this.renderer.setSize(width, height, false);
    if (this.composer) this.composer.setSize(width, height);
    this.frame();
  }

  // Isometric-ish ortho camera: board spans ~88% of the width (or fits height on wide screens),
  // sitting in the lower part of the frame so the top stays clear for the lock-screen clock.
  frame() {
    const aspect = this.width / this.height;
    const boardScreenW = BOARD * Math.SQRT2;
    let viewW = boardScreenW / 1.0;
    let viewH = viewW / aspect;
    const minH = 24; // board + tallest landmarks + clock headroom
    if (viewH < minH) { viewH = minH; viewW = viewH * aspect; }
    const c = this.camera;
    c.left = -viewW / 2; c.right = viewW / 2;
    c.top = viewH * 0.53; c.bottom = -viewH * 0.47;
    c.near = 0.1; c.far = 200;
    const elev = THREE.MathUtils.degToRad(30), dist = 60;
    c.position.set(Math.cos(elev) * dist / Math.SQRT2, Math.sin(elev) * dist, Math.cos(elev) * dist / Math.SQRT2);
    c.lookAt(0, 0, 0);
    c.updateProjectionMatrix();
  }

  load(buildCity, { time = 'day', weather = 'clear', season = 'normal' } = {}) {
    const T = TIMES[time], W = WEATHER[weather];
    if (!T || !W) throw new Error(`unknown time/weather ${time}/${weather}`);
    resetMaterials();
    this.composer?.dispose();
    const scene = (this.scene = new THREE.Scene());
    const winter = season === 'winter' || weather === 'snow';
    const ctx = (this.ctx = { animate: [], pointLights: [], shared: makeShared(), snowable: [], foliage: [], emissives: [], winter });
    this.env = { wind: W.wind, time, weather };

    // Sky: plain gradient, darkened/greyed by weather.
    const mix = (hex) => '#' + new THREE.Color(hex).lerp(GREY, W.dark * (time === 'night' ? 0.3 : 0.75)).getHexString();
    scene.background = skyTexture(mix(T.sky[0]), mix(T.sky[1]));

    // Lights.
    const sun = new THREE.DirectionalLight(T.sun.color, T.sun.i * (1 - W.dark * 0.8));
    sun.position.set(...T.sun.pos).multiplyScalar(2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 80 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    sun.shadow.radius = 3;
    scene.add(sun);
    const hemi = new THREE.HemisphereLight(T.hemi[0], T.hemi[1], T.hemi[2] * (1 - W.dark * 0.35));
    scene.add(hemi);
    this.sun = sun; this.hemi = hemi;
    this.baseHemi = hemi.intensity;

    // Lights-on level: darker weather turns lights on earlier.
    this.lights = Math.min(1, T.lights + (time === 'day' ? W.dark * 0.6 : W.dark * 0.3));

    // Board.
    const board = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.6, flatShading: true });
    board.add(mesh(new THREE.BoxGeometry(BOARD, BOARD_H, BOARD), wood, 0, -BOARD_H / 2 - 0.02, 0));
    const ground = box(BOARD - 0.4, 0.04, BOARD - 0.4, mat('#b7b1a7'), 0, -0.04, 0);
    board.add(ground);
    ctx.snowable.push(ground.material);
    scene.add(board);

    // City.
    const city = new THREE.Group();
    buildCity(city, ctx);
    scene.add(city);
    scene.updateMatrixWorld(true);
    this.solids = [ground, ...collectMeshes(city)];
    this.skyline = new THREE.Box3().setFromObject(city).max.y;
    // x,z of the tallest landmark: clouds keep clear of it so it never reads as a stem/chimney.
    let topY = -1;
    for (const m of this.solids) {
      const bb = new THREE.Box3().setFromObject(m);
      if (bb.max.y > topY) { topY = bb.max.y; this.peak = bb.getCenter(new THREE.Vector3()); }
    }

    // Weather systems (all bounded to the board footprint).
    if (W.clouds) this.addClouds(W);
    if (W.rain) this.addPrecip(W.rain, 'rain');
    if (W.snow) this.addPrecip(W.snow, 'snow');
    if (W.fog) this.addFog(time);
    if (W.lightning) this.addLightning();
    if (winter) {
      for (const m of new Set(ctx.snowable)) m.color.lerp(new THREE.Color('#f4f6fa'), 0.75);
      for (const m of new Set(ctx.foliage)) m.color.lerp(new THREE.Color('#e9eef2'), 0.6);
    }
    if (weather === 'rain' || weather === 'thunderstorm') for (const m of new Set(ctx.snowable)) { m.roughness = 0.25; m.color.multiplyScalar(0.8); }

    // Post: subtle bloom so lit windows and lamps glow at night.
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(this.width, this.height), 0.1 + this.lights * 0.3, 0.35, 0.95);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.composer.setSize(this.width, this.height);
  }

  // ---- clouds: hover over the board, drift back and forth, never leave the footprint ----
  addClouds(W) {
    const r = rng(11), clouds = [];
    const night = this.env.time === 'night';
    // Warm dawn/dusk light turns grey clouds brown (reads as smoke): give them a cool self-tint instead.
    const warm = this.env.time === 'dawn' || this.env.time === 'dusk';
    const grey = W.clouds > 3;
    const m = new THREE.MeshStandardMaterial({ color: W.cloudColor, roughness: 1, flatShading: true,
      emissive: warm && grey ? '#8d96aa' : W.cloudColor, emissiveIntensity: night ? 0.12 : warm && grey ? 0.35 : 0.04 });
    const slotXZ = (k, rad) => [Math.cos((k / 8) * TAU) * rad, Math.sin((k / 8) * TAU) * rad];
    const slots = Array.from({ length: 8 }, (_, k) => k)
      .filter((k) => { const [x, z] = slotXZ(k, 3); return Math.hypot(x - this.peak.x, z - this.peak.z) > 3.2; })
      .sort(() => r() - 0.5);
    for (let i = 0; i < W.clouds; i++) {
      const g = new THREE.Group();
      const n = 4 + Math.floor(r() * 4);
      const size = W.clouds > 4 ? 1.1 : 0.85;
      for (let k = 0; k < n; k++) {
        const s = size * (0.45 + r() * 0.5);
        const b = mesh(new THREE.IcosahedronGeometry(s, 1), m, (k - n / 2) * 0.45 * size + r() * 0.2, r() * 0.35, (r() - 0.5) * 0.7 * size);
        b.scale.y = 0.75;
        b.castShadow = true; b.receiveShadow = false;
        g.add(b);
      }
      const lim = HALF - 1.8;
      // Overcast/rain clouds form a layer; partly-cloudy ones scatter at varied heights.
      // ring of 8 slots around the centre so clouds frame the skyline instead of capping one tower
      const a = (slots[i % slots.length] / 8) * TAU + (r() - 0.5) * 0.4, rad = Math.min(lim, 2.4 + r() * 1.0) * (i >= slots.length ? 0.55 : 1);
      const bx = Math.cos(a) * rad, bz = Math.sin(a) * rad;
      const by = W.clouds > 4 ? this.skyline + 0.4 + r() * 0.8 : this.skyline * (0.55 + r() * 0.4) + 0.8;
      g.position.set(bx, by, bz);
      this.scene.add(g);
      clouds.push({ g, bx, by, bz, ph: r() * TAU, amp: 0.25 + r() * 0.3 });
    }
    this.cloudBase = Math.min(...clouds.map((c) => c.by)) - 0.2;
    this.ctx.animate.push((u) => {
      for (const c of clouds) {
        c.g.position.x = c.bx + Math.sin(u * TAU + c.ph) * c.amp;
        c.g.position.z = c.bz + Math.cos(u * TAU + c.ph) * c.amp * 0.5;
        c.g.position.y = c.by + Math.sin(u * TAU * 2 + c.ph) * 0.06;
      }
    });
  }

  // Height of the first surface below (x,z): rain/snow stop on roofs, roads, water.
  surfaceY(x, z) {
    const ray = new THREE.Raycaster(new THREE.Vector3(x, 30, z), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObjects(this.solids, false)[0];
    return hit ? hit.point.y : 0;
  }

  // ---- rain / snow: falls from the cloud layer onto whatever is below, inside the board ----
  addPrecip(count, kind) {
    const r = rng(kind === 'rain' ? 21 : 31);
    const top = this.cloudBase ?? 7;
    const lim = HALF - 0.15;
    const drops = [];
    for (let i = 0; i < count; i++) {
      const x = (r() * 2 - 1) * lim, z = (r() * 2 - 1) * lim;
      const ground = this.surfaceY(x, z);
      const D = top - ground;
      // Integer cycles per loop => seamless. Rain ~9 u/s, snow ~1.2 u/s (loop is 4s).
      const speed = kind === 'rain' ? 9 : 1.2;
      const k = Math.max(1, Math.round((speed * this.loopSeconds) / D));
      drops.push({ x, z, ground, D, k, ph: r(), sway: r() * TAU });
    }
    if (kind === 'rain') {
      const pos = new Float32Array(count * 6);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#d6e4f5', transparent: true, opacity: 0.55 }));
      lines.frustumCulled = false;
      this.scene.add(lines);
      // Splashes: tiny flat rings that pop where a drop lands.
      const splashGeo = new THREE.BufferGeometry();
      const sPos = new Float32Array(count * 3);
      splashGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
      const splashes = new THREE.Points(splashGeo, new THREE.PointsMaterial({ color: '#e8f1ff', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.8 }));
      splashes.frustumCulled = false;
      this.scene.add(splashes);
      const len = 0.32;
      this.ctx.animate.push((u) => {
        drops.forEach((d, i) => {
          const f = (d.ph + u * d.k) % 1;
          const y = d.ground + d.D * (1 - f);
          pos.set([d.x, y + len, d.z, d.x, Math.max(d.ground, y), d.z], i * 6);
          // splash visible just after landing (first 6% of the next cycle)
          const landed = f < 0.06;
          sPos.set([d.x, landed ? d.ground + 0.02 : -999, d.z], i * 3);
        });
        geo.attributes.position.needsUpdate = true;
        splashGeo.attributes.position.needsUpdate = true;
      });
    } else {
      const pos = new Float32Array(count * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const flakes = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: 4, sizeAttenuation: false, map: softDot(), transparent: true, depthWrite: false }));
      flakes.frustumCulled = false;
      this.scene.add(flakes);
      this.ctx.animate.push((u) => {
        drops.forEach((d, i) => {
          const f = (d.ph + u * d.k) % 1;
          const sx = Math.sin(u * TAU * 2 + d.sway) * 0.12;
          pos.set([Math.max(-HALF, Math.min(HALF, d.x + sx)), d.ground + d.D * (1 - f), d.z], i * 3);
        });
        geo.attributes.position.needsUpdate = true;
      });
    }
  }

  // ---- fog: soft low banks drifting between buildings, kept inside the board ----
  addFog(time) {
    const r = rng(41);
    const color = { dawn: '#ffe2d6', day: '#f2f4f7', dusk: '#f2c9b8', night: '#8d9bc0' }[time];
    const tex = softDot(color);
    const banks = [];
    for (let i = 0; i < 26; i++) {
      const s = 2.2 + r() * 1.6;
      const lim = HALF - s / 2.4;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.32 + r() * 0.18, depthWrite: false }));
      sp.scale.set(s, s * 0.55, 1);
      const bx = (r() * 2 - 1) * lim, bz = (r() * 2 - 1) * lim, by = 0.25 + r() * 1.8;
      sp.position.set(bx, by, bz);
      this.scene.add(sp);
      banks.push({ sp, bx, bz, by, lim, ph: r() * TAU, amp: 0.3 + r() * 0.4 });
    }
    this.ctx.animate.push((u) => {
      for (const b of banks) {
        b.sp.position.x = THREE.MathUtils.clamp(b.bx + Math.sin(u * TAU + b.ph) * b.amp, -b.lim, b.lim);
        b.sp.position.z = THREE.MathUtils.clamp(b.bz + Math.cos(u * TAU + b.ph) * b.amp, -b.lim, b.lim);
      }
    });
  }

  // ---- lightning: a bolt from the cloud layer to the board, two flashes per loop ----
  addLightning() {
    const r = rng(51);
    const x0 = -1 + r() * 2, z0 = -1 + r() * 2;
    const top = this.cloudBase ?? 6.5;
    const bottom = this.surfaceY(x0 + 0.6, z0 + 0.4);
    const pts = [];
    const steps = 9;
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      const jitter = i === 0 || i === steps ? 0 : (r() - 0.5) * 0.5;
      pts.push(new THREE.Vector3(x0 + f * 0.6 + jitter, top - f * (top - bottom), z0 + f * 0.4 + jitter * 0.5));
    }
    const boltMat = new THREE.MeshBasicMaterial({ color: '#f4f2ff' });
    const bolt = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0), 40, 0.035, 4), boltMat);
    bolt.visible = false;
    this.scene.add(bolt);
    const flash = new THREE.PointLight('#cfd8ff', 0, 14, 1.2);
    flash.position.set(x0, top - 0.5, z0);
    this.scene.add(flash);
    this.ctx.animate.push((u) => {
      const on = (u > 0.3 && u < 0.33) || (u > 0.355 && u < 0.375);
      bolt.visible = on;
      flash.intensity = on ? 60 : 0;
      this.hemi.intensity = this.baseHemi * (on ? 2.2 : 1);
    });
  }

  // u in [0,1): loop phase. Everything animates as a function of u only => deterministic, seamless.
  renderAt(u) {
    const L = this.lights;
    const sh = this.ctx.shared;
    sh.window.emissiveIntensity = L * 0.9;
    sh.bulb.emissiveIntensity = L * 5;
    sh.sign.emissiveIntensity = L * 0.8;
    for (const p of this.ctx.pointLights) p.intensity = L * 2;
    for (const [m, k] of this.ctx.emissives) m.emissiveIntensity = L * k;
    for (const f of this.ctx.animate) f(u, this.env);
    this.composer.render();
  }
}

function collectMeshes(root) {
  const out = [];
  root.traverse((o) => { if (o.isMesh) out.push(o); });
  return out;
}

World.prototype.loopSeconds = 4;
