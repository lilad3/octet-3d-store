/* =============================================================
   Architecture : sol, murs, plafond, vitrine d'entrée et portes,
   pistes en laiton, signalétique, lumière.
   ============================================================= */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { STORE, TRACES, PADS, VIAS, ZONE_RECTS, TOTEMS } from './plan.js';
import { add, box, plane, cyl, rbox } from './kit.js';

const rboxFlat = (w, d) => rbox(w, 0.012, d, 0.005);
import { canvas, toTexture, setFont, FONT, INK, drawByte, signTexture, floorCodeTexture, pavingTexture } from './textures.js';
import { zones, store } from '../../data/catalog.js';

const W = STORE.xMax - STORE.xMin;
const D = STORE.zFront - STORE.zBack;
const MID_Z = (STORE.zFront + STORE.zBack) / 2;
const H = STORE.height;

export function buildLights(scene, renderer, tier) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0xFFF6EA, 0xD6C9B4, 1.25));

  const sun = new THREE.DirectionalLight(0xFFF2DF, 1.35);
  sun.position.set(7, 20, 9);
  sun.target.position.set(0, 0, -3);
  scene.add(sun, sun.target);
  if (tier.shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(tier.shadowSize, tier.shadowSize);
    const cam = sun.shadow.camera;
    cam.left = -24; cam.right = 24; cam.top = 26; cam.bottom = -26; cam.near = 2; cam.far = 60;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 3;
    if ('intensity' in sun.shadow) sun.shadow.intensity = 0.7;
  }
  return { sun };
}

/* ------------------------------------------------ coque du bâtiment */
export function buildShell(M, statics, dynamic) {
  const floor = new THREE.Mesh(plane(W, D), M.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, MID_Z);
  floor.receiveShadow = true;
  floor.name = 'floor';
  dynamic.add(floor);

  // revêtements propres à certains rayons
  const overlay = (mat, r, inset) => {
    const m = new THREE.Mesh(plane(r.x1 - r.x0 - inset * 2, r.z1 - r.z0 - inset * 2), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set((r.x0 + r.x1) / 2, 0.004, (r.z0 + r.z1) / 2);
    m.receiveShadow = true;
    dynamic.add(m);
  };
  overlay(M.carpet, { x0: -4.6, x1: 4.6, z0: -5.6, z1: 5.2 }, 0);
  // liseré de laiton autour de la moquette du gaming
  for (const [x, z, w, d] of [[0, 5.2, 9.2, 0.04], [0, -5.6, 9.2, 0.04], [-4.6, -0.2, 0.04, 10.84], [4.6, -0.2, 0.04, 10.84]]) {
    add(statics, box(w, 0.006, d), M.brass, x, 0.003, z).userData.noShadow = true;
  }
  overlay(M.labFloor, ZONE_RECTS.composants, 0.45);

  // murs (ils reçoivent les ombres mais n'en portent pas : la lumière du jour vient d'en haut)
  for (const m of [
    add(statics, plane(D, H), M.plaster, STORE.xMin, H / 2, MID_Z, 0, Math.PI / 2, 0),
    add(statics, plane(D, H), M.plaster, STORE.xMax, H / 2, MID_Z, 0, -Math.PI / 2, 0),
    add(statics, plane(W, H), M.plaster, 0, H / 2, STORE.zBack)
  ]) m.userData.noShadow = true;
  // plinthes graphite
  add(statics, box(0.02, 0.1, D), M.graphite, STORE.xMin + 0.01, 0.05, MID_Z);
  add(statics, box(0.02, 0.1, D), M.graphite, STORE.xMax - 0.01, 0.05, MID_Z);
  add(statics, box(W, 0.1, 0.02), M.graphite, 0, 0.05, STORE.zBack + 0.01);

  // plafond
  add(statics, plane(W, D), M.ceiling, 0, H, MID_Z, Math.PI / 2, 0, 0).userData.noShadow = true;

  buildCeilingLights(M, dynamic);
  buildLightwall(M, statics);
}

function buildCeilingLights(M, dynamic) {
  // réglettes linéaires au-dessus des trois allées
  const positions = [];
  for (const x of [-10, 0, 10]) {
    for (let z = 14; z > STORE.zBack + 1.5; z -= 4) {
      if (x === 0 && z < 13 && z > 9) continue; // l'anneau du podium prend la place
      positions.push([x, z]);
    }
  }
  const geo = box(0.12, 0.04, 3.2);
  const lamps = new THREE.InstancedMesh(geo, M.lamp, positions.length);
  const m4 = new THREE.Matrix4();
  positions.forEach(([x, z], i) => { m4.makeTranslation(x, H - 0.03, z - 1.6); lamps.setMatrixAt(i, m4); });
  lamps.userData.noShadow = true;
  dynamic.add(lamps);

  // un anneau lumineux au plafond, en écho à la pastille du podium
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.035, 8, 96), M.lamp);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(PADS[0].x, H - 0.05, PADS[0].z);
  dynamic.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.03, 8, 80), M.lamp);
  ring2.rotation.x = Math.PI / 2;
  ring2.position.set(PADS[1].x, H - 0.05, PADS[1].z);
  dynamic.add(ring2);
}

/* le mur lumineux des caisses : le point le plus clair du magasin, il tire le regard vers le fond */
function buildLightwall(M, statics) {
  // panneaux de tissu rétroéclairé, joints aluminium tous les 2 m
  const { c: lc, ctx: lx } = canvas(1024, 200);
  const g = lx.createLinearGradient(0, 0, 0, 200);
  g.addColorStop(0, '#FFF6E8'); g.addColorStop(0.5, '#FFFBF4'); g.addColorStop(1, '#FFF3E0');
  lx.fillStyle = g;
  lx.fillRect(0, 0, 1024, 200);
  lx.fillStyle = 'rgba(150,140,128,0.55)';
  for (let x = 0; x <= 1024; x += 128) lx.fillRect(x - 2, 0, 4, 200);
  M.lightwall.map = toTexture(lc);
  M.lightwall.toneMapped = false;
  M.lightwall.color.set(0xFFFFFF);
  const wall = new THREE.Mesh(plane(16, 3.1), M.lightwall);
  wall.position.set(0, 1.95, STORE.zBack + 0.03);
  wall.userData.noShadow = true;
  statics.add(wall);
  add(statics, box(16.2, 0.06, 0.08), M.alu, 0, 0.37, STORE.zBack + 0.05);
  add(statics, box(16.2, 0.06, 0.08), M.alu, 0, 3.53, STORE.zBack + 0.05);

  // lettrage posé sur le mur lumineux
  const { c, ctx } = canvas(2048, 256);
  ctx.clearRect(0, 0, 2048, 256);
  setFont(ctx, FONT.sign, 150, 700, 26);
  ctx.fillStyle = INK.graphite;
  ctx.textAlign = 'center';
  ctx.fillText('CAISSES', 1024, 175);
  const letters = new THREE.Mesh(plane(7, 0.875), new THREE.MeshBasicMaterial({ map: toTexture(c), transparent: true }));
  letters.position.set(0, 2.55, STORE.zBack + 0.06);
  letters.userData.noMerge = true;
  statics.add(letters);
}

/* ------------------------------------------------ vitrine d'entrée, portes, extérieur */
export function buildFacade(M, statics, dynamic) {
  const z = STORE.zFront;
  const doorHalf = 1.6;
  const glassH = 3.2;

  // vitrage fixe de part et d'autre des portes
  for (const side of [-1, 1]) {
    const x0 = side * doorHalf, x1 = side * STORE.xMax;
    const glass = new THREE.Mesh(plane(Math.abs(x1 - x0), glassH), M.glass);
    glass.position.set((x0 + x1) / 2, glassH / 2, z);
    dynamic.add(glass);
    for (let x = doorHalf; x <= STORE.xMax + 0.01; x += 2.4) {
      add(statics, box(0.06, glassH, 0.1), M.alu, side * Math.min(x, STORE.xMax - 0.03), glassH / 2, z);
    }
  }
  add(statics, box(W, 0.08, 0.12), M.alu, 0, glassH, z);
  add(statics, box(W, 0.05, 0.12), M.alu, 0, 0.025, z);
  // imposte au-dessus des portes
  const transom = new THREE.Mesh(plane(doorHalf * 2, glassH - 2.62), M.glass);
  transom.position.set(0, 2.62 + (glassH - 2.62) / 2, z);
  dynamic.add(transom);
  add(statics, box(doorHalf * 2, 0.06, 0.12), M.alu, 0, 2.6, z);

  // bandeau au-dessus de la vitrine : enseigne côté rue, plâtre côté salle
  add(statics, box(W + 0.4, H - glassH + 0.4, 0.3), M.graphite, 0, glassH + (H - glassH + 0.4) / 2, z + 0.18).userData.noShadow = true;
  const sign = new THREE.Mesh(plane(9, 1.05), new THREE.MeshBasicMaterial({ map: facadeSignTexture(), toneMapped: false }));
  sign.position.set(0, glassH + 0.66, z + 0.34);
  sign.userData.noMerge = true;
  statics.add(sign);

  // portes coulissantes automatiques
  const doors = [];
  for (const side of [-1, 1]) {
    const g = new THREE.Group();
    const pane = new THREE.Mesh(plane(1.58, 2.56), M.glass);
    pane.position.y = 1.29;
    g.add(pane);
    add(g, box(0.05, 2.58, 0.05), M.alu, side * 0.77, 1.29, 0);
    add(g, box(0.05, 2.58, 0.05), M.alu, -side * 0.77, 1.29, 0);
    add(g, box(1.58, 0.05, 0.05), M.alu, 0, 2.56, 0);
    add(g, box(1.58, 0.05, 0.05), M.alu, 0, 0.03, 0);
    add(g, box(0.02, 0.9, 0.04), M.alu, -side * 0.66, 1.1, 0.03);
    g.position.set(side * 0.8, 0, z + 0.06);
    g.userData.closedX = side * 0.8;
    g.userData.openX = side * 2.35;
    dynamic.add(g);
    doors.push(g);
  }

  // la rue : trottoir et façade voisine, simplement
  const street = new THREE.Mesh(plane(120, 50), new THREE.MeshStandardMaterial({ map: pavingTexture(), roughness: 0.9 }));
  street.rotation.x = -Math.PI / 2;
  street.position.set(0, -0.005, z + 25);
  street.receiveShadow = true;
  dynamic.add(street);
  for (const side of [-1, 1]) {
    add(statics, box(26, 5.4, 0.4), M.plaster, side * (STORE.xMax + 13.2), 2.7, z + 0.1).userData.noShadow = true;
  }
  // seuil en laiton sous les portes, tapis d'entrée, et la piste qui commence déjà sur le trottoir
  add(statics, box(doorHalf * 2, 0.006, 0.4), M.brass, 0, 0.003, z);
  add(statics, rboxFlat(3.2, 1.3), M.graphite, 0, 0.006, z + 1.05).userData.noShadow = true;
  add(statics, box(0.05, 0.004, 1.2), M.brass, 0, 0.013, z + 1.05).userData.noShadow = true;
  const via = add(statics, new THREE.RingGeometry(0.13, 0.23, 48), M.brass, 0, 0.012, z + 1.9, -Math.PI / 2);
  via.userData.noShadow = true;
  return doors;
}

function facadeSignTexture() {
  const { c, ctx } = canvas(2048, 240);
  ctx.fillStyle = INK.graphite;
  ctx.fillRect(0, 0, 2048, 240);
  setFont(ctx, FONT.sign, 150, 700, 30);
  ctx.fillStyle = INK.white;
  ctx.textAlign = 'center';
  ctx.fillText(store.name, 1024, 170);
  const w = ctx.measureText(store.name).width;
  drawByte(ctx, 1024 - w / 2 - 330, 104, 26, 10, [0, 2, 3, 5, 7], INK.brass, 'rgba(203,163,90,0.28)');
  setFont(ctx, FONT.sign, 40, 600, 10);
  ctx.textAlign = 'left';
  ctx.fillStyle = INK.mute;
  ctx.fillText(store.tagline.toUpperCase(), 1024 + w / 2 + 70, 146);
  return toTexture(c, { aniso: 8 });
}

/* ------------------------------------------------ pistes en laiton, pastilles, vias */
export function buildTraces(M, statics, dynamic) {
  const segs = [];
  for (const line of TRACES) {
    for (let i = 0; i < line.length - 1; i++) segs.push([line[i], line[i + 1]]);
  }
  for (const [[x0, z0], [x1, z1]] of segs) {
    const dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const m = add(statics, box(0.05, 0.004, len + 0.05), M.brass, (x0 + x1) / 2, 0.002, (z0 + z1) / 2);
    m.rotation.y = Math.atan2(dx, dz);
    m.userData.noShadow = true;
  }
  for (const p of PADS) {
    const ring = add(statics, new THREE.RingGeometry(p.r - 0.035, p.r + 0.035, 128), M.brass, p.x, 0.003, p.z, -Math.PI / 2);
    ring.userData.noShadow = true;
  }
  const zoneCode = Object.fromEntries(zones.map((zn) => [zn.id, zn.code]));
  for (const v of VIAS) {
    const ring = add(statics, new THREE.RingGeometry(0.13, 0.23, 48), M.brass, v.x, 0.003, v.z, -Math.PI / 2);
    ring.userData.noShadow = true;
    const dot = add(statics, new THREE.CircleGeometry(0.055, 24), M.brass, v.x, 0.003, v.z, -Math.PI / 2);
    dot.userData.noShadow = true;
    const code = new THREE.Mesh(plane(0.5, 0.25), new THREE.MeshBasicMaterial({ map: floorCodeTexture(zoneCode[v.zone]), transparent: true, depthWrite: false }));
    code.rotation.x = -Math.PI / 2;
    code.position.set(v.x + 0.52, 0.004, v.z);
    dynamic.add(code);
  }
}

/* ------------------------------------------------ signalétique suspendue */
function hangingSign(M, parent, { x, y = 3.45, z, width = 3.2, height = 0.6, front, back, cables = true }) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  add(g, box(width, height, 0.05), M.graphite, 0, 0, 0);
  const mk = (tex, ry, dz) => {
    const p = new THREE.Mesh(plane(width - 0.02, height - 0.02), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    p.rotation.y = ry;
    p.position.z = dz;
    p.userData.noMerge = true;
    g.add(p);
  };
  mk(front, 0, 0.027);
  if (back) mk(back, Math.PI, -0.027);
  if (cables) {
    for (const cx of [-width / 2 + 0.2, width / 2 - 0.2]) {
      add(g, cyl(0.004, 0.004, H - y - height / 2, 6), M.aluDark, cx, height / 2 + (H - y - height / 2) / 2, 0);
    }
  }
  parent.add(g);
  return g;
}

export function buildSigns(M, statics) {
  const byId = Object.fromEntries(zones.map((z) => [z.id, z]));
  const zoneSign = (id, x, z, w = 3.2) => {
    const zn = byId[id];
    const tex = signTexture({ code: zn.code, name: zn.name });
    hangingSign(M, statics, { x, z, width: w, front: tex, back: tex });
  };
  // un seul signe par rayon dans chaque champ de vision : les rayons du centre ont un panneau
  // suspendu, ceux des côtés ont leur nom sur le mur (et les totems de l'entrée)
  zoneSign('gaming', 0, 6.0, 2.8);
  zoneSign('peripheriques', 0, -6.8, 3.4);
  // les caisses sont signalées par le lettrage du mur lumineux : pas de panneau en double

  // totems directionnels à hauteur des yeux, là où les pistes se séparent
  const [tl, tr] = TOTEMS;
  totem(M, statics, tl.x, tl.z, tl.ry, signTexture({ code: '01', name: 'PC portables', sub: '04 composants', arrowDir: 'left', w: 1280, h: 260 }));
  totem(M, statics, tr.x, tr.z, tr.ry, signTexture({ code: '03', name: 'Mobile & image', sub: '06 réseau', arrowDir: 'right', w: 1280, h: 260 }));
}

function totem(M, parent, x, z, ry, tex) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  add(g, rbox(0.5, 0.03, 0.3, 0.01), M.graphite, 0, 0.015, 0);
  add(g, box(0.05, 1.62, 0.05), M.alu, 0, 0.84, 0);
  add(g, box(1.64, 0.36, 0.05), M.graphite, 0, 1.78, 0);
  const face = new THREE.Mesh(plane(1.6, 0.325), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  face.position.set(0, 1.78, 0.027);
  face.userData.noMerge = true;
  g.add(face);
  parent.add(g);
}

/* le nom de chaque rayon en grandes lettres sur son mur */
export function buildWallLettering(statics) {
  const walls = [
    { code: '01', name: 'PC PORTABLES', x: STORE.xMin + 0.02, z: 0.6, ry: Math.PI / 2 },
    { code: '04', name: 'COMPOSANTS', x: STORE.xMin + 0.02, z: -11.3, ry: Math.PI / 2 },
    { code: '03', name: 'MOBILE & IMAGE', x: STORE.xMax - 0.02, z: -1.6, ry: -Math.PI / 2 },
    { code: '06', name: 'RÉSEAU', x: STORE.xMax - 0.02, z: -8.2, ry: -Math.PI / 2 }
  ];
  for (const w of walls) {
    const { c, ctx } = canvas(2048, 256);
    ctx.clearRect(0, 0, 2048, 256);
    setFont(ctx, FONT.mono, 96, 500, 6);
    ctx.fillStyle = '#A8843F';
    ctx.fillText(w.code, 40, 170);
    const cw = ctx.measureText(w.code).width;
    setFont(ctx, FONT.sign, 170, 700, 18);
    ctx.fillStyle = INK.graphite;
    ctx.fillText(w.name, 40 + cw + 60, 185);
    const m = new THREE.Mesh(plane(4.2, 0.525), new THREE.MeshStandardMaterial({ map: toTexture(c, { aniso: 8 }), transparent: true, roughness: 0.8 }));
    m.position.set(w.x, 3.0, w.z);
    m.rotation.y = w.ry;
    m.userData.noMerge = true;
    statics.add(m);
  }
}

/* ------------------------------------------------ mur de marque de l'accueil */
export function buildBrandWall(M, statics) {
  const { c, ctx } = canvas(2048, 1024);
  ctx.fillStyle = '#EFECE6';
  ctx.fillRect(0, 0, 2048, 1024);
  setFont(ctx, FONT.sign, 380, 700, 40);
  ctx.fillStyle = INK.graphite;
  ctx.fillText(store.name, 150, 560);
  drawByte(ctx, 160, 640, 88, 26, [0, 2, 3, 5, 7], INK.brass, 'rgba(34,35,38,0.12)');
  setFont(ctx, FONT.sign, 64, 600, 12);
  ctx.fillStyle = INK.graphite;
  ctx.fillText(store.tagline.toUpperCase(), 160, 860);
  setFont(ctx, FONT.mono, 34, 400, 2);
  ctx.fillStyle = '#8A857C';
  ctx.fillText('8 zones · 1 octet · 0b10101101', 160, 930);
  const wall = new THREE.Mesh(plane(6.4, 3.2), new THREE.MeshStandardMaterial({ map: toTexture(c, { aniso: 8 }), roughness: 0.9 }));
  wall.position.set(STORE.xMin + 0.02, 2.0, 11.4);
  wall.rotation.y = Math.PI / 2;
  wall.userData.noMerge = true;
  statics.add(wall);
}
