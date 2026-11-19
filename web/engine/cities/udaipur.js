// Udaipur: City Palace in an L along the back-left, Lake Pichola filling the front with the white Lake Palace on
// its island and boats circling it, ghats stepping into the water, Jagdish temple + pastel havelis at the right
// corner, haveli lane with lanterns at the left corner, Aravalli hills in the back corner.
import * as THREE from 'three';
import { TAU, rng, mat, mesh, box, cyl, cone, dome, facadeWindows, lamp, tree, loopAlongPath } from '../kit.js';

const CREAM = '#efe3c7', CREAM_D = '#d8c7a0', WHITE = '#f6f3ec', STONE = '#c9bda5';

// Small domed kiosk (chhatri) used all over the palace roofline.
function chhatri(g, x, y, z, s = 1, m = mat(WHITE)) {
  for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(cyl(0.022 * s, 0.022 * s, 0.26 * s, 4, m, x + px * 0.12 * s, y, z + pz * 0.12 * s));
  g.add(box(0.34 * s, 0.05 * s, 0.34 * s, m, x, y + 0.26 * s, z));
  g.add(dome(0.15 * s, m, x, y + 0.31 * s, z, 8));
}

export default function udaipur(g, ctx) {
  const r = rng(1559);
  const cream = mat(CREAM), creamD = mat(CREAM_D), white = mat(WHITE), stone = mat(STONE);
  ctx.snowable.push(creamD, stone);

  // --- Lake Pichola ------------------------------------------------------------------------
  const LX0 = -1.7, LZ0 = -1.7, LX1 = 4.75, LZ1 = 4.75;
  const lw = LX1 - LX0, ld = LZ1 - LZ0;
  // lake bed (darker) and animated low-poly water surface
  g.add(box(lw, 0.02, ld, mat('#2a5d73'), (LX0 + LX1) / 2, 0, (LZ0 + LZ1) / 2));
  const seg = 28;
  const wgeo = new THREE.PlaneGeometry(lw, ld, seg, seg);
  wgeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(wgeo, new THREE.MeshStandardMaterial({ color: '#3f93b8', roughness: 0.15, metalness: 0.1, flatShading: true, transparent: true, opacity: 0.92 }));
  water.position.set((LX0 + LX1) / 2, 0.06, (LZ0 + LZ1) / 2);
  water.receiveShadow = true;
  g.add(water);
  const base = Float32Array.from(wgeo.attributes.position.array);
  ctx.animate.push((u, env) => {
    const p = wgeo.attributes.position.array;
    const amp = 0.025 + env.wind * 0.02;
    for (let i = 0; i < p.length; i += 3) {
      const x = base[i], z = base[i + 2];
      p[i + 1] = Math.sin(u * TAU + x * 2.1 + z * 0.7) * amp + Math.sin(u * TAU * 2 - z * 1.7 + x * 0.4) * amp * 0.5;
    }
    wgeo.attributes.position.needsUpdate = true;
    wgeo.computeVertexNormals();
  });
  // stone rim along the outer (board-edge) sides of the lake
  g.add(box(0.12, 0.16, ld, stone, LX1 + 0.06, 0, (LZ0 + LZ1) / 2));
  g.add(box(lw + 0.12, 0.16, 0.12, stone, (LX0 + LX1) / 2 + 0.06, 0, LZ1 + 0.06));

  // --- Lake Palace on its island -----------------------------------------------------------
  const IX = 1.9, IZ = 1.9;
  const isl = new THREE.Group();
  isl.position.set(IX, 0, IZ);
  isl.add(cyl(1.0, 1.05, 0.16, 16, stone, 0, 0, 0));
  isl.add(box(1.5, 0.45, 1.1, white, 0, 0.16, 0));
  isl.add(box(1.1, 0.35, 0.8, white, -0.05, 0.61, -0.05));
  isl.add(box(1.56, 0.05, 1.16, mat('#e0d8c8'), 0, 0.6, 0));
  facadeWindows(isl, ctx, { cx: 0, cz: 0, y0: 0.18, w: 1.5, h: 0.42, d: 1.1, rows: 1, cols: 5, colsZ: 4, ww: 0.1, wh: 0.16, rand: r, litRatio: 0.9 });
  facadeWindows(isl, ctx, { cx: -0.05, cz: -0.05, y0: 0.63, w: 1.1, h: 0.32, d: 0.8, rows: 1, cols: 4, colsZ: 3, ww: 0.08, wh: 0.13, rand: r, litRatio: 0.9 });
  isl.add(dome(0.22, white, -0.05, 0.96, -0.05, 10));
  chhatri(isl, 0.55, 0.65, 0.35, 0.7);
  chhatri(isl, -0.6, 0.65, 0.35, 0.7);
  chhatri(isl, 0.55, 0.65, -0.4, 0.7);
  for (const a of [0.3, 1.9, 3.5, 5.1]) isl.add(cyl(0.02, 0.02, 0.3, 4, mat('#333'), Math.cos(a) * 0.9, 0.16, Math.sin(a) * 0.9));
  for (const a of [0.3, 1.9, 3.5, 5.1]) isl.add(mesh(new THREE.SphereGeometry(0.045, 6, 4), ctx.shared.bulb, Math.cos(a) * 0.9, 0.5, Math.sin(a) * 0.9));
  g.add(isl);
  const islandLight = new THREE.PointLight('#ffc070', 0, 2.5, 1.6);
  islandLight.position.set(IX + 0.8, 0.6, IZ + 0.8);
  g.add(islandLight);
  ctx.pointLights.push(islandLight);

  // --- boats circling the island (2 boats, each half a lap per loop) -----------------------
  const boat = () => {
    const b = new THREE.Group();
    b.add(box(0.5, 0.08, 0.18, mat('#8b5a2b'), 0, 0.04, 0));
    b.add(box(0.36, 0.04, 0.2, mat('#a06a35'), 0, 0.12, 0));
    b.add(box(0.26, 0.03, 0.2, mat('#c0392b'), -0.02, 0.32, 0));
    for (const [px, pz] of [[-0.13, -0.08], [0.1, -0.08], [-0.13, 0.08], [0.1, 0.08]]) b.add(cyl(0.012, 0.012, 0.18, 4, mat('#5d3a1a'), px, 0.14, pz));
    return b;
  };
  const boats = [boat(), boat()];
  boats.forEach((b) => g.add(b));
  loopAlongPath(ctx, boats, (s) => {
    const a = s * TAU;
    return { x: IX + Math.cos(a) * 1.65, y: 0.05 + Math.sin(a * 4) * 0.01, z: IZ + Math.sin(a) * 1.55 };
  });

  // --- Aravalli hills (back corner) --------------------------------------------------------
  for (const [x, z, s, h, c] of [[-3.9, -3.9, 1.1, 2.4, '#8a7f55'], [-2.6, -4.3, 0.8, 1.5, '#7d8a52'], [-4.3, -2.6, 0.75, 1.4, '#8a7f55']]) {
    const hill = mesh(new THREE.IcosahedronGeometry(s, 0), mat(c), x, 0, z);
    hill.scale.set(1, h / s / 2, 1);
    hill.position.y = (h / 2) * 0.55;
    g.add(hill);
    ctx.snowable.push(hill.material);
  }
  chhatri(g, -3.85, 2.25, -3.85, 1.0); // hilltop pavilion (Monsoon Palace nod)

  // --- City Palace: L-shaped stack of blocks ----------------------------------------------
  const block = (cx, cz, w, d, h, y0 = 0, rows = 3) => {
    g.add(box(w, h, d, cream, cx, y0, cz));
    g.add(box(w + 0.06, 0.06, d + 0.06, creamD, cx, y0 + h, cz));
    facadeWindows(g, ctx, { cx, cz, y0, w, h, d, rows: Math.max(1, Math.ceil(rows / 2)), cols: Math.max(2, Math.round(w / 0.6)), colsZ: Math.max(2, Math.round(d / 0.6)), ww: 0.12, wh: 0.24, rand: r, litRatio: 0.45 });
  };
  // left wing (along -x edge)
  block(-3.9, -0.9, 1.7, 2.6, 2.6, 0, 4);
  block(-3.9, 1.0, 1.5, 1.3, 1.9, 0, 3);
  block(-2.4, -1.2, 1.0, 1.6, 1.4, 0, 2);
  // back wing (along -z edge)
  block(-1.2, -3.9, 2.2, 1.7, 3.0, 0, 5);
  block(0.75, -3.95, 1.6, 1.5, 2.3, 0, 4);
  block(-1.0, -2.45, 1.4, 0.9, 1.3, 0, 2);
  // corner tower joining the wings
  block(-2.85, -2.85, 1.3, 1.3, 3.5, 0, 6);
  // roofline domes & chhatris
  g.add(cyl(0.3, 0.3, 0.25, 10, white, -2.85, 3.5, -2.85));
  g.add(dome(0.32, white, -2.85, 3.75, -2.85, 10));
  for (const [x, y, z] of [[-3.5, 2.6, -0.2], [-3.5, 2.6, -1.6], [-1.9, 3.0, -3.4], [-0.5, 3.0, -3.4], [0.75, 2.3, -3.4], [-3.4, 1.9, 1.3]]) chhatri(g, x, y, z, 0.9);
  // jharokha balconies on the lake-facing facades
  for (const z of [-1.8, -0.9, 0.0]) {
    g.add(box(0.18, 0.3, 0.4, white, -2.95, 1.3, z));
    g.add(dome(0.13, white, -2.95, 1.6, z, 6));
  }
  for (const x of [-1.8, -0.8, 0.2]) {
    g.add(box(0.4, 0.3, 0.18, white, x, 1.6, -2.95));
    g.add(dome(0.13, white, x, 1.9, -2.95, 6));
  }

  // --- ghats: steps from the palace terrace down into the lake -----------------------------
  for (let i = 0; i < 3; i++) {
    g.add(box(0.22, 0.14 - i * 0.04, 4.4, stone, LX0 - 0.55 + i * 0.22, 0, 1.3));
    g.add(box(4.0, 0.14 - i * 0.04, 0.22, stone, 1.3 + 0.35, 0, LZ0 - 0.55 + i * 0.22));
  }
  g.add(box(0.8, 0.45, 0.8, cream, -2.2, 0, 0.9)); // ghat pavilion
  chhatri(g, -2.2, 0.45, 0.9, 1.0);

  // --- right corner: Jagdish temple + pastel havelis ---------------------------------------
  const tX = 3.6, tZ = -3.7;
  g.add(box(1.6, 0.35, 1.6, stone, tX, 0, tZ));
  g.add(box(1.0, 0.9, 1.0, mat('#e6dccb'), tX, 0.35, tZ));
  for (let i = 0; i < 4; i++) g.add(cyl(0.42 - i * 0.09, 0.5 - i * 0.09, 0.45, 8, mat(i % 2 ? '#d9cdb6' : '#e6dccb'), tX, 1.25 + i * 0.42, tZ));
  g.add(cone(0.12, 0.35, 8, mat('#e6dccb'), tX, 2.93, tZ));
  g.add(cone(0.03, 0.25, 4, mat('#e67e22'), tX, 3.28, tZ));
  const pastel = ['#e9a3a3', '#8fb7da', '#e8cf7a', '#a8d5b5', '#d7b5e0'];
  const haveli = (cx, cz, w, d, h, i) => {
    g.add(box(w, h, d, mat(pastel[i % pastel.length]), cx, 0, cz));
    g.add(box(w + 0.06, 0.06, d + 0.06, mat('#f3efe6'), cx, h, cz));
    facadeWindows(g, ctx, { cx, cz, w, h, d, rows: Math.max(1, Math.round(h / 0.5)), cols: 2, colsZ: 2, rand: r });
    g.add(box(0.14, 0.24, 0.32, white, cx + w / 2 + 0.07, h * 0.55, cz)); // jharokha
    g.add(dome(0.1, white, cx + w / 2 + 0.07, h * 0.55 + 0.24, cz, 6));
  };
  haveli(2.1, -4.15, 1.0, 1.1, 1.6, 0);
  haveli(4.25, -2.2, 1.0, 1.1, 1.3, 1);
  haveli(2.4, -2.55, 0.9, 0.8, 1.0, 2);

  // --- left corner: haveli lane with lanterns ----------------------------------------------
  haveli(-4.2, 2.65, 1.1, 1.1, 1.5, 3);
  haveli(-4.2, 4.1, 1.1, 1.2, 1.15, 4);
  haveli(-2.95, 4.2, 0.9, 1.0, 1.35, 0);
  for (const [x, z, light] of [[-3.3, 3.3, true], [-2.4, 2.5, false], [-1.95, -0.2, true], [0.4, -1.95, false], [3.4, -1.6, true]]) lamp(g, ctx, x, z, { h: 0.7, light, color: '#4a3a2a' });

  // --- trees ------------------------------------------------------------------------------
  for (const [x, z, sc] of [[-2.6, 3.1, 0.9], [-1.95, 1.9, 0.75], [2.9, -1.95, 0.8], [4.4, -4.4, 0.85], [-4.45, 1.75, 0.7], [1.35, -2.6, 0.7]]) {
    tree(g, ctx, x, z, { s: sc, color: r() < 0.5 ? '#5d8f3e' : '#6f9e47', rand: r });
  }
}
