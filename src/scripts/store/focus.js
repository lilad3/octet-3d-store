/* =============================================================
   Le produit en vue : celui dont on s'approche et qu'on regarde,
   ou celui que la souris survole. Une seule mise en lumière à la
   fois, couleur ambre (la seule touche d'accent du magasin).
   ============================================================= */
import * as THREE from 'three';
import { glowTexture, canvas, toTexture, setFont, FONT } from './textures.js';

export function createFocus({ camera, scene, products, occluders }) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const objects = products.map((p) => p.object);
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));

  // halo ambre sous le produit en vue
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: glowTexture('242,162,27'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.renderOrder = 2;
  scene.add(pool);
  let poolTarget = 0;

  let hovered = null, focused = null, pinned = null;

  function hitProduct(clientX, clientY, maxDist = 11) {
    ndc.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(objects, true);
    if (!hits.length || hits[0].distance > maxDist) return null;
    const p = byId[hits[0].object.userData.productId];
    if (!p) return null;
    // un meuble devant le produit le cache
    if (occluders.length) {
      const block = raycaster.intersectObjects(occluders, true);
      if (block.length && block[0].distance < hits[0].distance - 0.25 && !block[0].object.material.transparent) return null;
    }
    return p;
  }

  function floorPoint(clientX, clientY) {
    ndc.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const { origin, direction } = raycaster.ray;
    if (direction.y > -0.02) return null;
    let t = -origin.y / direction.y;
    if (t > 22) return null;
    // un meuble devant le sol visé : on va jusqu'à lui, pas derrière
    if (occluders.length) {
      const block = raycaster.intersectObjects(occluders, true).find((h) => !h.object.material.transparent);
      if (block && block.distance < t && block.point.y > 0.03) t = block.distance;
    }
    return new THREE.Vector3(origin.x + direction.x * t, 0, origin.z + direction.z * t);
  }

  const forward = new THREE.Vector3();
  const to = new THREE.Vector3();

  function nearest() {
    camera.getWorldDirection(forward);
    forward.y = 0; forward.normalize();
    let best = null, bestScore = 0;
    for (const p of products) {
      to.subVectors(p.center, camera.position);
      const h = Math.hypot(to.x, to.z);
      if (h > 4.2) continue;
      to.y = 0; to.normalize();
      const facing = to.dot(forward);
      if (facing < 0.55) continue;
      const score = (1 - h / 4.2) * 0.6 + facing * 0.4;
      if (score > bestScore) { bestScore = score; best = p; }
    }
    return best;
  }

  /* marques ambre suspendues au-dessus des produits mis au panier */
  const marks = new Map();
  function markTexture(qty) {
    const { c, ctx } = canvas(128, 64);
    ctx.fillStyle = '#F2A21B';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(4, 8, 120, 48, 10) : ctx.rect(4, 8, 120, 48); ctx.fill();
    ctx.fillStyle = '#1A1408';
    setFont(ctx, FONT.ui, 30, 700, 0);
    ctx.textAlign = 'center';
    ctx.fillText('× ' + qty, 64, 43);
    return toTexture(c);
  }
  function setCartMarks(items) {
    const seen = new Set();
    for (const { product, qty } of items) {
      const p = byId[product.id];
      if (!p) continue;
      seen.add(p.id);
      let m = marks.get(p.id);
      if (!m) {
        // taille constante à l'écran : la marque reste lisible depuis l'allée
        m = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: true, sizeAttenuation: false, toneMapped: false }));
        m.scale.set(0.052, 0.026, 1);
        m.position.copy(p.tagAnchor).add(new THREE.Vector3(0, 0.08, 0));
        scene.add(m);
        marks.set(p.id, m);
      }
      if (m.userData.qty !== qty) {
        if (m.material.map) m.material.map.dispose();
        m.material.map = markTexture(qty);
        m.material.needsUpdate = true;
        m.userData.qty = qty;
      }
    }
    for (const [id, m] of marks) {
      if (!seen.has(id)) { scene.remove(m); m.material.map && m.material.map.dispose(); m.material.dispose(); marks.delete(id); }
    }
  }

  return {
    get focused() { return focused; },
    hitProduct,
    floorPoint,
    setHover(p) { hovered = p; },
    pin(p) { pinned = p; },
    setCartMarks,
    update(dt, { traveling }) {
      const next = pinned || hovered || (traveling ? null : nearest());
      focused = next;
      poolTarget = next && next.pool ? 1 : 0;
      if (next && next.pool) {
        const [w, d] = next.footprint;
        const s = Math.min(next.poolMax, Math.max(w, d) * 2 + 0.22);
        pool.scale.set(s, s, 1);
        pool.position.set(next.center.x, next.surfaceY + 0.004, next.center.z);
      }
      pool.material.opacity += (poolTarget * 0.85 - pool.material.opacity) * Math.min(1, dt * 8);
      pool.visible = pool.material.opacity > 0.01;
      return focused;
    }
  };
}
