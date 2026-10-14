/* =============================================================
   Plan du magasin : dimensions, zones, pistes en laiton, points d’arrêt.
   Données pures (sans three.js) : la 3D et le plan SVG de
   l'interface lisent les mêmes coordonnées.
   Repère : x vers la droite, z vers l'entrée (z = 16 : la vitrine,
   z = -22 : le mur du fond), en mètres.
   ============================================================= */

export const STORE = { xMin: -15, xMax: 15, zFront: 16, zBack: -22, height: 4.2 };

export const ZONE_RECTS = {
  accueil:       { x0: -15, x1: 15, z0: 7, z1: 16 },
  portables:     { x0: -15, x1: -5, z0: -6, z1: 7 },
  gaming:        { x0: -5, x1: 5, z0: -6, z1: 7 },
  mobile:        { x0: 5, x1: 15, z0: -6, z1: 7 },
  composants:    { x0: -15, x1: -5, z0: -16.5, z1: -6 },
  peripheriques: { x0: -5, x1: 5, z0: -16.5, z1: -6 },
  reseau:        { x0: 5, x1: 15, z0: -16.5, z1: -6 },
  caisses:       { x0: -15, x1: 15, z0: -22, z1: -16.5 }
};

/* podiums ronds posés sur une « pastille » de laiton */
export const PADS = [
  { x: 0, z: 11, r: 1.35 },     // podium de l'accueil
  { x: 0, z: -3.4, r: 1.1 }     // piédestal du gaming
];

/* pistes : polylignes [x, z], routées à 45° comme sur une carte électronique */
export const TRACES = [
  [[0, 15.6], [0, 12.35]],
  [[0, 9.65], [0, -2.3]],
  [[0, -4.5], [0, -16.9]],
  [[-0.95, 10.05], [-3.2, 7.8], [-8.6, 7.8], [-10, 6.4], [-10, -15.6]],
  [[0.95, 10.05], [3.2, 7.8], [8.6, 7.8], [10, 6.4], [10, -15.6]],
  [[-10, -6.6], [10, -6.6]],
  [[-10, -15.6], [-9.2, -16.4], [9.2, -16.4], [10, -15.6]]
];

/* vias : un anneau au seuil de chaque zone */
export const VIAS = [
  { zone: 'accueil', x: 0, z: 15.1 },
  { zone: 'portables', x: -10, z: 5.6 },
  { zone: 'gaming', x: 0, z: 5.6 },
  { zone: 'mobile', x: 10, z: 5.6 },
  { zone: 'composants', x: -10, z: -7.4 },
  { zone: 'peripheriques', x: 0, z: -7.4 },
  { zone: 'reseau', x: 10, z: -7.4 },
  { zone: 'caisses', x: 0, z: -16.9 }
];

/* totems directionnels à hauteur des yeux, là où les pistes se séparent */
export const TOTEMS = [
  { x: -5.2, z: 9.6, ry: 0.25 },
  { x: 5.2, z: 9.6, ry: -0.25 }
];

/* où se placer pour « aller au rayon » (un point de l'allée, face au meuble
   principal du rayon), et quoi regarder en arrivant */
export const ZONE_STANDS = {
  accueil:       { pos: [0, 14.2], look: [0, 1.0, 11] },
  portables:     { pos: [-10, 4.4], look: [-12.3, 0.95, 1.4] },
  gaming:        { pos: [0, 0.4], look: [0, 0.8, -3.4] },
  mobile:        { pos: [10, 4.4], look: [7.7, 0.95, 1.4] },
  composants:    { pos: [-10, -7.6], look: [-12.8, 1.05, -10.4] },
  peripheriques: { pos: [0, -7.8], look: [0, 1.0, -12] },
  reseau:        { pos: [10, -7.6], look: [12.9, 1.15, -10.6] },
  caisses:       { pos: [0, -16.8], look: [0, 1.5, -21] }
};

export function zoneAt(x, z) {
  for (const id in ZONE_RECTS) {
    const r = ZONE_RECTS[id];
    if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return id;
  }
  return null;
}

/* conversion vers le plan SVG : l'entrée en bas, le fond en haut, 10 px par mètre */
export const PLAN_SCALE = 10;
export const PLAN_W = (STORE.xMax - STORE.xMin) * PLAN_SCALE;
export const PLAN_H = (STORE.zFront - STORE.zBack) * PLAN_SCALE;
export function toPlan(x, z) {
  return [(x - STORE.xMin) * PLAN_SCALE, (z - STORE.zBack) * PLAN_SCALE];
}
