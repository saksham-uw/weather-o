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
    ctx.foliage.push(mat(color));
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
export function loopAlongPath(ctx, objects, pointAt, step = 1) {
  const n = objects.length;
  ctx.animate.push((u) => {
    objects.forEach((o, i) => {
      const s = ((i + u * step) / n) % 1;
      const p = pointAt(s);
      const q = pointAt((s + 0.002) % 1);
      o.position.set(p.x, p.y ?? 0, p.z);
      o.rotation.y = Math.atan2(-(q.z - p.z), q.x - p.x);
    });
  });
}

// Closed rounded-rectangle route sampled by arc length: { points, at(s) } with s in [0,1).
export function roundedRect(x0, z0, x1, z1, rad, samples = 480) {
  const raw = [];
  const corners = [[x1 - rad, z1 - rad, 0], [x0 + rad, z1 - rad, Math.PI / 2], [x0 + rad, z0 + rad, Math.PI], [x1 - rad, z0 + rad, Math.PI * 1.5]];
  for (const [cx, cz, a0] of corners) for (let k = 0; k <= 12; k++) {
    const a = a0 + (k / 12) * (Math.PI / 2);
    raw.push(new THREE.Vector3(cx + Math.cos(a) * rad, 0, cz + Math.sin(a) * rad));
  }
  const curve = new THREE.CatmullRomCurve3(raw, true, 'centripetal');
  const points = curve.getSpacedPoints(samples);
  return { points, at: (s) => curve.getPointAt(((s % 1) + 1) % 1) };
}

// Flat strip (road / track bed) following a closed list of points.
export function ribbon(points, width, material, y = 0.01) {
  const pos = [], idx = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p = points[i], q = points[(i + 1) % n];
    const dx = q.x - p.x, dz = q.z - p.z, l = Math.hypot(dx, dz) || 1;
    const nx = (-dz / l) * width / 2, nz = (dx / l) * width / 2;
    pos.push(p.x + nx, y, p.z + nz, p.x - nx, y, p.z - nz);
    const a = i * 2, b = ((i + 1) % n) * 2;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material);
  m.receiveShadow = true;
  return m;
}

function wheels(g, xs, zs, r = 0.07) {
  for (const x of xs) for (const z of zs) {
    const w = mesh(new THREE.CylinderGeometry(r, r, 0.05, 8), mat('#151515'), x, r, z);
    w.rotation.x = Math.PI / 2;
    g.add(w);
  }
}

// TTC-style red streetcar. Faces +x.
export function streetcar(ctx) {
  const g = new THREE.Group();
  g.add(box(1.1, 0.32, 0.3, mat('#d92b2b'), 0, 0.1, 0));
  g.add(box(1.1, 0.06, 0.31, mat('#f4f1ea'), 0, 0.2, 0));
  g.add(box(1.0, 0.12, 0.31, ctx.shared.window, 0, 0.28, 0));
  g.add(box(1.04, 0.05, 0.28, mat('#5a5f66'), 0, 0.42, 0));
  const pole = box(0.03, 0.03, 0.5, mat('#333'), -0.2, 0.47, 0);
  pole.rotation.z = 0.5;
  g.add(pole);
  wheels(g, [-0.38, 0.38], [-0.1, 0.1], 0.06);
  return g;
}

// MiWay-style city bus (white with blue band). Faces +x.
export function bus(ctx) {
  const g = new THREE.Group();
  g.add(box(1.0, 0.36, 0.32, mat('#f3f4f6'), 0, 0.08, 0));
  g.add(box(1.01, 0.08, 0.33, mat('#1f5fbf'), 0, 0.1, 0));
  g.add(box(0.9, 0.12, 0.33, ctx.shared.window, -0.03, 0.27, 0));
  g.add(box(0.03, 0.14, 0.26, mat('#9fd0e6', { roughness: 0.2 }), 0.5, 0.25, 0));
  wheels(g, [-0.32, 0.32], [-0.14, 0.14]);
  return g;
}

// Generic car. Faces +x.
export function car(color) {
  const g = new THREE.Group();
  g.add(box(0.5, 0.13, 0.26, mat(color), 0, 0.05, 0));
  g.add(box(0.28, 0.11, 0.24, mat('#a9c8d8', { roughness: 0.2 }), -0.03, 0.18, 0));
  wheels(g, [-0.15, 0.15], [-0.12, 0.12], 0.05);
  return g;
}

// Extra emissive materials (glass towers etc.) whose glow follows the lights level: ctx.glow(mat, strength).
export function glowMaterial(ctx, color, emissive, k = 1, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0, flatShading: true, roughness: 0.35, ...opts });
  ctx.emissives.push([m, k]);
  return m;
}
