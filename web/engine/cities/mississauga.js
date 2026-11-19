// Mississauga: the twisting Absolute World towers ("Marilyn Monroe") at the back-left, the Civic Centre with its
// clock tower, council drum and pyramid roofs at the back-right, Celebration Square with its fountain pool
// (rink in winter) in front, MiWay buses and cars looping the square, glass condos and a park.
import * as THREE from 'three';
import { TAU, rng, mat, mesh, box, cyl, cone, dome, facadeWindows, lamp, tree, loopAlongPath, roundedRect, ribbon, bus, car, glowMaterial } from '../kit.js';

const BRICK = '#d8c9b0', ROOF = '#6f9c8a', CONCRETE = '#c7c3bb';

export default function mississauga(g, ctx) {
  const r = rng(1974);

  // --- Absolute World towers: stacked elliptical floor plates, each rotated a little ---------
  const twister = (x, z, floors, twistDeg) => {
    const t = new THREE.Group();
    t.position.set(x, 0, z);
    const slab = mat('#f1f2f3');
    const glass = glowMaterial(ctx, '#7c98a8', '#ffd59a', 0.5, { roughness: 0.2 });
    const fh = 0.16;
    t.add(cyl(0.75, 0.8, 0.35, 16, mat(CONCRETE)));
    for (let k = 0; k < floors; k++) {
      const y = 0.35 + k * fh;
      const plate = mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.035, 18), slab, 0, y + fh - 0.02, 0);
      plate.scale.z = 0.62;
      plate.rotation.y = THREE.MathUtils.degToRad(twistDeg * k);
      t.add(plate);
      const core = mesh(new THREE.CylinderGeometry(0.54, 0.54, fh - 0.03, 14), glass, 0, y + (fh - 0.03) / 2, 0);
      core.scale.z = 0.6;
      core.rotation.y = plate.rotation.y;
      t.add(core);
    }
    g.add(t);
  };
  twister(-3.7, -2.3, 40, 5);   // taller tower
  twister(-2.2, -3.75, 34, 6);

  // --- Civic Centre ----------------------------------------------------------------------------
  const brick = mat(BRICK), roof = mat(ROOF);
  ctx.snowable.push(roof);
  const CX = 1.8, CZ = -3.3;
  g.add(box(3.4, 1.1, 1.6, brick, CX, 0, CZ));                                  // main block
  facadeWindows(g, ctx, { cx: CX, cz: CZ, w: 3.4, h: 1.1, d: 1.6, rows: 2, cols: 8, colsZ: 4, rand: r });
  const pyr = cone(1.0, 0.8, 4, roof, CX - 0.9, 1.1, CZ);                         // pyramid roof
  pyr.rotation.y = Math.PI / 4;
  g.add(pyr);
  g.add(cyl(0.65, 0.7, 1.4, 16, brick, CX + 0.8, 0, CZ + 0.2));                 // council chamber drum
  g.add(cone(0.72, 0.45, 16, roof, CX + 0.8, 1.4, CZ + 0.2));
  // clock tower: open-frame square tower with clock faces
  const TX = CX + 1.9, TZ = CZ - 0.2;
  for (const [dx, dz] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) g.add(box(0.12, 3.6, 0.12, brick, TX + dx, 0, TZ + dz));
  for (let y = 0.9; y < 3.6; y += 0.9) g.add(box(0.64, 0.08, 0.64, brick, TX, y, TZ));
  g.add(box(0.7, 0.5, 0.7, brick, TX, 3.6, TZ));
  for (const [face, ox, oz, rx] of [['x', 0.36, 0, 0], ['z', 0, 0.36, 1]]) {
    const clock = mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.03, 16), glowMaterial(ctx, '#f6f1e2', '#fff1c4', 0.8), TX + ox, 3.85, TZ + oz);
    if (rx) clock.rotation.x = Math.PI / 2; else clock.rotation.z = Math.PI / 2;
    g.add(clock);
    const hand = box(face === 'x' ? 0.02 : 0.03, 0.14, face === 'x' ? 0.03 : 0.02, mat('#222'), TX + ox * 1.05, 3.79, TZ + oz * 1.05);
    g.add(hand);
  }
  const cap = cone(0.5, 0.45, 4, roof, TX, 4.1, TZ);
  cap.rotation.y = Math.PI / 4;
  g.add(cap);

  // --- Celebration Square: fountain pool (rink in winter) -----------------------------------
  const PX = 1.3, PZ = 1.3;
  g.add(box(3.6, 0.04, 3.4, mat('#d3cec4'), PX, 0, PZ));
  ctx.snowable.push(mat('#d3cec4'));
  g.add(box(2.4, 0.08, 1.4, mat(CONCRETE), PX, 0, PZ));
  if (ctx.winter) {
    g.add(box(2.2, 0.04, 1.2, mat('#dceaf2', { roughness: 0.15 }), PX, 0.06, PZ));
    const skaters = [0, 1, 2, 3].map((k) => {
      const s = new THREE.Group();
      s.add(cyl(0.035, 0.045, 0.16, 6, mat(['#c0392b', '#2c3e50', '#16a085', '#8e44ad'][k]), 0, 0.1, 0));
      s.add(mesh(new THREE.SphereGeometry(0.035, 6, 4), mat('#f0c8a0'), 0, 0.29, 0));
      g.add(s);
      return s;
    });
    loopAlongPath(ctx, skaters, (s) => ({ x: PX + Math.cos(s * TAU) * 0.8, y: 0.06, z: PZ + Math.sin(s * TAU) * 0.4 }));
  } else {
    g.add(box(2.2, 0.04, 1.2, mat('#4a95bd', { roughness: 0.1 }), PX, 0.06, PZ));
    // fountain jets pulsing in sequence
    const jetMat = new THREE.MeshStandardMaterial({ color: '#e6f4ff', transparent: true, opacity: 0.7, roughness: 0.1 });
    const jets = [];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) {
      const jet = mesh(new THREE.CylinderGeometry(0.02, 0.035, 1, 6), jetMat, PX - 0.85 + i * 0.34, 0, PZ - 0.25 + j * 0.5);
      jet.castShadow = false;
      g.add(jet);
      jets.push({ jet, ph: i / 6 + j * 0.5 });
    }
    ctx.animate.push((u) => {
      for (const { jet, ph } of jets) {
        const h = 0.12 + 0.35 * (0.5 + 0.5 * Math.sin((u * 2 + ph) * TAU));
        jet.scale.y = h;
        jet.position.y = 0.08 + h / 2;
      }
    });
  }
  // outdoor stage
  g.add(box(1.0, 0.15, 0.6, mat(CONCRETE), PX + 1.25, 0, PZ - 1.35));
  g.add(box(1.0, 0.06, 0.6, mat('#e9e9ea'), PX + 1.25, 0.75, PZ - 1.35));
  for (const dx of [-0.45, 0.45]) g.add(box(0.05, 0.6, 0.05, mat('#444'), PX + 1.25 + dx, 0.15, PZ - 1.1));

  // --- road loop around the square: bus, car, bus, car (each advances 2 slots per loop) -------
  const route = roundedRect(-1.05, -1.0, 4.4, 4.4, 0.8);
  g.add(ribbon(route.points, 0.5, mat('#55585e', { roughness: 0.9 }), 0.012));
  ctx.snowable.push(mat('#55585e', { roughness: 0.9 }));
  const vehicles = [bus(ctx), car('#c0392b'), bus(ctx), car('#ecf0f1')];
  vehicles.forEach((v) => g.add(v));
  loopAlongPath(ctx, vehicles, (s) => route.at(s), 2);

  // --- glass condos (left-front) ------------------------------------------------------------
  const condo = (x, z, w, d, h, color, k) => {
    const glass = glowMaterial(ctx, color, '#ffd59a', k, { roughness: 0.25 });
    g.add(box(w, h, d, glass, x, 0, z));
    for (let y = 0.3; y < h; y += 0.3) g.add(box(w + 0.03, 0.035, d + 0.03, mat('#e3e5e8'), x, y, z));
    g.add(box(w + 0.06, 0.1, d + 0.06, mat('#e3e5e8'), x, h, z));
  };
  condo(-4.1, 1.2, 1.0, 1.0, 3.6, '#6f93a8', 0.45);
  condo(-4.1, 3.4, 1.1, 1.1, 2.6, '#7aa3a3', 0.4);
  condo(-2.6, 4.25, 1.1, 0.9, 1.8, '#8aa2b8', 0.35);

  // --- park with trees + lamps --------------------------------------------------------------
  g.add(box(1.8, 0.05, 1.8, mat('#6fae4f'), -3.95, 0, -0.35));
  ctx.snowable.push(mat('#6fae4f'));
  for (const [x, z, sc] of [[-4.4, -0.9, 0.9], [-3.5, -0.2, 0.8], [-4.3, 0.2, 0.75], [-3.4, -1.1, 0.7], [4.6, 2.0, 0.8], [4.6, 3.4, 0.8],
    [2.6, 4.6, 0.75], [1.0, 4.6, 0.8], [-1.6, 2.0, 0.75], [-1.6, 3.2, 0.7], [-1.5, -1.6, 0.7], [0.0, -1.9, 0.7]]) {
    tree(g, ctx, x, z, { s: sc, color: r() < 0.5 ? '#4f8a3c' : '#5f9a45', rand: r });
  }
  for (const [x, z, light] of [[-0.3, 0.0, true], [2.9, 0.0, false], [-0.3, 2.9, false], [2.9, 2.9, true], [-2.9, -0.4, false]]) lamp(g, ctx, x, z, { light });
}
