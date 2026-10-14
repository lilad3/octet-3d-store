/* =============================================================
   Petits outils de construction partagés par l'architecture,
   le mobilier et les produits.
   ============================================================= */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const rboxCache = new Map();

/* boîte aux arêtes arrondies : les reflets accrochent les bords, comme sur un vrai objet */
export function rbox(w, h, d, r = 0.004, seg = 2) {
  r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  const key = [w, h, d, r, seg].map((v) => v.toFixed(4)).join('|');
  if (!rboxCache.has(key)) rboxCache.set(key, new RoundedBoxGeometry(w, h, d, seg, r));
  return rboxCache.get(key);
}

export function box(w, h, d) { return new THREE.BoxGeometry(w, h, d); }
export function cyl(rt, rb, h, seg = 24) { return new THREE.CylinderGeometry(rt, rb, h, seg); }
export function plane(w, h) { return new THREE.PlaneGeometry(w, h); }

/* ajoute un maillage à un parent ; renvoie le maillage */
export function add(parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (rx || ry || rz) m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

/* ombre de contact : une tache douce sous l'objet, presque gratuite à dessiner */
export function blob(parent, M, w, d, x = 0, z = 0, y = 0.003, opacity = 0.8) {
  const m = new THREE.Mesh(plane(w, d), opacity === 0.8 ? M.blob : Object.assign(M.blob.clone(), { opacity }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.renderOrder = 1;
  m.userData.noMerge = true;
  m.userData.noShadow = true;
  parent.add(m);
  return m;
}

/* place un groupe dans la salle : position au sol et orientation (ry) */
export function place(obj, x, y, z, ry = 0) {
  obj.position.set(x, y, z);
  obj.rotation.y = ry;
  return obj;
}

/* -------------------------------------------------------------
   Fusion par matériau : tout le mobilier fixe devient une poignée
   de maillages, donc une poignée d'appels de dessin.
   Les maillages marqués userData.noMerge restent à part
   (écrans animés, verre, éléments mobiles).
   ------------------------------------------------------------- */
export function mergeStatic(root, { castShadow = true, receiveShadow = true } = {}) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  const keep = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.isInstancedMesh || o.userData.noMerge || (o.material && o.material.transparent)) { keep.push(o); return; }
    const key = o.material.uuid + (o.userData.noShadow ? ':ombre' : '');
    if (!buckets.has(key)) buckets.set(key, { material: o.material, geos: [], shadow: !o.userData.noShadow });
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    }
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(o.matrixWorld);
    buckets.get(key).geos.push(g);
  });

  const out = new THREE.Group();
  out.name = root.name + ':merged';
  for (const { material, geos, shadow } of buckets.values()) {
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) continue;
    const m = new THREE.Mesh(merged, material);
    m.castShadow = castShadow && shadow;
    m.receiveShadow = receiveShadow;
    m.matrixAutoUpdate = false;
    out.add(m);
  }
  // les éléments gardés à part conservent leur place dans le monde
  for (const o of keep) {
    o.updateMatrixWorld(true);
    const clone = o;
    const world = o.matrixWorld.clone();
    o.parent.remove(o);
    world.decompose(clone.position, clone.quaternion, clone.scale);
    out.add(clone);
  }
  return out;
}
