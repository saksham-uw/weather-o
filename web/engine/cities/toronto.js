// Toronto: CN Tower in the back corner, Lake Ontario waterfront along the back-right edge with a ferry,
// City Hall's two curved towers around the council-chamber saucer, Nathan Phillips Square with its reflecting
// pool (a skating rink in winter) under the three arches, TTC streetcars looping the square, Victorian brick shops.
import * as THREE from 'three';
import { TAU, rng, mat, mesh, box, cyl, cone, dome, facadeWindows, lamp, tree, loopAlongPath, roundedRect, ribbon, streetcar, glowMaterial } from '../kit.js';

const CONCRETE = '#c9c6bf', BRICK = '#a5543c', BRICK2 = '#8f4a36', CREAMBRICK = '#d8c3a0';

export default function toronto(g, ctx) {
  const r = rng(1834);
  const concrete = mat(CONCRETE);

  // --- Lake Ontario strip + ferry -----------------------------------------------------------
  const LX0 = -0.6, LX1 = 4.95, LZ0 = -4.95, LZ1 = -3.35;
  const seg = 24;
  const wgeo = new THREE.PlaneGeometry(LX1 - LX0, LZ1 - LZ0, seg, 8);
  wgeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(wgeo, new THREE.MeshStandardMaterial({ color: '#3d7fa6', roughness: 0.15, metalness: 0.1, flatShading: true }));
  water.position.set((LX0 + LX1) / 2, 0.04, (LZ0 + LZ1) / 2);
  water.receiveShadow = true;
  g.add(water);
  const wbase = Float32Array.from(wgeo.attributes.position.array);
  ctx.animate.push((u, env) => {
    const p = wgeo.attributes.position.array, amp = 0.02 + env.wind * 0.02;
    for (let i = 0; i < p.length; i += 3) p[i + 1] = Math.sin(u * TAU + wbase[i] * 2 + wbase[i + 2]) * amp + Math.sin(u * TAU * 2 - wbase[i + 2] * 2) * amp * 0.5;
    wgeo.attributes.position.needsUpdate = true;
    wgeo.computeVertexNormals();
  });
  g.add(box(LX1 - LX0, 0.12, 0.12, mat('#9a948a'), (LX0 + LX1) / 2, 0, LZ1 + 0.06)); // harbourfront edge
  const ferry = new THREE.Group();
  ferry.add(box(1.1, 0.14, 0.4, mat('#f2f2f2'), 0, 0.02, 0));
  ferry.add(box(0.7, 0.18, 0.34, mat('#1f4e8c'), -0.05, 0.16, 0));
  ferry.add(box(0.6, 0.08, 0.3, ctx.shared.window, -0.05, 0.22, 0.03));
  ferry.add(cyl(0.05, 0.05, 0.2, 6, mat('#d9a520'), 0.15, 0.34, 0));
  g.add(ferry);
  ctx.animate.push((u) => {
    ferry.position.set(2.2 + Math.sin(u * TAU) * 0.45, Math.sin(u * TAU * 2) * 0.02, -4.15);
    ferry.rotation.z = Math.sin(u * TAU * 2) * 0.03;
  });

  // --- CN Tower (back corner) -----------------------------------------------------------------
  const cn = new THREE.Group();
  cn.position.set(-3.9, 0, -3.9);
  cn.add(box(1.4, 0.2, 1.4, concrete, 0, 0, 0));
  for (let k = 0; k < 3; k++) {            // three flared legs
    const a = (k / 3) * TAU;
    const leg = box(0.22, 1.6, 0.5, concrete, Math.cos(a) * 0.3, 0.2, Math.sin(a) * 0.3);
    leg.rotation.y = -a;
    cn.add(leg);
  }
  cn.add(cyl(0.2, 0.38, 6.2, 6, concrete, 0, 0.2, 0));               // shaft
  cn.add(cyl(0.62, 0.42, 0.3, 14, mat('#b8b4ad'), 0, 5.9, 0));        // main pod
  cn.add(cyl(0.66, 0.62, 0.32, 14, glowMaterial(ctx, '#4d5966', '#ffcf7a', 1.2), 0, 6.2, 0));
  cn.add(cyl(0.48, 0.66, 0.22, 14, mat('#b8b4ad'), 0, 6.52, 0));
  cn.add(cyl(0.17, 0.2, 0.9, 6, concrete, 0, 6.74, 0));
  cn.add(cyl(0.28, 0.24, 0.16, 10, mat('#b8b4ad'), 0, 7.6, 0));        // SkyPod
  cn.add(cyl(0.05, 0.1, 1.6, 6, mat('#d9d6d0'), 0, 7.76, 0));         // antenna
  cn.add(mesh(new THREE.SphereGeometry(0.05, 6, 4), ctx.shared.sign, 0, 9.4, 0));
  g.add(cn);

  // --- City Hall: two curved towers around the saucer ------------------------------------------
  const C = new THREE.Vector2(-2.0, -1.6);
  g.add(cyl(1.35, 1.35, 0.3, 24, mat('#bdb8ae'), C.x, 0, C.y));          // podium
  const towerGlass = glowMaterial(ctx, '#7f8c96', '#ffd28a', 0.18, { roughness: 0.3 });
  const curved = (a0, a1, h) => {
    const sh = new THREE.Shape();
    const ri = 1.45, ro = 1.85, n = 16;
    // shape y is negated because rotateX(-90deg) maps shape y -> world -z
    const pt = (a, rad) => [Math.cos(a) * rad, -Math.sin(a) * rad];
    sh.moveTo(...pt(a0, ri));
    for (let k = 1; k <= n; k++) sh.lineTo(...pt(a0 + (a1 - a0) * (k / n), ri));
    for (let k = n; k >= 0; k--) sh.lineTo(...pt(a0 + (a1 - a0) * (k / n), ro));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    const m = mesh(geo, [concrete, towerGlass], C.x, 0.3, C.y);
    g.add(m);
    // window bands on the concave face
    for (let f = 0.35; f < h; f += 0.32) {
      const band = mesh(new THREE.CylinderGeometry(ri - 0.01, ri - 0.01, 0.05, 16, 1, true, Math.PI / 2 - a1, a1 - a0), mat('#9aa0a6'), C.x, 0.3 + f, C.y);
      g.add(band);
    }
  };
  curved(THREE.MathUtils.degToRad(150), THREE.MathUtils.degToRad(212), 4.0);
  curved(THREE.MathUtils.degToRad(238), THREE.MathUtils.degToRad(300), 3.2);
  g.add(cyl(0.75, 0.65, 0.35, 18, concrete, C.x, 0.3, C.y));              // council chamber
  const saucer = dome(0.72, mat('#d5d2cb'), C.x, 0.65, C.y, 18);
  saucer.scale.y = 0.42;
  g.add(saucer);

  // --- Nathan Phillips Square: pool / rink + arches -----------------------------------------
  const sq = { x0: 0.0, z0: 0.6, x1: 3.7, z1: 3.7 };
  g.add(box(sq.x1 - sq.x0, 0.04, sq.z1 - sq.z0, mat('#cfcac0'), (sq.x0 + sq.x1) / 2, 0, (sq.z0 + sq.z1) / 2));
  ctx.snowable.push(mat('#cfcac0'));
  const PX = 1.85, PZ = 2.15;
  g.add(box(2.5, 0.08, 1.4, concrete, PX, 0, PZ));
  const pool = ctx.winter
    ? box(2.3, 0.04, 1.2, mat('#dceaf2', { roughness: 0.15 }), PX, 0.06, PZ)      // skating rink
    : box(2.3, 0.04, 1.2, mat('#4a8fb8', { roughness: 0.1 }), PX, 0.06, PZ);
  g.add(pool);
  if (ctx.winter) {                                   // a few skaters gliding around the rink
    const skaters = [0, 1, 2].map((k) => {
      const s = new THREE.Group();
      s.add(cyl(0.035, 0.045, 0.16, 6, mat(['#c0392b', '#2c3e50', '#16a085'][k]), 0, 0.1, 0));
      s.add(mesh(new THREE.SphereGeometry(0.035, 6, 4), mat('#f0c8a0'), 0, 0.29, 0));
      g.add(s);
      return s;
    });
    loopAlongPath(ctx, skaters, (s) => ({ x: PX + Math.cos(s * TAU) * 0.8, y: 0.06, z: PZ + Math.sin(s * TAU) * 0.35 }));
  }
  for (const dx of [-0.7, 0, 0.7]) {                  // the three freedom arches
    const arch = mesh(new THREE.TorusGeometry(0.55, 0.035, 5, 16, Math.PI), concrete, PX + dx, 0.1, PZ);
    arch.rotation.y = Math.PI / 2;
    g.add(arch);
  }

  // --- streetcar loop around the square (2 cars, each half a lap per loop) -------------------
  const route = roundedRect(-0.55, 0.15, 4.35, 4.35, 0.7);
  g.add(ribbon(route.points, 0.42, mat('#5b5d63', { roughness: 0.9 }), 0.012));
  ctx.snowable.push(mat('#5b5d63', { roughness: 0.9 }));
  g.add(ribbon(route.points, 0.03, mat('#9aa0a6', { metalness: 0.6, roughness: 0.3 }), 0.02));
  const cars = [streetcar(ctx), streetcar(ctx)];
  cars.forEach((c) => g.add(c));
  loopAlongPath(ctx, cars, (s) => route.at(s));
  // overhead wire posts
  for (const s of [0.05, 0.3, 0.55, 0.8]) {
    const p = route.at(s);
    lamp(g, ctx, p.x * 1.08, p.z * 1.08, { h: 0.85, light: s === 0.05 || s === 0.55 });
  }

  // --- Victorian brick storefronts (left edge) ----------------------------------------------
  const vic = (cx, cz, w, d, h, c, i) => {
    g.add(box(w, h, d, mat(c), cx, 0, cz));
    const roof = cone(Math.max(w, d) * 0.72, 0.45, 4, mat('#4a4a52'), cx, h, cz);
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    ctx.snowable.push(mat('#4a4a52'));
    g.add(box(0.04, 0.4, d * 0.75, ctx.shared.window, cx + w / 2 + 0.01, 0.06, cz));        // shopfront
    g.add(box(0.05, 0.1, d * 0.8, mat(['#2e7d32', '#1f4e8c', '#8e2b2b'][i % 3]), cx + w / 2 + 0.02, 0.5, cz));
    facadeWindows(g, ctx, { cx, cz, y0: 0.62, w, h: h - 0.65, d, rows: Math.max(1, Math.round((h - 0.65) / 0.45)), cols: 2, colsZ: 2, rand: r });
    g.add(box(0.12, 0.25, 0.12, mat(BRICK2), cx - w * 0.25, h + 0.1, cz - d * 0.25));         // chimney
  };
  vic(-4.2, 1.0, 1.2, 1.1, 1.5, BRICK, 0);
  vic(-4.2, 2.25, 1.2, 1.2, 1.8, CREAMBRICK, 1);
  vic(-4.2, 3.55, 1.2, 1.2, 1.4, BRICK2, 2);
  vic(-2.85, 4.25, 1.0, 1.1, 1.3, BRICK, 3);

  // --- condo / office towers between lake and square ----------------------------------------
  const glassA = glowMaterial(ctx, '#6f8fa3', '#ffd18a', 0.45, { roughness: 0.25 });
  const glassB = glowMaterial(ctx, '#86a9a6', '#ffd18a', 0.4, { roughness: 0.25 });
  g.add(box(1.0, 4.4, 1.0, glassA, 3.9, 0, -2.25));
  g.add(box(1.06, 0.12, 1.06, concrete, 3.9, 4.4, -2.25));
  for (let y = 0.4; y < 4.4; y += 0.4) g.add(box(1.03, 0.04, 1.03, mat('#d6d9dc'), 3.9, y, -2.25));
  g.add(box(1.1, 3.0, 0.9, glassB, 2.4, 0, -2.35));
  for (let y = 0.35; y < 3.0; y += 0.35) g.add(box(1.13, 0.04, 0.93, mat('#d6d9dc'), 2.4, y, -2.35));
  g.add(box(1.0, 1.5, 0.8, mat(CREAMBRICK), 0.85, 0, -2.4));
  facadeWindows(g, ctx, { cx: 0.85, cz: -2.4, w: 1.0, h: 1.5, d: 0.8, rows: 3, cols: 3, colsZ: 2, rand: r });

  // --- maples & lamps -----------------------------------------------------------------------
  const maple = ['#4f8a3c', '#5f9a45', '#6aa04a'];
  for (const [x, z, sc] of [[-3.0, 1.1, 0.9], [-3.1, 2.7, 0.85], [-1.6, 4.4, 0.9], [-0.3, 4.6, 0.8], [4.6, 0.4, 0.85], [4.6, -1.0, 0.8],
    [-4.5, -1.2, 0.9], [-3.3, -0.6, 0.8], [0.6, 1.2, 0.7], [3.1, 3.2, 0.7], [0.6, 3.2, 0.7], [-0.3, -1.6, 0.75]]) {
    tree(g, ctx, x, z, { s: sc, color: maple[Math.floor(r() * 3)], rand: r });
  }
  for (const [x, z, light] of [[-3.2, 0.2, true], [-2.3, 3.6, false], [1.85, 0.75, true], [3.4, 1.5, false], [0.4, -0.9, false]]) lamp(g, ctx, x, z, { light });
}
