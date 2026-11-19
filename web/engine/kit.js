// Low-poly building blocks shared by every city.
// Convention: board play-area is x,z in [-5, 5], ground top at y = 0.
// The camera looks from the +x/+z corner, so only +x and +z facades are visible: details go there.
import * as THREE from 'three';

export const TAU = Math.PI * 2;

// Deterministic PRNG so every render of a city is identical.
export function rng(seed = 1) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const cache = new Map();
export const resetMaterials = () => cache.clear();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!cache.has(key)) {
    cache.set(key, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, metalness: 0, ...opts }));
  }
  return cache.get(key);
}

export function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Primitives positioned by their BASE (y = bottom), not centre.
export const box = (w, h, d, m, x = 0, y = 0, z = 0) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y + h / 2, z);
export const cyl = (rt, rb, h, seg, m, x = 0, y = 0, z = 0) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y + h / 2, z);
export const cone = (r, h, seg, m, x = 0, y = 0, z = 0) => mesh(new THREE.ConeGeometry(r, h, seg), m, x, y + h / 2, z);
export const dome = (r, m, x = 0, y = 0, z = 0, seg = 10) =>
  mesh(new THREE.SphereGeometry(r, seg, Math.max(3, seg / 2), 0, TAU, 0, Math.PI / 2), m, x, y, z);

// Shared, time-of-day driven materials. World updates their intensity every frame.
export function makeShared() {
  return {
    window: new THREE.MeshStandardMaterial({ color: '#3b3f52', emissive: '#ffbf5e', emissiveIntensity: 0, flatShading: true, roughness: 0.4 }),
    windowDark: new THREE.MeshStandardMaterial({ color: '#4a5066', flatShading: true, roughness: 0.3 }),
    bulb: new THREE.MeshStandardMaterial({ color: '#fff1c9', emissive: '#ffcf73', emissiveIntensity: 0, flatShading: true }),
    sign: new THREE.MeshStandardMaterial({ color: '#d84b3a', emissive: '#ff6a4a', emissiveIntensity: 0, flatShading: true }),
  };
}

// Grid of windows on the visible (+x and +z) faces of a box whose base centre is (cx, y0, cz).
// `lit` decides per-window whether it glows at night (rng-driven for a lived-in look).
export function facadeWindows(group, ctx, { cx, cz, y0 = 0, w, h, d, rows, cols, colsZ = cols, ww = 0.16, wh = 0.24, rand, litRatio = 0.7, faces = ['x', 'z'] }) {
  const pick = () => (rand() < litRatio ? ctx.shared.window : ctx.shared.windowDark);
  const rowH = h / rows;
  for (let r = 0; r < rows; r++) {
    const y = y0 + rowH * (r + 0.55) - wh / 2;
    if (faces.includes('x')) for (let c = 0; c < colsZ; c++) {
      const z = cz - d / 2 + (d / colsZ) * (c + 0.5);
      group.add(box(0.04, wh, ww, pick(), cx + w / 2 + 0.01, y, z));
    }
    if (faces.includes('z')) for (let c = 0; c < cols; c++) {
      const x = cx - w / 2 + (w / cols) * (c + 0.5);
      group.add(box(ww, wh, 0.04, pick(), x, y, cz + d / 2 + 0.01));
    }
  }
}

// Street lamp. Registers a glowing bulb; a few lamps also carry a real point light.
export function lamp(group, ctx, x, z, { h = 0.9, light = false, color = '#2d2d33' } = {}) {
  group.add(cyl(0.025, 0.035, h, 6, mat(color), x, 0, z));
  group.add(mesh(new THREE.SphereGeometry(0.07, 6, 4), ctx.shared.bulb, x, h + 0.04, z));
  if (light) {
    const p = new THREE.PointLight('#ffc070', 0, 2.6, 1.6);
    p.position.set(x, h + 0.05, z);
    group.add(p);
    ctx.pointLights.push(p);
  }
}

// Low-poly tree with a gently swaying crown.
export function tree(group, ctx, x, z, { s = 1, color = '#4f8a3c', trunk = '#6b4a2f', rand = Math.random } = {}) {
  const t = new THREE.Group();
  t.position.set(x, 0, z);
  t.add(cyl(0.05 * s, 0.07 * s, 0.45 * s, 5, mat(trunk)));
  const crown = new THREE.Group();
  crown.position.y = 0.45 * s;
  const blobs = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < blobs; i++) {
    const r = (0.3 + rand() * 0.12) * s;
    crown.add(mesh(new THREE.IcosahedronGeometry(r, 0), mat(color), (rand() - 0.5) * 0.25 * s, 0.15 * s + i * 0.18 * s, (rand() - 0.5) * 0.25 * s));
  }
  t.add(crown);
  group.add(t);
  const ph = rand() * TAU;
  ctx.animate.push((u, env) => {
    crown.rotation.z = Math.sin(u * TAU * 2 + ph) * 0.035 * env.wind;
    crown.rotation.x = Math.cos(u * TAU + ph) * 0.025 * env.wind;
  });
  return t;
}

// Delhi-style auto-rickshaw (green body, yellow canopy). Faces +x by default.
export function autoRickshaw() {
  const g = new THREE.Group();
  g.add(box(0.5, 0.18, 0.3, mat('#2f7d3a'), 0, 0.07, 0));
  g.add(box(0.36, 0.22, 0.3, mat('#f2c318'), -0.05, 0.25, 0));
  g.add(box(0.4, 0.04, 0.32, mat('#1f1f1f'), -0.05, 0.47, 0));
  g.add(box(0.12, 0.16, 0.26, mat('#9fd0e6', { roughness: 0.2 }), 0.17, 0.25, 0));
  const wheel = mat('#151515');
  for (const [wx, wz] of [[0.2, 0], [-0.17, 0.14], [-0.17, -0.14]]) {
    const w = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8), wheel, wx, 0.06, wz);
    w.rotation.x = Math.PI / 2;
    g.add(w);
  }
  return g;
}

// Moves N identical objects around a closed path, each advancing 1/N of it per loop,
// so the configuration at u=1 is identical to u=0 (seamless loop).
export function loopAlongPath(ctx, objects, pointAt) {
  const n = objects.length;
  ctx.animate.push((u) => {
    objects.forEach((o, i) => {
      const s = ((i + u) / n) % 1;
      const p = pointAt(s);
      const q = pointAt((s + 0.002) % 1);
      o.position.set(p.x, p.y ?? 0, p.z);
      o.rotation.y = Math.atan2(-(q.z - p.z), q.x - p.x);
    });
  });
}
