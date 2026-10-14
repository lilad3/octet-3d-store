/* =============================================================
   Se déplacer dans le magasin : marche libre (clavier, manette,
   glisser pour regarder), trajets automatiques qui contournent
   les meubles, retour au point précédent.
   ============================================================= */
import * as THREE from 'three';
import { ZONE_STANDS, STORE } from './plan.js';

export const EYE = 1.6;
const PLAYER = 0.28;
const BOUNDS = { x0: STORE.xMin + 0.55, x1: STORE.xMax - 0.55, z0: STORE.zBack + 0.6, z1: STORE.zFront - 0.75 };
const WALK_SPEED = 2.8;
// trajets automatiques : une grille de circulation dont les cases gardent leurs distances avec les meubles
const CELL = 0.2;
const AISLE_PAD = 0.4;
const SIGHT_PAD = 0.3;
// un point d'arrivée doit être assez libre pour que la collision ne le déplace pas
const STAND_PAD = PLAYER * 0.5 + 0.02;
const STEPS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];

export function createNav({ camera, dom, obstacles, reducedMotion, onClick, onHover, onManual, canMove }) {
  let yaw = 0, pitch = -0.04;
  const keys = { forward: false, back: false, left: false, right: false };
  const stick = { x: 0, y: 0 };
  const velocity = new THREE.Vector3();
  let travel = null;
  const history = [];
  // hauteur des yeux voulue : celle du produit examiné, jusqu'à ce qu'on se remette à marcher
  let eyeTarget = EYE;

  // les meubles rangés par carrés de 2 m : chaque test ne regarde que ses voisins
  const HASH = 2, MAX_PAD = 0.5;
  const HW = Math.ceil((STORE.xMax - STORE.xMin + 2) / HASH), HH = Math.ceil((STORE.zFront - STORE.zBack + 2) / HASH);
  const bucketI = (x) => Math.max(0, Math.min(HW - 1, Math.floor((x - STORE.xMin + 1) / HASH)));
  const bucketJ = (z) => Math.max(0, Math.min(HH - 1, Math.floor((z - STORE.zBack + 1) / HASH)));
  const buckets = Array.from({ length: HW * HH }, () => []);
  for (const o of obstacles) {
    const ex = (o.type === 'circle' ? o.r : o.hx) + MAX_PAD, ez = (o.type === 'circle' ? o.r : o.hz) + MAX_PAD;
    for (let j = bucketJ(o.z - ez); j <= bucketJ(o.z + ez); j++) {
      for (let i = bucketI(o.x - ex); i <= bucketI(o.x + ex); i++) buckets[j * HW + i].push(o);
    }
  }

  function blocked(x, z, pad) {
    for (const o of buckets[bucketJ(z) * HW + bucketI(x)]) {
      if (o.type === 'circle') { if (Math.hypot(x - o.x, z - o.z) < o.r + pad) return true; }
      else if (Math.abs(x - o.x) < o.hx + pad && Math.abs(z - o.z) < o.hz + pad) return true;
    }
    return false;
  }

  function standable(x, z, pad = STAND_PAD) {
    return x >= BOUNDS.x0 && x <= BOUNDS.x1 && z >= BOUNDS.z0 && z <= BOUNDS.z1 && !blocked(x, z, pad);
  }

  /* la ligne droite de A à B passe-t-elle à plus de `pad` des meubles ?
     près des extrémités on tolère d'être plus près : on y est déjà, ou on y va exprès */
  function clear(ax, az, bx, bz, pad = SIGHT_PAD) {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(2, Math.ceil(len / 0.15));
    for (let i = 1; i < n; i++) {
      const t = i / n, edge = Math.min(t, 1 - t) * len;
      if (blocked(ax + (bx - ax) * t, az + (bz - az) * t, Math.min(pad, 0.12 + edge * 0.5))) return false;
    }
    return true;
  }

  /* un point d'arrivée tombé dans un meuble glisse jusqu'à l'endroit libre le plus proche */
  function settle(x, z) {
    if (standable(x, z)) return [x, z];
    for (let r = 0.05; r <= 2; r += 0.05) {
      const n = Math.ceil((Math.PI * 2 * r) / 0.05);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2, tx = x + Math.cos(a) * r, tz = z + Math.sin(a) * r;
        if (standable(tx, tz)) return [tx, tz];
      }
    }
    return [x, z];
  }

  /* ------------------------------------------------ grille de circulation */
  const GW = Math.floor((BOUNDS.x1 - BOUNDS.x0) / CELL) + 1;
  const GH = Math.floor((BOUNDS.z1 - BOUNDS.z0) / CELL) + 1;
  const cellX = (i) => BOUNDS.x0 + i * CELL;
  const cellZ = (j) => BOUNDS.z0 + j * CELL;
  const open = new Uint8Array(GW * GH);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) open[j * GW + i] = blocked(cellX(i), cellZ(j), AISLE_PAD) ? 0 : 1;

  /* la case libre la plus proche de (x, z) qu'on rejoint en ligne droite */
  function nearestCell(x, z) {
    const ci = Math.round((x - BOUNDS.x0) / CELL), cj = Math.round((z - BOUNDS.z0) / CELL);
    for (let r = 0; r <= 20; r++) {
      let best = -1, bestD = Infinity;
      for (let j = cj - r; j <= cj + r; j++) {
        for (let i = ci - r; i <= ci + r; i++) {
          if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r) continue;
          if (i < 0 || j < 0 || i >= GW || j >= GH || !open[j * GW + i]) continue;
          const d = Math.hypot(cellX(i) - x, cellZ(j) - z);
          if (d < bestD && clear(x, z, cellX(i), cellZ(j), 0.12)) { bestD = d; best = j * GW + i; }
        }
      }
      if (best >= 0) return best;
    }
    return -1;
  }

  /* plus court chemin de case en case (A*, huit directions, sans couper les coins) */
  function search(s, g) {
    const cost = new Float32Array(GW * GH).fill(Infinity);
    const from = new Int32Array(GW * GH).fill(-1);
    const gi = g % GW, gj = (g / GW) | 0;
    const guess = (k) => {
      const dx = Math.abs((k % GW) - gi), dz = Math.abs(((k / GW) | 0) - gj);
      return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
    };
    const heap = [];
    const push = (f, k) => {
      heap.push([f, k]);
      for (let i = heap.length - 1; i > 0;) {
        const p = (i - 1) >> 1;
        if (heap[p][0] <= heap[i][0]) break;
        [heap[p], heap[i]] = [heap[i], heap[p]];
        i = p;
      }
    };
    const pop = () => {
      const top = heap[0], last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        for (let i = 0; ;) {
          const l = 2 * i + 1, r = l + 1;
          let m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]];
          i = m;
        }
      }
      return top;
    };
    cost[s] = 0;
    push(guess(s), s);
    while (heap.length) {
      const [f, k] = pop();
      if (k === g) break;
      if (f > cost[k] + guess(k) + 1e-4) continue;
      const i = k % GW, j = (k / GW) | 0;
      for (const [di, dj, w] of STEPS) {
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= GW || nj >= GH) continue;
        const nk = nj * GW + ni;
        if (!open[nk] || (di && dj && (!open[j * GW + ni] || !open[nj * GW + i]))) continue;
        const c = cost[k] + w;
        if (c < cost[nk]) { cost[nk] = c; from[nk] = k; push(c + guess(nk), nk); }
      }
    }
    if (s !== g && from[g] < 0) return null;
    const cells = [];
    for (let k = g; k >= 0; k = from[k]) { cells.push(k); if (k === s) break; }
    return cells.reverse();
  }

  /* chemin de la position actuelle jusqu'à (x, z), en coupant au plus court ; null si on ne peut pas y aller */
  function route(x, z) {
    const p = camera.position;
    if (clear(p.x, p.z, x, z)) return [[x, z]];
    const s = nearestCell(p.x, p.z), g = nearestCell(x, z);
    const cells = s >= 0 && g >= 0 ? search(s, g) : null;
    if (!cells) return null;
    // on ne garde que les cases où le chemin tourne, puis on file vers le point le plus lointain encore visible
    const pts = [[p.x, p.z]];
    for (let n = 0; n < cells.length; n++) {
      const k = cells[n], prev = cells[n - 1], next = cells[n + 1];
      if (prev !== undefined && next !== undefined && k - prev === next - k) continue;
      pts.push([cellX(k % GW), cellZ((k / GW) | 0)]);
    }
    pts.push([x, z]);
    const out = [];
    for (let i = 0; i < pts.length - 1;) {
      let j = pts.length - 1;
      while (j > i + 1 && !clear(pts[i][0], pts[i][1], pts[j][0], pts[j][1])) j--;
      out.push(pts[j]);
      i = j;
    }
    return out;
  }

  /* ------------------------------------------------ trajets automatiques */
  function startTravel(points, { look = null, eye = EYE, speed = 3.0, onArrive, remember = true, locked = false } = {}) {
    if (remember && !locked) history.push({ x: camera.position.x, z: camera.position.z, yaw, pitch });
    if (history.length > 20) history.shift();
    const pts = points.map(([x, z]) => new THREE.Vector3(x, EYE, z));
    if (pts.length) pts[pts.length - 1].y = eye;
    travel = { pts, i: 0, look, speed, v: 0, onArrive, settle: 0, locked, startY: camera.position.y };
    eyeTarget = eye;
    velocity.set(0, 0, 0);
    if (reducedMotion) finishTravel(true);
  }

  function finishTravel(jump) {
    const t = travel;
    if (!t) return;
    if (jump && t.pts.length) camera.position.copy(t.pts[t.pts.length - 1]);
    if (jump && t.look) {
      const d = new THREE.Vector3().subVectors(t.look, camera.position);
      yaw = Math.atan2(-d.x, -d.z);
      pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
    }
    travel = null;
    t.onArrive && t.onArrive();
  }

  function remainingLength(t) {
    let len = camera.position.distanceTo(t.pts[t.i]);
    for (let k = t.i; k < t.pts.length - 1; k++) len += t.pts[k].distanceTo(t.pts[k + 1]);
    return len;
  }

  function stepTravel(dt) {
    const t = travel;
    if (t.i < t.pts.length) {
      const remaining = remainingLength(t);
      t.v = Math.min(t.speed, t.v + 3.2 * dt, Math.sqrt(2 * 2.6 * remaining) + 0.05);
      let step = t.v * dt;
      while (step > 0 && t.i < t.pts.length) {
        const target = t.pts[t.i];
        const to = new THREE.Vector3().subVectors(target, camera.position);
        const d = to.length();
        if (d <= step) { camera.position.copy(target); step -= d; t.i++; }
        else { camera.position.addScaledVector(to.normalize(), step); step = 0; }
      }
      // regard : dans le sens de la marche, puis vers le produit en fin de trajet
      const target = t.pts[Math.min(t.i, t.pts.length - 1)];
      let wantYaw = yaw, wantPitch = -0.04;
      const dir = new THREE.Vector3().subVectors(target, camera.position);
      if (Math.hypot(dir.x, dir.z) > 0.3) wantYaw = Math.atan2(-dir.x, -dir.z);
      if (t.look && remaining < 2.2) {
        const d = new THREE.Vector3().subVectors(t.look, camera.position);
        wantYaw = Math.atan2(-d.x, -d.z);
        wantPitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
      }
      yaw += angleDelta(yaw, wantYaw) * Math.min(1, dt * 3.2);
      pitch += (wantPitch - pitch) * Math.min(1, dt * 3.2);
    } else {
      // arrivé : finir de tourner la tête
      t.settle += dt;
      if (t.look) {
        const d = new THREE.Vector3().subVectors(t.look, camera.position);
        const wy = Math.atan2(-d.x, -d.z), wp = Math.atan2(d.y, Math.hypot(d.x, d.z));
        const dy = angleDelta(yaw, wy);
        yaw += dy * Math.min(1, dt * 5);
        pitch += (wp - pitch) * Math.min(1, dt * 5);
        if ((Math.abs(dy) < 0.01 && Math.abs(wp - pitch) < 0.01) || t.settle > 0.8) finishTravel(false);
      } else finishTravel(false);
    }
  }

  function cancelTravel() {
    if (travel && !travel.locked) { travel = null; return true; }
    return false;
  }

  /* ------------------------------------------------ marche libre */
  function stepWalk(dt) {
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const strafe = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const wish = new THREE.Vector3();
    if (canMove()) {
      if (keys.forward) wish.add(forward);
      if (keys.back) wish.sub(forward);
      if (keys.right) wish.add(strafe);
      if (keys.left) wish.sub(strafe);
      if (stick.x || stick.y) { wish.addScaledVector(forward, -stick.y); wish.addScaledVector(strafe, stick.x); }
    }
    const push = Math.min(1, wish.length());
    if (push > 0.02) wish.normalize().multiplyScalar(WALK_SPEED * push);
    else wish.set(0, 0, 0);
    if (push > 0.02) eyeTarget = EYE;
    velocity.lerp(wish, Math.min(1, dt * 7));
    camera.position.addScaledVector(velocity, dt);
    camera.position.y += (eyeTarget - camera.position.y) * Math.min(1, dt * 5);
    confine();
  }

  function confine() {
    const p = camera.position;
    p.x = Math.max(BOUNDS.x0, Math.min(BOUNDS.x1, p.x));
    p.z = Math.max(BOUNDS.z0, Math.min(BOUNDS.z1, p.z));
    for (const o of obstacles) {
      if (o.type === 'circle') {
        const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), r = o.r + PLAYER * 0.5;
        if (d < r && d > 1e-4) { p.x = o.x + (dx / d) * r; p.z = o.z + (dz / d) * r; }
      } else {
        const hx = o.hx + PLAYER * 0.5, hz = o.hz + PLAYER * 0.5;
        const ox = p.x - o.x, oz = p.z - o.z;
        if (Math.abs(ox) < hx && Math.abs(oz) < hz) {
          if (hx - Math.abs(ox) < hz - Math.abs(oz)) p.x = o.x + (ox < 0 ? -hx : hx);
          else p.z = o.z + (oz < 0 ? -hz : hz);
        }
      }
    }
  }

  /* ------------------------------------------------ entrées */
  let dragging = false, moved = 0, lastX = 0, lastY = 0, pointerType = 'mouse';
  dom.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY; pointerType = e.pointerType;
    dom.setPointerCapture(e.pointerId);
  });
  dom.addEventListener('pointermove', (e) => {
    if (!dragging) { if (e.pointerType === 'mouse') onHover(e.clientX, e.clientY); return; }
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    if (moved > 6) {
      if (travel && travel.locked) { finishTravel(true); return; }
      if (cancelTravel()) onManual('look');
      const k = pointerType === 'mouse' ? 0.0032 : 0.0048;
      yaw -= dx * k;
      pitch = Math.max(-1.0, Math.min(0.9, pitch - dy * k * 0.85));
      onManual('look');
    }
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    try { dom.releasePointerCapture(e.pointerId); } catch (err) { /* déjà relâché */ }
    if (moved <= 6 && e.type === 'pointerup') onClick(e.clientX, e.clientY, e.pointerType);
  };
  dom.addEventListener('pointerup', end);
  dom.addEventListener('pointercancel', end);

  const KEYMAP = { z: 'forward', w: 'forward', arrowup: 'forward', s: 'back', arrowdown: 'back', q: 'left', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right' };
  window.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, textarea, [contenteditable]')) return;
    // une touche pendant l'entrée animée : on passe directement à l'intérieur
    if (travel && travel.locked && !e.ctrlKey && !e.metaKey && e.key !== 'Tab') { finishTravel(true); return; }
    const k = KEYMAP[e.key.toLowerCase()];
    if (!k || !canMove()) return;
    keys[k] = true;
    e.preventDefault();
    if (travel && travel.locked) return;
    cancelTravel();
    onManual('walk');
  });
  window.addEventListener('keyup', (e) => { const k = KEYMAP[e.key.toLowerCase()]; if (k) keys[k] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  /* ------------------------------------------------ interface publique */
  return {
    get yaw() { return yaw; },
    get traveling() { return !!travel; },
    get locked() { return !!(travel && travel.locked); },
    get canGoBack() { return history.length > 0; },
    setStick(x, y) {
      stick.x = x; stick.y = y;
      if ((x || y) && !(travel && travel.locked)) { cancelTravel(); onManual('walk'); }
    },
    setView(x, z, y, p) { camera.position.set(x, EYE, z); eyeTarget = EYE; yaw = y; pitch = p ?? -0.04; },
    intro(from, to, onArrive) {
      camera.position.set(from[0], EYE, from[1]);
      yaw = 0; pitch = -0.02;
      startTravel([to], { speed: 1.7, locked: true, remember: false, look: new THREE.Vector3(0, 1.35, 4), onArrive });
    },
    skipIntro() { if (travel && travel.locked) finishTravel(true); },
    /* clic au sol : on s'arrête devant le mur ou le meuble visé, jamais derrière */
    walkTo(x, z) {
      const p = camera.position;
      const dx = x - p.x, dz = z - p.z, len = Math.hypot(dx, dz);
      for (let s = len; s > 0.35; s -= 0.1) {
        const tx = p.x + (dx / len) * s, tz = p.z + (dz / len) * s;
        if (!standable(tx, tz, 0.25)) continue;
        const pts = route(tx, tz);
        if (!pts) continue;
        startTravel(pts, { speed: 2.8 });
        return { x: tx, z: tz };
      }
      return null;
    },
    goToZone(id, onArrive) {
      const stand = ZONE_STANDS[id];
      const [x, z] = settle(...stand.pos);
      startTravel(route(x, z) || [[x, z]], { look: new THREE.Vector3(...stand.look), onArrive });
    },
    goToProduct(p, { inspect = false, onArrive } = {}) {
      const target = inspect ? p.inspectPoint : p.viewPoint;
      const [x, z] = settle(target.x, target.z);
      startTravel(route(x, z) || [[x, z]], { look: p.lookAt, eye: target.y, speed: 3.0, onArrive });
    },
    back(onArrive) {
      const h = history.pop();
      if (!h) return;
      const look = new THREE.Vector3(h.x - Math.sin(h.yaw) * 5, EYE + Math.tan(h.pitch) * 5, h.z - Math.cos(h.yaw) * 5);
      startTravel(route(h.x, h.z) || [[h.x, h.z]], { remember: false, look, onArrive });
    },
    cancel: cancelTravel,
    snapshot() { return { x: camera.position.x, z: camera.position.z, yaw }; },
    update(dt) {
      if (travel) stepTravel(dt);
      else stepWalk(dt);
      camera.rotation.set(pitch, yaw, 0, 'YXZ');
    }
  };
}

function angleDelta(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
