// Delhi: India Gate on its lawn inside a ring road (auto-rickshaws circling), Qutub Minar at the back corner,
// Red Fort walls with chhatris along the back-right edge, Chandni Chowk-style shops on the left and right corners.
import * as THREE from 'three';
import { TAU, rng, mat, mesh, box, cyl, cone, dome, facadeWindows, lamp, tree, autoRickshaw, loopAlongPath } from '../kit.js';

const SAND = '#d9b98a', SAND_D = '#c4a06e', RED = '#b4513a', RED_D = '#94402e', MARBLE = '#eadfcb';

export default function delhi(g, ctx) {
  const r = rng(2024);

  // --- ground: ring road + central lawn ------------------------------------------------------
  const road = mesh(new THREE.RingGeometry(2.45, 3.35, 48), mat('#5b5d63', { roughness: 0.9 }), 0, 0.005, 0);
  road.rotation.x = -Math.PI / 2;
  g.add(road);
  ctx.snowable.push(road.material);
  const lawnMat = mat('#6fae4f');
  const lawn = mesh(new THREE.CylinderGeometry(2.45, 2.45, 0.06, 48), lawnMat, 0, 0.03, 0);
  g.add(lawn);
  ctx.snowable.push(lawnMat);
  // dashed lane marking
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    const d = box(0.2, 0.01, 0.04, mat('#e9e4d4'), Math.cos(a) * 2.9, 0.01, Math.sin(a) * 2.9);
    d.rotation.y = -a + Math.PI / 2;
    g.add(d);
  }
  // paved path to the gate
  g.add(box(0.5, 0.07, 2.4, mat('#cdbf9f'), 0, 0, 1.2));

  // --- India Gate ----------------------------------------------------------------------------
  const gate = new THREE.Group();
  const s = mat(SAND), sd = mat(SAND_D);
  gate.add(box(2.7, 0.18, 1.1, sd, 0, 0.06, 0));                         // plinth
  gate.add(box(0.8, 2.3, 0.9, s, -0.85, 0.24, 0));                       // left pier
  gate.add(box(0.8, 2.3, 0.9, s, 0.85, 0.24, 0));                        // right pier
  gate.add(box(2.5, 0.75, 0.9, s, 0, 2.54, 0));                          // attic
  gate.add(box(2.62, 0.1, 1.0, sd, 0, 2.48, 0));                         // cornice
  gate.add(box(2.62, 0.1, 1.0, sd, 0, 3.28, 0));
  gate.add(box(1.6, 0.35, 0.65, s, 0, 3.38, 0));                         // stepped crown
  gate.add(cyl(0.42, 0.5, 0.18, 12, sd, 0, 3.73, 0));
  gate.add(dome(0.38, s, 0, 3.9, 0, 12));
  // arch top (half-cylinder filling between piers)
  const arch = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.9, 12, 1, false, 0, Math.PI), s, 0, 2.08, 0);
  arch.rotation.z = Math.PI / 2; arch.rotation.y = Math.PI / 2;
  arch.scale.set(1, 1, 1);
  gate.add(arch);
  gate.add(box(0.9, 0.35, 0.9, s, 0, 2.2, 0));
  // amar jawan jyoti glow under the arch
  gate.add(box(0.2, 0.12, 0.2, ctx.shared.bulb, 0, 0.24, 0));
  gate.rotation.y = 0;
  g.add(gate);
  // small lawn lamps
  for (const a of [0.4, 1.2, 2.0, 2.8, 3.6, 4.4, 5.2, 6.0]) lamp(g, ctx, Math.cos(a) * 2.2, Math.sin(a) * 2.2, { h: 0.55, light: a === 0.4 || a === 2.0 });

  // --- Qutub Minar (back corner) -------------------------------------------------------------
  const q = new THREE.Group();
  q.position.set(-3.85, 0, -3.85);
  q.add(box(1.5, 0.25, 1.5, mat('#a99a86'), 0, 0, 0));
  let y = 0.25, rad = 0.6;
  const storeys = [[2.5, RED], [2.0, RED], [1.6, RED_D], [1.0, MARBLE], [0.8, MARBLE]];
  storeys.forEach(([h, c], i) => {
    const top = rad * 0.84;
    q.add(cyl(top, rad, h, 14, mat(c), 0, y, 0));
    y += h;
    // balcony ring
    q.add(cyl(top + 0.13, top + 0.06, 0.1, 14, mat(i < 3 ? '#8a3a29' : '#cdbfa8'), 0, y - 0.02, 0));
    rad = top;
  });
  q.add(cyl(0.14, 0.2, 0.3, 8, mat(MARBLE), 0, y + 0.08, 0));
  q.add(dome(0.16, mat(MARBLE), 0, y + 0.38, 0, 8));
  g.add(q);

  // --- Red Fort wall + chhatris (back-right edge) --------------------------------------------
  const red = mat(RED), redD = mat(RED_D), white = mat('#f1ebe0');
  const fort = new THREE.Group();
  fort.position.set(0.4, 0, -4.25);
  fort.add(box(5.0, 1.5, 1.0, red, 0, 0, 0));
  for (let i = 0; i < 18; i++) fort.add(box(0.14, 0.14, 1.0, redD, -2.4 + i * 0.28, 1.5, 0)); // crenellations
  // central Lahori gate block
  fort.add(box(1.5, 2.1, 1.1, red, 0, 0, 0.05));
  fort.add(box(0.55, 0.9, 0.05, mat('#3a2620'), 0, 0, 0.62));
  const gateArch = mesh(new THREE.CylinderGeometry(0.275, 0.275, 0.05, 10, 1, false, 0, Math.PI), mat('#3a2620'), 0, 0.9, 0.62);
  gateArch.rotation.z = Math.PI / 2; gateArch.rotation.y = Math.PI / 2;
  fort.add(gateArch);
  for (const cx of [-0.5, 0, 0.5]) {
    for (const [px, pz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) fort.add(cyl(0.025, 0.025, 0.3, 4, white, cx + px * 0.6, 2.1, pz * 0.6 + 0.2));
    fort.add(box(0.36, 0.05, 0.36, white, cx, 2.4, 0.2));
    fort.add(dome(0.17, white, cx, 2.45, 0.2, 8));
  }
  // corner towers with domed pavilions
  for (const tx of [-2.5, 2.5]) {
    fort.add(cyl(0.48, 0.55, 2.0, 8, red, tx, 0, 0));
    fort.add(cyl(0.3, 0.3, 0.35, 8, white, tx, 2.0, 0));
    fort.add(dome(0.32, white, tx, 2.35, 0, 8));
    fort.add(cone(0.05, 0.25, 4, mat('#c9a24a'), tx, 2.6, 0));
  }
  facadeWindows(fort, ctx, { cx: -1.6, cz: 0, w: 1.4, h: 1.2, d: 1.0, rows: 1, cols: 3, rand: r, faces: ['z'] });
  facadeWindows(fort, ctx, { cx: 1.6, cz: 0, w: 1.4, h: 1.2, d: 1.0, rows: 1, cols: 3, rand: r, faces: ['z'] });
  g.add(fort);
  ctx.snowable.push(redD);

  // --- shops: Chandni Chowk-ish blocks with awnings & signboards ----------------------------
  const shopColors = ['#e8c9a0', '#d7a77e', '#c9d3d9', '#e3b6a4', '#d9cfa5'];
  const awnings = ['#c0392b', '#2e86c1', '#d68910', '#27ae60', '#8e44ad'];
  const shop = (cx, cz, w, d, h, i) => {
    const body = mat(shopColors[i % shopColors.length]);
    g.add(box(w, h, d, body, cx, 0, cz));
    g.add(box(w + 0.08, 0.08, d + 0.08, mat('#8c7a66'), cx, h, cz));                // roof parapet
    ctx.snowable.push(mat('#8c7a66'));
    // ground-floor shopfront (lit at night) + awning on +x face
    g.add(box(0.04, 0.42, d * 0.7, ctx.shared.window, cx + w / 2 + 0.01, 0.08, cz));
    const aw = box(0.32, 0.04, d * 0.85, mat(awnings[i % awnings.length]), cx + w / 2 + 0.16, 0.6, cz);
    aw.rotation.z = -0.35;
    g.add(aw);
    g.add(box(0.04, 0.16, d * 0.6, ctx.shared.sign, cx + w / 2 + 0.02, 0.72, cz));   // signboard
    // same on +z face
    g.add(box(w * 0.7, 0.42, 0.04, ctx.shared.window, cx, 0.08, cz + d / 2 + 0.01));
    const aw2 = box(w * 0.85, 0.04, 0.32, mat(awnings[(i + 2) % awnings.length]), cx, 0.6, cz + d / 2 + 0.16);
    aw2.rotation.x = 0.35;
    g.add(aw2);
    if (h > 1.2) facadeWindows(g, ctx, { cx, cz, y0: 0.9, w, h: h - 0.95, d, rows: Math.round((h - 0.9) / 0.5), cols: 2, rand: r });
  };
  // left corner cluster
  shop(-4.15, 1.9, 1.3, 1.1, 1.7, 0);
  shop(-4.15, 3.15, 1.3, 1.2, 1.35, 1);
  shop(-4.2, 4.35, 1.2, 1.0, 1.9, 2);
  shop(-2.75, 4.3, 1.3, 1.1, 1.25, 3);
  // right corner cluster
  shop(4.2, -2.4, 1.2, 1.3, 1.6, 4);
  shop(3.0, -2.75 + 0.2, 1.0, 0.9, 1.2, 1);
  shop(4.25, -1.0, 1.1, 1.1, 1.3, 2);

  // --- trees & lamps around the edges ------------------------------------------------------
  for (const [x, z, sc] of [[-4.3, -1.6, 1.1], [-4.1, -0.3, 1.0], [-3.2, -2.6, 0.9], [4.3, 1.0, 1.1], [4.2, 2.4, 1.0],
    [3.0, 4.3, 1.1], [1.6, 4.4, 0.9], [-1.0, 4.4, 1.0], [2.9, -3.6, 0.8], [-4.4, 0.9, 0.8]]) {
    tree(g, ctx, x, z, { s: sc, color: r() < 0.5 ? '#4f8a3c' : '#5f9a45', rand: r });
  }
  for (const [x, z, light] of [[3.6, 3.6, true], [-3.6, 3.6, false], [3.7, -0.2, false], [-3.7, -0.4, true], [0.2, 3.8, false], [-2.0, -3.5, false]]) lamp(g, ctx, x, z, { light });

  // parked cycle rickshaw near the front corner
  const cr = new THREE.Group();
  cr.position.set(2.2, 0, 3.75);
  cr.rotation.y = 0.6;
  cr.add(box(0.5, 0.05, 0.26, mat('#3b5998'), 0, 0.2, 0));
  cr.add(box(0.2, 0.2, 0.26, mat('#2c3e50'), -0.12, 0.25, 0));
  cr.add(box(0.24, 0.03, 0.3, mat('#e74c3c'), -0.12, 0.55, 0));
  for (const [wx, wz] of [[0.22, 0], [-0.15, 0.15], [-0.15, -0.15]]) {
    const w = mesh(new THREE.TorusGeometry(0.1, 0.015, 4, 10), mat('#222'), wx, 0.11, wz);
    g.add(w); w.position.add(cr.position); w.rotation.y = 0.6;
  }
  g.add(cr);

  // --- traffic: 3 autos circling India Gate (each moves 1/3 lap per loop => seamless) ---------
  const autos = [autoRickshaw(), autoRickshaw(), autoRickshaw()];
  autos.forEach((a) => g.add(a));
  loopAlongPath(ctx, autos, (s) => {
    const a = -s * TAU; // counter-clockwise when seen from above
    return { x: Math.cos(a) * 3.08, z: Math.sin(a) * 3.08 };
  });
}
