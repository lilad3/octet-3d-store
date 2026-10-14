/* =============================================================
   OCTET — démarrage du magasin
   Attend les polices, construit la salle, puis fait
   tourner la boucle : déplacements, produit en vue, interface.
   ============================================================= */
import * as THREE from 'three';
import { detectTier, createAdaptiveResolution } from './quality.js';
import { createMaterials } from './materials.js';
import { buildLights, buildShell, buildFacade, buildTraces, buildSigns, buildBrandWall, buildWallLettering } from './architecture.js';
import { createFixtures } from './fixtures.js';
import { createModels } from './models.js';
import { buildLayout } from './layout.js';
import { gameScreenTexture, webcamPreviewTexture, wallpaperTexture } from './screens.js';
import { createNav } from './nav.js';
import { createFocus } from './focus.js';
import { createCart } from './cart.js';
import { ZONE_STANDS } from './plan.js';
import { createHud } from './hud.js';
import { mergeStatic } from './kit.js';
import { zones, store, products as catalog, zoneById } from '../../data/catalog.js';

const loaderEl = document.getElementById('loader');
const loaderBits = [...loaderEl.querySelectorAll('rect')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const POSITION_KEY = 'octet-visite';
const TOUR = zones.map((z) => z.id);

function progress(step) {
  loaderBits.forEach((r, i) => r.classList.toggle('on', i < step));
}

const cart = createCart();
let entries = [];
const app = {
  cart,
  nav: { setStick() {}, back() {} },
  // sans 3D (navigateur incompatible), la fiche s'ouvre quand même depuis la liste
  entry: (id) => entries.find((e) => e.id === id) || (entries.length ? null : fallbackEntry(id)),
  openProduct(e) { if (e) hud.openSheet(e); }, goZone() {}, toggleTour() {}, back() {}, toggleSound() {},
  onPanel() {}, onSheetClosed() {},
  catalogOnly() { loaderEl.classList.add('is-done'); }
};
const hud = createHud(app);

function fallbackEntry(id) {
  const data = catalog.find((p) => p.id === id);
  return data ? { id, data, zone: zoneById(data.zone) } : null;
}

function fail(message) {
  loaderEl.querySelector('.loader-text').hidden = true;
  loaderEl.querySelector('.loader-fail').hidden = false;
  loaderEl.querySelector('.loader-fail-text').textContent = message;
}

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((r) => setTimeout(r, ms))]);
}

async function boot() {
  if (location.protocol === 'file:') {
    fail("Le magasin 3D ne s'ouvre pas depuis un fichier : lancez « npm run dev » puis ouvrez l'adresse affichée.");
    return;
  }
  const tier = detectTier();
  progress(1);

  await withTimeout(Promise.all([
    document.fonts.load('700 40px "Archivo Narrow"'), document.fonts.load('600 20px "Archivo Narrow"'),
    document.fonts.load('400 20px Archivo'), document.fonts.load('700 20px Archivo'),
    document.fonts.load('400 20px "Martian Mono"'), document.fonts.load('500 20px "Martian Mono"')
  ]), 3500);
  progress(4);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: tier.antialias, powerPreference: 'high-performance' });
  } catch (err) {
    fail("Ce navigateur n'arrive pas à afficher la 3D (accélération graphique désactivée ?). Le catalogue reste consultable en liste.");
    return;
  }
  renderer.setPixelRatio(tier.ratio);
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = tier.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  document.getElementById('scene').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xE4E0D9);
  scene.fog = new THREE.Fog(0xE4E0D9, 48, 100);
  const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.05, 140);
  progress(6);

  /* ---------------------------------------------- construction */
  const M = createMaterials();
  const statics = new THREE.Group();
  const dynamic = new THREE.Group();
  scene.add(dynamic);
  buildLights(scene, renderer, tier);
  buildShell(M, statics, dynamic);
  const doors = buildFacade(M, statics, dynamic);
  buildTraces(M, statics, dynamic);
  buildSigns(M, statics);
  buildBrandWall(M, statics);
  buildWallLettering(statics);
  scene.add(mergeStatic(statics));

  const S = {
    game: gameScreenTexture(1024, 576, 0),
    game2: gameScreenTexture(1024, 576, 1),
    gameWide: gameScreenTexture(1280, 540, 1),
    gameWide2: gameScreenTexture(1024, 576, 0),
    webcam: webcamPreviewTexture(),
    wall: { dune: wallpaperTexture('dune'), ember: wallpaperTexture('ember'), tide: wallpaperTexture('tide'), sand: wallpaperTexture('sand'), ink: wallpaperTexture('ink') }
  };
  const F = createFixtures(M);
  const models = createModels(M, S);
  const layout = buildLayout({ scene, M, F, models, S });
  entries = layout.products;
  if (tier.shadows) renderer.shadowMap.needsUpdate = true;
  progress(7);

  /* ---------------------------------------------- repère de destination au sol */
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.26, 48), new THREE.MeshBasicMaterial({ color: 0xCBA35A, transparent: true, opacity: 0, depthWrite: false }));
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.006;
  scene.add(marker);
  let markerLife = 0;

  /* ---------------------------------------------- navigation, focus */
  let hoverAt = 0, sheetFocus = null;
  const focus = createFocus({ camera, scene, products: layout.products, occluders: [layout.merged] });
  const nav = createNav({
    camera,
    dom: renderer.domElement,
    obstacles: layout.obstacles,
    reducedMotion,
    canMove: () => !hud.overlayOpen,
    onManual(kind) {
      hud.fadeHint();
      if (tour.active) stopTour();
      if (kind === 'walk' && (hud.sheetEntry || hud.cartOpen)) { hud.closeSheet(); hud.closeCart(); }
    },
    onHover(x, y) {
      const now = performance.now();
      if (now - hoverAt < 50) return;
      hoverAt = now;
      const p = nav.locked ? null : focus.hitProduct(x, y, 9, false);
      focus.setHover(p);
      renderer.domElement.classList.toggle('is-pointing', !!p);
    },
    onClick(x, y) {
      if (nav.locked) { nav.skipIntro(); return; }
      const p = focus.hitProduct(x, y, 12, true);
      if (p) { openProduct(p); return; }
      const fp = focus.floorPoint(x, y);
      if (fp) {
        if (hud.sheetEntry) hud.closeSheet();
        if (tour.active) stopTour();
        const dest = nav.walkTo(fp.x, fp.z);
        if (dest) {
          marker.position.set(dest.x, 0.006, dest.z);
          markerLife = 1;
          hud.fadeHint();
        }
      }
    }
  });
  app.nav = nav;

  /* ---------------------------------------------- décalage de la vue quand un panneau s'ouvre */
  const offset = { x: 0, y: 0, tx: 0, ty: 0 };
  /* le champ de vision se règle sur la partie visible : en portrait on garde ~58° à l'horizontale,
     et quand un panneau couvre une partie de l'écran, l'image garde la même échelle */
  const DEG = Math.PI / 180;
  function applyOffset() {
    const w = innerWidth, h = innerHeight;
    const aspect = w / h;
    const portrait = aspect < 0.8;
    let fov = portrait ? Math.min(92, 2 * Math.atan(Math.tan(29 * DEG) / aspect) / DEG) : 62;
    // en portrait, un décentrement d'objectif : l'horizon monte au tiers supérieur,
    // les meubles et les produits occupent l'écran au lieu du plafond
    const oy = Math.max(offset.y, portrait ? Math.round(h * 0.3) : 0);
    if (offset.x < 0.5 && oy < 0.5) {
      camera.clearViewOffset();
      camera.aspect = aspect;
    } else {
      camera.aspect = (w + offset.x) / (h + oy);
      fov = 2 * Math.atan(Math.tan((fov / 2) * DEG) * (h + oy) / h) / DEG;
      camera.setViewOffset(w + offset.x, h + oy, offset.x, oy, w, h);
    }
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }

  function openProduct(entry) {
    if (!entry) return;
    if (tour.active) stopTour();
    sheetFocus = entry;
    focus.pin(entry);
    hud.openSheet(entry);
    history.replaceState(null, '', '?produit=' + entry.id);
    nav.goToProduct(entry, { inspect: true });
    updateBack();
  }

  function goZone(id) {
    if (tour.active) stopTour();
    hud.fadeHint(0);
    hud.closeSheet();
    nav.goToZone(id);
    updateBack();
  }

  function updateBack() { hud.setBack(nav.canGoBack); }

  Object.assign(app, {
    openProduct,
    goZone,
    back() { hud.closeSheet(); nav.back(updateBack); updateBack(); },
    onPanel(p) { offset.tx = p && p.x ? p.x : 0; offset.ty = p && p.y ? p.y : 0; },
    onSheetClosed() { sheetFocus = null; focus.pin(null); history.replaceState(null, '', location.pathname); },
    toggleTour() { tour.active ? stopTour() : startTour(); },
    toggleSound,
    catalogOnly() {}
  });

  /* ---------------------------------------------- visite guidée */
  const tour = { active: false, i: 0, timer: 0, waiting: false };
  function tourStep() {
    const id = TOUR[tour.i];
    tour.waiting = false;
    hud.closeSheet();
    nav.goToZone(id, () => {
      if (!tour.active) return;
      hud.showCaption(zones.find((z) => z.id === id));
      tour.waiting = true;
      tour.timer = 0;
    });
  }
  function startTour() {
    tour.active = true;
    tour.i = 0;
    hud.setTour(true);
    hud.fadeHint();
    tourStep();
  }
  function stopTour() {
    tour.active = false;
    tour.waiting = false;
    hud.setTour(false);
    nav.cancel();
  }

  /* ---------------------------------------------- musique d'ambiance (si le catalogue en déclare une) */
  let audio = null;
  if (store.ambiance) {
    hud.showSound();
    audio = new Audio(store.ambiance);
    audio.loop = true;
    audio.volume = 0.4;
    const start = () => { audio.play().catch(() => {}); window.removeEventListener('pointerdown', start); };
    window.addEventListener('pointerdown', start);
  }
  function toggleSound(btn) {
    if (!audio) return;
    audio.muted = !audio.muted;
    btn.classList.toggle('is-off', audio.muted);
    btn.setAttribute('aria-label', audio.muted ? 'Remettre la musique' : 'Couper la musique');
  }

  /* ---------------------------------------------- panier relié à la salle */
  const syncCart = () => {
    const items = cart.items();
    focus.setCartMarks(items);
    layout.checkout.setCart(items);
  };
  cart.on(syncCart);
  syncCart();
  hud.refreshCart();

  /* ---------------------------------------------- arrivée : reprise ou entrée par les portes */
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(POSITION_KEY) || 'null'); } catch (e) { saved = null; }
  const fresh = saved && Date.now() - saved.t < 7 * 24 * 3600 * 1000 && saved.z < 12;
  let doorOpen = 0;
  // liens directs : ?produit=<id> ouvre la fiche, ?rayon=<zone> place dans le rayon
  const params = new URLSearchParams(location.search);
  const deepProduct = params.get('produit') && app.entry(params.get('produit'));
  const deepZone = zones.find((z) => z.id === params.get('rayon'));
  const facing = (x, z, look) => Math.atan2(-(look[0] - x), -(look[2] - z));
  if (deepProduct) {
    const v = deepProduct.viewPoint, l = deepProduct.lookAt;
    nav.setView(v.x, v.z, facing(v.x, v.z, [l.x, l.y, l.z]));
    finishArrival();
    openProduct(deepProduct);
  } else if (deepZone) {
    const stand = ZONE_STANDS[deepZone.id], [x, z] = stand.pos;
    nav.setView(x, z, facing(x, z, stand.look), -0.08);
    finishArrival();
  } else if (fresh) {
    nav.setView(saved.x, saved.z, saved.yaw);
    finishArrival();
    hud.showToast('Vous reprenez votre visite là où vous l’aviez laissée.', 'Revenir à l’entrée', () => goZone('accueil'));
  } else if (reducedMotion) {
    nav.setView(0, 13.2, 0);
    finishArrival();
  } else {
    nav.intro([0, 22.5], [0, 13.3], finishArrival);
  }
  function finishArrival() { hud.ready(); }

  const savePosition = () => {
    if (nav.locked) return;
    try { localStorage.setItem(POSITION_KEY, JSON.stringify({ ...nav.snapshot(), t: Date.now() })); } catch (e) { /* stockage indisponible */ }
  };
  setInterval(savePosition, 5000);
  addEventListener('pagehide', savePosition);

  /* ---------------------------------------------- boucle */
  const adapt = createAdaptiveResolution(renderer, tier);
  const timer = new THREE.Timer();
  const tmp = new THREE.Vector3();
  const project = (v) => {
    tmp.copy(v).project(camera);
    if (tmp.z > 1 || tmp.z < -1) return null;
    return { x: (tmp.x * 0.5 + 0.5) * innerWidth, y: (-tmp.y * 0.5 + 0.5) * innerHeight };
  };

  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    applyOffset();
    const sheetEl = document.getElementById('sheet');
    if (hud.sheetEntry) app.onPanel(hud.isCompact() ? { y: sheetEl.offsetHeight } : { x: sheetEl.offsetWidth + 24 });
  });
  applyOffset();

  loaderEl.classList.add('is-done');
  progress(8);

  renderer.setAnimationLoop((time) => {
    timer.update(time);
    const dt = Math.min(timer.getDelta(), 0.05);
    nav.update(dt);

    // portes automatiques : elles s'ouvrent quand on approche
    const p = camera.position;
    const near = Math.abs(p.x) < 3.5 && p.z > 12.2 && p.z < 21;
    doorOpen += ((near ? 1 : 0) - doorOpen) * Math.min(1, dt * (near ? 3.2 : 2));
    for (const d of doors) d.position.x = THREE.MathUtils.lerp(d.userData.closedX, d.userData.openX, doorOpen);

    for (const b of models.spin) b.rotation.z -= dt * 7;
    for (const t of layout.terminals) {
      const d = p.distanceTo(t.pos);
      if (d < t.range + 5) t.terminal.update(dt, d < t.range);
    }
    layout.rackLeds.update(dt);

    if (markerLife > 0) {
      markerLife = Math.max(0, markerLife - dt * 0.9);
      marker.material.opacity = markerLife * 0.9;
      marker.scale.setScalar(1 + (1 - markerLife) * 0.6);
    }

    if (tour.active && tour.waiting) {
      tour.timer += dt;
      if (tour.timer > 5.5) {
        tour.i++;
        if (tour.i >= TOUR.length) stopTour();
        else tourStep();
      }
    }

    // décalage progressif de la vue sous les panneaux
    if (offset.x !== offset.tx || offset.y !== offset.ty) {
      const k = Math.min(1, dt * 7);
      offset.x += (offset.tx - offset.x) * k;
      offset.y += (offset.ty - offset.y) * k;
      if (Math.abs(offset.tx - offset.x) < 0.5) offset.x = offset.tx;
      if (Math.abs(offset.ty - offset.y) < 0.5) offset.y = offset.ty;
      applyOffset();
    }

    const focused = focus.update(dt, { traveling: nav.traveling && !sheetFocus });
    hud.frame({ position: p, yaw: nav.yaw, focused, project, traveling: nav.traveling });
    if (!nav.traveling) updateBack();

    adapt(dt);
    renderer.render(scene, camera);
  });
}

boot().catch((err) => {
  console.error(err);
  fail("Le magasin n'a pas pu s'ouvrir. Rechargez la page ; si le problème continue, le catalogue reste consultable en liste.");
});
