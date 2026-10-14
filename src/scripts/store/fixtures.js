/* =============================================================
   Mobilier du magasin. Chaque meuble a son origine au sol, au
   centre, face avant (côté client) vers +z. Les dimensions sont
   renvoyées pour poser les produits et calculer les obstacles.
   ============================================================= */
import * as THREE from 'three';
import { add, rbox, box, cyl, plane, blob } from './kit.js';
import { boxTexture } from './textures.js';

const PI = Math.PI;

export function createFixtures(M) {
  const boxMats = ['white', 'graphite', 'kraft', 'blue'].map((k) => new THREE.MeshStandardMaterial({ map: boxTexture(k), roughness: 0.75 }));

  /* table d'exposition en chêne clair, piètement aluminium */
  function table({ w = 1.2, d = 5, h = 0.9 } = {}) {
    const g = new THREE.Group();
    add(g, rbox(w, 0.045, d, 0.012), M.oak, 0, h - 0.0225, 0);
    for (const sz of [-1, 1]) {
      const z = sz * (d / 2 - 0.35);
      add(g, rbox(w - 0.16, 0.05, 0.05, 0.01), M.alu, 0, h - 0.07, z);
      for (const sx of [-1, 1]) add(g, rbox(0.05, h - 0.07, 0.05, 0.01), M.alu, sx * (w / 2 - 0.1), (h - 0.07) / 2, z);
    }
    add(g, rbox(0.05, 0.05, d - 0.7, 0.01), M.alu, 0, h - 0.07, 0);
    blob(g, M, w + 0.5, d + 0.4);
    return { group: g, top: h };
  }

  /* podium rond de l'accueil */
  function plinth({ r = 0.75, h = 0.78 } = {}) {
    const g = new THREE.Group();
    add(g, cyl(r, r, h - 0.04, 64), M.oak, 0, (h - 0.04) / 2, 0);
    add(g, cyl(r + 0.01, r + 0.01, 0.04, 64), M.stone, 0, h - 0.02, 0);
    add(g, cyl(r + 0.015, r + 0.015, 0.02, 64), M.brass, 0, 0.01, 0);
    blob(g, M, r * 3, r * 3);
    return { group: g, top: h };
  }

  /* comptoir en pierre claire, caisson graphite */
  function counter({ w = 4.6, d = 1.0, h = 0.92 } = {}) {
    const g = new THREE.Group();
    add(g, rbox(w - 0.08, h - 0.04, d - 0.12, 0.01), M.graphite, 0, (h - 0.04) / 2, 0);
    add(g, rbox(w, 0.04, d, 0.012), M.stone, 0, h - 0.02, 0);
    add(g, box(w - 0.1, 0.012, 0.004), M.brass, 0, 0.2, d / 2 - 0.058);
    blob(g, M, w + 0.4, d + 0.5);
    return { group: g, top: h };
  }

  /* vitrine haute : socle, verre sur trois côtés, tablettes éclairées */
  function vitrine({ w = 2.2, d = 0.55, h = 2.1, shelves = [0.9, 1.45] } = {}) {
    const g = new THREE.Group();
    const base = 0.4;
    add(g, rbox(w, base, d, 0.01), M.graphite, 0, base / 2, 0);
    add(g, rbox(w, 0.14, d, 0.01), M.graphite, 0, h - 0.07, 0);
    add(g, box(w, h - base - 0.14, 0.02), M.plaster, 0, base + (h - base - 0.14) / 2, -d / 2 + 0.01);
    add(g, box(w - 0.1, 0.012, 0.03), M.ledWhite, 0, h - 0.145, d / 2 - 0.06);
    for (const [x, z] of [[-w / 2, d / 2], [w / 2, d / 2], [-w / 2, -d / 2], [w / 2, -d / 2]]) {
      add(g, box(0.025, h - base - 0.14, 0.025), M.alu, x + (x < 0 ? 0.0125 : -0.0125), base + (h - base - 0.14) / 2, z + (z < 0 ? 0.0125 : -0.0125));
    }
    const glassH = h - base - 0.14;
    const front = add(g, plane(w - 0.05, glassH), M.glass, 0, base + glassH / 2, d / 2 - 0.004);
    const left = add(g, plane(d - 0.05, glassH), M.glass, -w / 2 + 0.004, base + glassH / 2, 0, 0, -PI / 2);
    const right = add(g, plane(d - 0.05, glassH), M.glass, w / 2 - 0.004, base + glassH / 2, 0, 0, PI / 2);
    front.userData.noMerge = left.userData.noMerge = right.userData.noMerge = true;
    for (const y of shelves) {
      const s = add(g, box(w - 0.06, 0.01, d - 0.06), M.acrylic, 0, y, 0);
      s.userData.noMerge = true;
      add(g, box(w - 0.1, 0.006, 0.012), M.ledWhite, 0, y - 0.01, -d / 2 + 0.04);
    }
    blob(g, M, w + 0.4, d + 0.5);
    return { group: g, top: base, shelves, depth: d };
  }

  /* gondole : montants alu, fond perforé, tablettes, boîtes de réserve */
  function gondola({ w = 5, h = 1.5, d = 0.55, levels = [0.35, 0.8, 1.25], doubleSided = false, fill = true, seed = 1 } = {}) {
    const g = new THREE.Group();
    add(g, box(w, h, 0.03), M.pegboard, 0, h / 2, 0);
    for (let x = -w / 2; x <= w / 2 + 0.01; x += w / Math.max(1, Math.round(w / 1.25))) {
      add(g, box(0.04, h + 0.05, 0.05), M.aluDark, x, (h + 0.05) / 2, 0);
    }
    add(g, box(w, 0.1, doubleSided ? d * 2 : d), M.graphite, 0, 0.05, doubleSided ? 0 : d / 2);
    const sides = doubleSided ? [1, -1] : [1];
    for (const s of sides) {
      for (const y of levels) add(g, box(w - 0.02, 0.02, d - 0.04), M.alu, 0, y, s * (d / 2 + 0.01));
    }
    if (fill) fillShelves(g, { w, d, levels, sides, seed });
    blob(g, M, w + 0.4, (doubleSided ? d * 2 : d) + 0.5, 0, doubleSided ? 0 : d / 2);
    return { group: g, levels, depth: d };
  }

  /* boîtes de réserve, réparties sur les tablettes (instanciées : un appel de dessin par modèle) */
  function fillShelves(parent, { w, d, levels, sides, seed, skip = [] }) {
    let s = seed * 9301 + 49297;
    const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const items = boxMats.map(() => []);
    for (const side of sides) {
      for (const y of levels) {
        let x = -w / 2 + 0.08;
        while (x < w / 2 - 0.2) {
          const bw = 0.14 + r() * 0.22, bh = 0.12 + r() * 0.22, bd = Math.min(d - 0.1, 0.18 + r() * 0.2);
          if (!skip.some(([sx, sy]) => Math.abs(sx - x) < 0.35 && Math.abs(sy - y) < 0.1)) {
            const k = Math.floor(r() * boxMats.length);
            items[k].push([x + bw / 2, y + 0.01 + bh / 2, side * (0.03 + bd / 2 + 0.01), bw, bh, bd]);
          }
          x += bw + 0.03 + (r() < 0.2 ? 0.3 : 0);
        }
      }
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
    items.forEach((list, k) => {
      if (!list.length) return;
      const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), boxMats[k], list.length);
      list.forEach(([x, y, z, bw, bh, bd], i) => {
        m4.compose(p.set(x, y, z), q, sc.set(bw, bh, bd));
        inst.setMatrixAt(i, m4);
      });
      inst.castShadow = true;
      inst.receiveShadow = true;
      parent.add(inst);
    });
  }

  /* bureau de setup gaming : plateau graphite, bandeau lumineux discret */
  function desk({ w = 1.7, d = 0.8, h = 0.74 } = {}) {
    const g = new THREE.Group();
    add(g, rbox(w, 0.035, d, 0.01), M.graphite, 0, h - 0.0175, 0);
    for (const sx of [-1, 1]) {
      add(g, rbox(0.06, h - 0.035, d - 0.1, 0.01), M.blackMatte, sx * (w / 2 - 0.06), (h - 0.035) / 2, 0);
    }
    add(g, box(w - 0.2, 0.008, 0.01), M.ledWarm, 0, h - 0.04, -d / 2 + 0.03);
    add(g, rbox(w * 0.7, 0.003, d * 0.6, 0.002), M.fabric, 0, h + 0.0015, d * 0.08);
    blob(g, M, w + 0.5, d + 0.5);
    return { group: g, top: h };
  }

  /* établi du labo : plateau blanc, cadre acier, tablette basse */
  function bench({ w = 3, d = 0.9, h = 0.92 } = {}) {
    const g = new THREE.Group();
    add(g, rbox(w, 0.04, d, 0.008), M.stone, 0, h - 0.02, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, box(0.045, h - 0.04, 0.045), M.aluDark, sx * (w / 2 - 0.06), (h - 0.04) / 2, sz * (d / 2 - 0.06));
    add(g, box(w - 0.1, 0.025, d - 0.1), M.aluDark, 0, 0.18, 0);
    add(g, box(w - 0.12, 0.012, 0.02), M.brass, 0, h - 0.046, d / 2 - 0.01);
    blob(g, M, w + 0.4, d + 0.4);
    return { group: g, top: h };
  }

  /* panneau mural perforé avec petites tablettes */
  function demoWall({ w = 4, h = 2.4, y0 = 0.4, mat, shelves = [] } = {}) {
    const g = new THREE.Group();
    add(g, box(w, h, 0.03), mat || M.perforated, 0, y0 + h / 2, 0.015);
    add(g, box(w + 0.04, 0.04, 0.05), M.aluDark, 0, y0, 0.025);
    add(g, box(w + 0.04, 0.04, 0.05), M.aluDark, 0, y0 + h, 0.025);
    for (const [x, y, sw] of shelves) {
      add(g, box(sw, 0.02, 0.24), M.alu, x, y, 0.15);
      add(g, box(0.02, 0.1, 0.2), M.aluDark, x - sw / 2 + 0.05, y - 0.05, 0.13);
      add(g, box(0.02, 0.1, 0.2), M.aluDark, x + sw / 2 - 0.05, y - 0.05, 0.13);
    }
    return { group: g };
  }

  /* baie réseau 19 pouces, ouverte à l'avant */
  function rack({ w = 0.62, d = 0.9, h = 2.0 } = {}) {
    const g = new THREE.Group();
    for (const sx of [-1, 1]) add(g, box(0.03, h, d), M.graphite, sx * (w / 2 - 0.015), h / 2, 0);
    add(g, box(w, 0.04, d), M.graphite, 0, h - 0.02, 0);
    add(g, box(w, 0.08, d), M.graphite, 0, 0.04, 0);
    add(g, box(w - 0.06, h - 0.12, 0.02), M.blackMatte, 0, h / 2, -d / 2 + 0.01);
    for (const sx of [-1, 1]) add(g, box(0.02, h - 0.12, 0.02), M.aluDark, sx * 0.225, h / 2, d / 2 - 0.08);
    blob(g, M, w + 0.5, d + 0.5);
    return { group: g, rails: d / 2 - 0.08 };
  }

  /* borne d'accueil : pied, colonne, écran incliné (l'écran est posé par la mise en place) */
  function kiosk() {
    const g = new THREE.Group();
    add(g, rbox(0.5, 0.03, 0.4, 0.01), M.graphite, 0, 0.015, 0);
    add(g, rbox(0.14, 1.0, 0.1, 0.02), M.graphite, 0, 0.53, -0.05);
    const head = new THREE.Group();
    head.position.set(0, 1.18, 0);
    head.rotation.x = -0.35;
    g.add(head);
    add(head, rbox(0.62, 0.42, 0.04, 0.012), M.black, 0, 0, 0);
    add(g, box(0.3, 0.012, 0.012), M.brass, 0, 0.032, 0.19);
    blob(g, M, 0.9, 0.9);
    return { group: g, head, screenSize: [0.58, 0.37] };
  }

  /* caisson lumineux sur pieds, pour une affiche */
  function lightbox({ w = 1.1, h = 1.65, tex } = {}) {
    const g = new THREE.Group();
    const y = 0.35 + h / 2;
    add(g, rbox(w + 0.08, h + 0.08, 0.1, 0.01), M.alu, 0, y, 0);
    const face = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    const front = add(g, plane(w, h), face, 0, y, 0.051);
    const back = add(g, plane(w, h), face, 0, y, -0.051, 0, PI, 0);
    front.userData.noMerge = back.userData.noMerge = true;
    for (const sx of [-1, 1]) {
      add(g, box(0.04, 0.35, 0.04), M.alu, sx * (w / 2 - 0.1), 0.175, 0);
      add(g, rbox(0.1, 0.02, 0.4, 0.006), M.alu, sx * (w / 2 - 0.1), 0.01, 0);
    }
    blob(g, M, w + 0.4, 0.8);
    return { group: g };
  }

  /* écran mural, cadre fin */
  function wallScreen({ w = 3.6, h = 2.16, tex } = {}) {
    const g = new THREE.Group();
    add(g, rbox(w + 0.06, h + 0.06, 0.06, 0.01), M.black, 0, 0, 0);
    const s = add(g, plane(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), 0, 0, 0.031);
    s.userData.noMerge = true;
    return { group: g, screen: s };
  }

  /* étagères murales */
  function wallShelves({ w = 6, levels = [1.0, 1.45, 1.9], seed = 5 } = {}) {
    const g = new THREE.Group();
    for (const y of levels) {
      add(g, box(w, 0.025, 0.34), M.oak, 0, y, 0.17);
      add(g, box(w, 0.012, 0.02), M.brass, 0, y - 0.018, 0.33);
    }
    fillShelves(g, { w, d: 0.34, levels: levels.map((y) => y + 0.012), sides: [1], seed });
    return { group: g };
  }

  /* comptoir d'accueil */
  function welcomeDesk({ w = 3.4, d = 0.8, h = 1.05 } = {}) {
    const g = new THREE.Group();
    add(g, rbox(w, h - 0.04, d, 0.012), M.oak, 0, (h - 0.04) / 2, 0);
    add(g, rbox(w + 0.04, 0.04, d + 0.04, 0.012), M.stone, 0, h - 0.02, 0);
    add(g, rbox(w - 0.3, 0.03, d - 0.2, 0.008), M.graphite, 0, 0.78, -0.1);
    add(g, box(w - 0.1, 0.012, 0.004), M.brass, 0, 0.12, d / 2 + 0.002);
    blob(g, M, w + 0.5, d + 0.6);
    return { group: g, top: h };
  }

  /* comptoir de caisse, terminal de paiement */
  function checkoutCounter({ w = 5, d = 1.0, h = 1.0 } = {}) {
    const g = new THREE.Group();
    add(g, rbox(w, h - 0.04, d, 0.012), M.oak, 0, (h - 0.04) / 2, 0);
    add(g, rbox(w + 0.04, 0.04, d + 0.04, 0.012), M.stone, 0, h - 0.02, 0);
    add(g, box(w - 0.1, 0.012, 0.004), M.brass, 0, 0.12, d / 2 + 0.002);
    // terminal de paiement
    const t = new THREE.Group();
    t.position.set(1.2, h, 0.2);
    g.add(t);
    add(t, rbox(0.1, 0.02, 0.1, 0.008), M.graphite, 0, 0.01, 0);
    add(t, rbox(0.085, 0.16, 0.022, 0.01), M.black, 0, 0.1, 0, -0.5);
    add(t, plane(0.066, 0.06), M.ledWhite, 0, 0.13, 0.019, -0.5);
    blob(g, M, w + 0.5, d + 0.6);
    return { group: g, top: h };
  }

  /* râtelier à bobines de câble */
  function spoolRack({ w = 1.8 } = {}) {
    const g = new THREE.Group();
    for (const sx of [-1, 1]) {
      add(g, box(0.05, 0.9, 0.05), M.aluDark, sx * w / 2, 0.45, 0);
      add(g, box(0.05, 0.03, 0.5), M.aluDark, sx * w / 2, 0.015, 0);
    }
    add(g, cyl(0.02, 0.02, w, 12), M.alu, 0, 0.62, 0, 0, 0, PI / 2);
    add(g, box(w, 0.03, 0.4), M.alu, 0, 0.12, 0);
    blob(g, M, w + 0.4, 0.8);
    return { group: g, rodY: 0.62 - 0.17, shelfY: 0.135 };
  }

  return { table, plinth, counter, vitrine, gondola, fillShelves, desk, bench, demoWall, rack, kiosk, lightbox, wallScreen, wallShelves, welcomeDesk, checkoutCounter, spoolRack };
}
