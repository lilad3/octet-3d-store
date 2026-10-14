/* =============================================================
   Mise en place du magasin : où va chaque meuble, chaque produit,
   chaque écran. C'est ici qu'on déplace un produit dans la salle.
   Coordonnées en mètres (voir plan.js), ry = orientation de la
   face avant (0 : vers l'entrée, PI/2 : vers +x, -PI/2 : vers -x).
   ============================================================= */
import * as THREE from 'three';
import { place, mergeStatic, add, plane, rbox, box } from './kit.js';
import { canvas, toTexture, setFont, FONT, INK } from './textures.js';
import { products as catalog, formatPrice, zoneById } from '../../data/catalog.js';
import { welcomeTerminal, buildTerminal, networkTerminal, CheckoutScreen, directoryTexture, posterTexture } from './screens.js';
import { TOTEMS } from './plan.js';

const PI = Math.PI;
const EYE = 1.6;

export function buildLayout({ scene, M, F, models, S }) {
  const statics = new THREE.Group();
  statics.name = 'mobilier';
  const obstacles = [];
  const placed = [];
  const terminals = [];
  const tagRequests = [];

  const obBox = (x, z, hx, hz) => obstacles.push({ type: 'box', x, z, hx, hz });
  const obCircle = (x, z, r) => obstacles.push({ type: 'circle', x, z, r });
  const put = (fx, x, z, ry = 0, y = 0) => { place(fx.group, x, y, z, ry); statics.add(fx.group); return fx; };
  /* plaque de code d'emplacement (repère local du meuble) : le même code que sur le plan */
  const plates = [];
  const code = (fx, text, lx, ly, lz, lry = 0) => plates.push({ group: fx.group, text, lx, ly, lz, lry });
  const tableCodes = (fx, text, d, h) => { code(fx, text, 0, h + 0.045, d / 2 - 0.07); code(fx, text, 0, h + 0.045, -d / 2 + 0.07, PI); };
  const endCodes = (fx, text, w, h, z = 0) => { code(fx, text, w / 2 + 0.03, h - 0.12, z, PI / 2); code(fx, text, -w / 2 - 0.03, h - 0.12, z, -PI / 2); };

  /* un produit posé : fusionné par matériau, repéré par son identifiant */
  function product(id, x, y, z, ry = 0, opts = {}) {
    const data = catalog.find((p) => p.id === id);
    const model = models.build(id);
    if (!data || !model) return null;
    const obj = mergeStatic(model);
    obj.name = id;
    place(obj, x, y, z, ry);
    obj.traverse((o) => { o.userData.productId = id; });
    scene.add(obj);
    obj.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(obj);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const f = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
    const reach = Math.max(size.x, size.z) / 2;
    const maxDim = Math.max(size.x, size.y, size.z);
    const walk = opts.view ?? THREE.MathUtils.clamp(maxDim * 2.4 + 1.1, 1.4, 2.6);
    const near = opts.inspect ?? THREE.MathUtils.clamp(maxDim * 1.6 + 0.35, 0.5, 1.9);
    const iy = opts.eye ?? THREE.MathUtils.clamp(center.y + 0.25, 1.15, 1.62);
    const entry = {
      id, data, zone: zoneById(data.zone), object: obj, bounds, center, size, facing: f, ry,
      surfaceY: y,
      viewPoint: new THREE.Vector3(x + f.x * (walk + reach), EYE, z + f.z * (walk + reach)),
      inspectPoint: new THREE.Vector3(x + f.x * (near + reach), iy, z + f.z * (near + reach)),
      lookAt: center.clone(),
      tagAnchor: new THREE.Vector3(center.x, bounds.max.y + 0.06, center.z),
      footprint: [Math.max(size.x, 0.12), Math.max(size.z, 0.12)],
      pool: opts.pool ?? true,
      poolMax: opts.poolMax ?? (opts.tag && opts.tag.shelf ? 0.46 : 1.4)
    };
    placed.push(entry);
    if (opts.tag !== false) tagRequests.push({ entry, x, y, z, ry, reach, ...(opts.tag || {}) });
    return entry;
  }

  /* décor non vendu (écrans de démonstration, doubles en réserve) */
  function decor(obj, x, y, z, ry = 0) {
    place(obj, x, y, z, ry);
    statics.add(obj);
    return obj;
  }

  const screenPlane = (parent, w, h, material, x, y, z) => {
    const p = add(parent, plane(w, h), material, x, y, z);
    p.userData.noMerge = true;
    return p;
  };

  /* ================================================= 00 accueil */
  put(F.plinth({ r: 0.75, h: 0.78 }), 0, 11);
  obCircle(0, 11, 1.15);
  product('luna-15', 0, 0.78, 11.08, 0, { view: 2.2, inspect: 1.05, tag: { dz: 0.28 } });

  const kiosk = put(F.kiosk(), -4.3, 12.8, 1.0);
  const welcome = welcomeTerminal();
  screenPlane(kiosk.head, kiosk.screenSize[0], kiosk.screenSize[1], welcome.material, 0, 0, 0.021);
  terminals.push({ terminal: welcome, pos: new THREE.Vector3(-4.3, 1.2, 12.8), range: 6.5 });
  obCircle(-4.3, 12.8, 0.5);

  put(F.welcomeDesk({ w: 3.4 }), -8.6, 12.4, 0);
  obBox(-8.6, 12.4, 1.9, 0.6);

  put(F.lightbox({ w: 1.1, h: 1.65, tex: posterTexture('luna-15') }), 5.6, 12.5, -0.6);
  obCircle(5.6, 12.5, 0.75);

  // les totems directionnels (posés avec la signalétique) : on ne passe pas au travers
  for (const t of TOTEMS) obBox(t.x, t.z, 0.82, 0.25);

  const directory = F.wallScreen({ w: 3.6, h: 2.16, tex: directoryTexture() });
  put(directory, STORE_EDGE_X - 0.06, 11.2, -PI / 2, 1.95);

  /* ================================================= 01 PC portables */
  tableCodes(put(F.table({ w: 1.2, d: 5, h: 0.9 }), -12.7, 0.6), '01-A', 5, 0.9);
  obBox(-12.7, 0.6, 0.75, 2.65);
  product('portable-pro-16', -12.42, 0.9, 2.35, PI / 2);
  product('ultrabook-14', -12.42, 0.9, 0.65, PI / 2);
  product('support-portable', -12.45, 0.9, -1.05, PI / 2);

  tableCodes(put(F.table({ w: 1.2, d: 5, h: 0.9 }), -7.3, 0.6), '01-B', 5, 0.9);
  obBox(-7.3, 0.6, 0.75, 2.65);
  product('portable-gaming-16', -7.62, 0.9, 2.1, -PI / 2);
  product('housse-14', -7.55, 0.9, 0.1, -PI / 2);
  decor(models.laptop({ finish: 'silver', w: 0.31, d: 0.215, screen: S.wall.tide }), -7.62, 0.9, -1.5, -PI / 2);

  code(put(F.wallShelves({ w: 6, levels: [1.0, 1.45, 1.9], seed: 11 }), -14.97, 0.6, PI / 2), '01-C', -2.85, 0.86, 0.012);

  /* ================================================= 02 gaming */
  code(put({ group: models.pedestal() }, 0, -3.4), '02-P', 0, 0.3, 0.402);
  obCircle(0, -3.4, 0.85);
  product('pc-forge', 0, 0.472, -3.4, 0.35, { view: 2.4, inspect: 1.5, eye: 1.3, tag: { dz: 0.32 } });

  const deskL1 = put(F.desk(), -3.6, 2.6, PI / 2);
  code(deskL1, '02-A', 0.851, 0.5, 0, PI / 2);
  obBox(-3.6, 2.6, 0.45, 0.9);
  product('ecran-27-qhd', -3.85, deskL1.top, 2.6, PI / 2, { view: 2.0, inspect: 1.05, tag: { side: -0.45 } });
  product('clavier-75-magnetique', -3.42, deskL1.top, 2.62, PI / 2, { inspect: 0.7, tag: { dz: 0.2, side: 0.34 } });
  // fauteuil tourné vers l'allée, poussé au bout du bureau : l'écran et le clavier restent accessibles
  product('fauteuil-gaming', -2.45, 0, 3.55, PI / 2 - 0.4, { view: 2.0, inspect: 1.6, eye: 1.45, tag: false });
  obCircle(-2.45, 3.55, 0.45);

  const deskL2 = put(F.desk(), -3.6, -1.1, PI / 2);
  code(deskL2, '02-B', 0.851, 0.5, 0, PI / 2);
  obBox(-3.6, -1.1, 0.45, 0.9);
  product('ecran-34-uw', -3.85, deskL2.top, -1.1, PI / 2, { view: 2.0, inspect: 1.15, tag: { side: 0.55 } });

  const deskR1 = put(F.desk(), 3.6, 2.6, -PI / 2);
  code(deskR1, '02-C', -0.851, 0.5, 0, -PI / 2);
  obBox(3.6, 2.6, 0.45, 0.9);
  decor(models.monitor({ w: 0.6, h: 0.34, screen: S.game2 }), 3.85, deskR1.top, 2.6, -PI / 2);
  product('manette-sans-fil', 3.42, deskR1.top, 2.6, -PI / 2, { inspect: 0.55 });

  const deskR2 = put(F.desk(), 3.6, -1.1, -PI / 2);
  code(deskR2, '02-D', -0.851, 0.5, 0, -PI / 2);
  obBox(3.6, -1.1, 0.45, 0.9);
  decor(models.monitor({ w: 0.6, h: 0.34, screen: S.gameWide2 }), 3.85, deskR2.top, -1.35, -PI / 2);
  product('casque-sans-fil', 3.45, deskR2.top, -0.72, -PI / 2, { inspect: 0.65 });

  /* ================================================= 03 mobile & image */
  code(put(F.counter({ w: 4.6, d: 1.0, h: 0.92 }), 7.4, 0.8, PI / 2), '03-A', -2.0, 0.62, 0.443);
  obBox(7.4, 0.8, 0.55, 2.35);
  product('smartphone-61', 7.56, 0.92, 2.55, PI / 2, { inspect: 0.5 });
  product('smartphone-67', 7.56, 0.92, 1.75, PI / 2, { inspect: 0.52 });
  product('tablette-11', 7.5, 0.92, 0.75, PI / 2, { inspect: 0.6 });
  product('hub-usbc', 7.6, 0.92, -0.35, PI / 2, { inspect: 0.45 });
  product('chargeur-65', 7.6, 0.92, -1.15, PI / 2, { inspect: 0.45 });

  const camCase = put(F.vitrine({ w: 2.2, d: 0.55, h: 2.1, shelves: [0.95, 1.5] }), 14.66, 2.2, -PI / 2);
  vitrineStock(F, camCase, 2.2, 0.55, 31);
  code(camCase, '03-B', 0, 0.28, 0.277);
  obBox(14.66, 2.2, 0.35, 1.15);
  product('hybride-plein-format', 14.64, camCase.shelves[0] + 0.006, 1.75, -PI / 2, { inspect: 0.6, tag: { shelf: 0.22 } });
  product('camera-poche', 14.64, camCase.shelves[1] + 0.006, 2.65, -PI / 2, { inspect: 0.55, tag: { shelf: 0.22 } });

  code(put(F.wallShelves({ w: 3.6, levels: [1.0, 1.45], seed: 23 }), 14.97, -3.2, -PI / 2), '03-C', -1.65, 0.86, 0.012);
  // table d'accessoires : étuis, câbles, protections d'écran
  const accTable = put(F.table({ w: 1.1, d: 2.4, h: 0.9 }), 12.2, -1.8);
  tableCodes(accTable, '03-D', 2.4, 0.9);
  const accTop = new THREE.Group();
  accTop.position.y = 0.9;
  accTop.rotation.y = PI / 2;
  accTable.group.add(accTop);
  F.fillShelves(accTop, { w: 2.2, d: 0.5, levels: [0.0], sides: [1, -1], seed: 44 });
  obBox(12.2, -1.8, 0.7, 1.35);
  product('batterie-20000', 14.78, 1.475, -3.2, -PI / 2, { inspect: 0.5, tag: { shelf: 0.15 } });

  /* ================================================= 04 composants (le labo) */
  const lab = put(F.vitrine({ w: 2.6, d: 0.6, h: 2.1, shelves: [0.95, 1.5] }), -14.64, -10.2, PI / 2);
  vitrineStock(F, lab, 2.6, 0.6, 32);
  code(lab, '04-A', 0, 0.28, 0.302);
  obBox(-14.64, -10.2, 0.38, 1.35);
  product('gpu-16', -14.62, lab.shelves[0] + 0.006, -10.2, PI / 2, { inspect: 0.7, tag: { shelf: 0.25 } });
  product('cpu-8c', -14.62, lab.shelves[1] + 0.006, -9.45, PI / 2, { inspect: 0.5, tag: { shelf: 0.25 } });
  product('ram-ddr5-32', -14.62, lab.shelves[1] + 0.006, -10.2, PI / 2, { inspect: 0.5, tag: { shelf: 0.25 } });
  product('ssd-nvme-2to', -14.62, lab.shelves[1] + 0.006, -10.95, PI / 2, { inspect: 0.5, tag: { shelf: 0.25 } });

  const bench = put(F.bench({ w: 3, d: 0.9 }), -7.3, -10.8, -PI / 2);
  code(bench, '04-B', -1.35, 0.965, 0.36);
  obBox(-7.3, -10.8, 0.5, 1.55);
  const build = buildTerminal();
  decor(models.monitor({ w: 0.62, h: 0.37, screen: build.texture }), -7.05, bench.top, -10.2, -PI / 2);
  terminals.push({ terminal: build, pos: new THREE.Vector3(-7.1, 1.3, -10.2), range: 6 });
  product('alim-850', -7.45, bench.top, -11.45, -PI / 2, { inspect: 0.55 });

  const stock = F.gondola({ w: 3.2, h: 1.9, d: 0.45, levels: [0.4, 0.9, 1.4], seed: 4, fill: false });
  put(stock, -12.8, -15.4, 0);
  endCodes(stock, '04-C', 3.2, 1.9, 0.2);
  F.fillShelves(stock.group, { w: 3.2, d: 0.45, levels: [0.41, 0.91, 1.41], sides: [1], seed: 4, skip: [[-1.05, 0.91], [-0.75, 0.91]] });
  obBox(-12.8, -15.15, 1.7, 0.42);
  endCodes(put(F.gondola({ w: 2.4, h: 1.9, d: 0.45, levels: [0.4, 0.9, 1.4], seed: 6 }), -8.2, -15.4, 0), '04-D', 2.4, 1.9, 0.2);
  obBox(-8.2, -15.15, 1.3, 0.42);
  product('ventirad-afficheur', -13.85, 0.912, -15.15, 0, { inspect: 0.55, tag: { shelf: 0.2 } });
  for (const dx of [0.18, 0.34]) decor(models.coolerBox(), -13.85 + dx, 0.912, -15.15, 0);

  /* ================================================= 05 périphériques */
  const gL = F.gondola({ w: 5, h: 1.6, d: 0.5, levels: [0.4, 0.95, 1.45], fill: false });
  put(gL, -3.7, -11, PI / 2);
  endCodes(gL, '05-A', 5, 1.6, 0.25);
  F.fillShelves(gL.group, { w: 5, d: 0.5, levels: [0.41, 0.96, 1.46], sides: [1], seed: 8, skip: [[-1.55, 1.46], [-0.35, 0.96], [1.25, 0.96]] });
  obBox(-3.42, -11, 0.36, 2.6);
  product('webcam-compacte', -3.46, 1.462, -9.45, PI / 2, { inspect: 0.5, tag: { shelf: 0.25 } });
  product('clavier-bt-azerty', -3.47, 0.962, -10.65, PI / 2, { inspect: 0.6, tag: { shelf: 0.25 } });
  product('souris-silencieuse', -3.47, 0.962, -12.25, PI / 2, { inspect: 0.5, tag: { shelf: 0.25 } });

  const gR = F.gondola({ w: 5, h: 1.6, d: 0.5, levels: [0.4, 0.95, 1.45], fill: false });
  put(gR, 3.7, -11, -PI / 2);
  endCodes(gR, '05-B', 5, 1.6, 0.25);
  F.fillShelves(gR.group, { w: 5, d: 0.5, levels: [0.41, 0.96, 1.46], sides: [1], seed: 9, skip: [[-1.45, 0.96], [0.45, 1.46], [0.75, 1.46]] });
  obBox(3.42, -11, 0.36, 2.6);
  product('micro-usb', 3.46, 0.962, -12.3, -PI / 2, { inspect: 0.55, tag: { shelf: 0.25 } });
  decor(models.monitor({ w: 0.36, h: 0.21, screen: S.webcam, standH: 0.03 }), 3.52, 1.462, -10.45, -PI / 2);
  product('webcam-fhd', 3.56, 1.462 + 0.012 + 0.03 + 0.21 + 0.012, -10.45, -PI / 2, { inspect: 0.6, eye: 1.62, tag: { shelf: 0.35, dy: -0.266 } });

  const low = new THREE.Group();
  add(low, rbox(0.62, 0.5, 0.52, 0.012), M.oak, 0, 0.25, 0);
  decor(low, 2.35, 0, -15.0, -0.5);
  code({ group: low }, '05-C', 0, 0.3, 0.262);
  obCircle(2.35, -15.0, 0.5);
  product('imprimante-laser', 2.35, 0.5, -15.0, -0.5, { inspect: 0.85, tag: { shelf: 0.27 } });

  /* ================================================= 06 réseau */
  const demo = F.demoWall({ w: 4, h: 2.2, y0: 0.5, shelves: [[-1.1, 1.25, 1.1], [0.95, 1.0, 1.2]] });
  put(demo, 14.97, -9.3, -PI / 2);
  code(demo, '06-A', -1.8, 0.4, 0.052);
  obBox(14.8, -9.3, 0.3, 2.1);
  product('routeur-wifi6', 14.8, 1.26, -10.4, -PI / 2, { inspect: 0.65, tag: { shelf: 0.1 } });
  product('nas-2-baies', 14.8, 1.01, -8.35, -PI / 2, { inspect: 0.55, tag: { shelf: 0.1 } });
  for (const z of [-10.7, -7.95]) decor(models.build('point-acces'), 14.9, 2.2, z, -PI / 2);
  const mesh = new THREE.Group();
  for (const dz of [0, 0.13]) add(mesh, rbox(0.09, 0.15, 0.09, 0.025), M.whitePlastic, 0, 0.075, dz);
  decor(mesh, 14.8, 1.012, -7.98, -PI / 2);
  product('point-acces', 14.9, 1.75, -9.25, -PI / 2, { inspect: 0.6, eye: 1.62, pool: false, tag: { shelf: 0.06, dy: -0.02 } });

  const rack = put(F.rack(), 14.45, -13.6, -PI / 2);
  code(rack, '06-B', 0, 0.045, 0.452);
  obBox(14.45, -13.6, 0.5, 0.35);
  for (const y of [0.95, 1.1, 1.55]) decor(models.build('switch-24'), 14.45 - (rack.rails - 0.13), y, -13.6, -PI / 2);
  product('switch-24', 14.45 - (rack.rails - 0.13), 1.3, -13.6, -PI / 2, { inspect: 0.7, pool: false, tag: { shelf: 0.14, dy: -0.035 } });
  const rackLeds = makeRackLeds(M, 14.45 - (rack.rails - 0.13) - 0.131, [0.95, 1.1, 1.3, 1.55], -13.6);
  scene.add(rackLeds.mesh);

  for (const [x, w, seed] of [[12.8, 3.2, 7], [8.2, 2.4, 17]]) {
    endCodes(put(F.gondola({ w, h: 1.9, d: 0.45, levels: [0.4, 0.9, 1.4], seed }), x, -15.4, 0), x > 10 ? '06-D' : '06-E', w, 1.9, 0.2);
    obBox(x, -15.15, w / 2 + 0.1, 0.42);
  }

  const net = networkTerminal();
  const netScreen = F.wallScreen({ w: 1.3, h: 0.8, tex: net.texture });
  put(netScreen, STORE_EDGE_X - 0.04, -13.6, -PI / 2, 2.55);
  terminals.push({ terminal: net, pos: new THREE.Vector3(14.9, 2.55, -13.6), range: 6.5 });

  const spools = put(F.spoolRack({ w: 1.8 }), 7.3, -11.5, PI / 2);
  code(spools, '06-C', -0.9, 0.95, 0.03);
  obBox(7.3, -11.5, 0.35, 1.0);
  product('cable-cat6', 7.3, spools.rodY, -11.05, PI / 2, { inspect: 0.75, tag: { dz: 0.12, dy: -spools.rodY + spools.shelfY } });
  decor(models.build('cable-cat6'), 7.3, spools.rodY, -11.95, PI / 2);

  /* ================================================= cloisons basses entre les rayons */
  for (const sx of [-1, 1]) {
    put(F.gondola({ w: 9.4, h: 1.35, d: 0.42, levels: [0.35, 0.8], doubleSided: true, seed: 20 + sx }), sx * 5, 0.3, PI / 2);
    obBox(sx * 5, 0.3, 0.5, 4.8);
    put(F.gondola({ w: 7.6, h: 1.35, d: 0.42, levels: [0.35, 0.8], doubleSided: true, seed: 30 + sx }), sx * 5, -11.4, PI / 2);
    obBox(sx * 5, -11.4, 0.5, 3.85);
  }

  /* ================================================= 07 caisses */
  const till = put(F.checkoutCounter({ w: 5 }), 0, -19.4, 0);
  code(till, '07-A', -2.1, 0.75, 0.503);
  obBox(0, -19.4, 2.6, 0.62);
  const checkout = new CheckoutScreen();
  decor(models.monitor({ w: 0.5, h: 0.31, screen: checkout.texture, standH: 0.06 }), -1.0, till.top, -19.2, 0);
  terminals.push({ terminal: checkout, pos: new THREE.Vector3(-1, 1.3, -19.2), range: 7 });
  for (const sx of [-1, 1]) {
    put(F.wallShelves({ w: 5, levels: [0.9, 1.4, 1.9], seed: 40 + sx }), sx * 11.6, STORE_BACK_Z + 0.02, 0);
  }

  makeCodePlates(plates);

  /* étiquettes de prix, posées devant chaque produit */
  const tags = makePriceTags(M, tagRequests);
  statics.add(tags);

  const merged = mergeStatic(statics);
  scene.add(merged);

  return { products: placed, obstacles, terminals, rackLeds, checkout, merged };
}

const STORE_EDGE_X = 15;
const STORE_BACK_Z = -22;

/* boîtes posées sur le socle d'une vitrine, contre le fond */
function vitrineStock(F, fx, w, d, seed) {
  const g = new THREE.Group();
  g.position.set(0, 0, -d / 2 + 0.03);
  fx.group.add(g);
  F.fillShelves(g, { w: w - 0.25, d: d - 0.12, levels: [0.405], sides: [1], seed });
}

/* ------------------------------------------------ voyants du rack réseau */
function makeRackLeds(M, x, rows, z) {
  const perRow = 24;
  const count = rows.length * perRow;
  const geo = new THREE.PlaneGeometry(0.004, 0.003);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }), count);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -PI / 2, 0));
  const color = new THREE.Color();
  const states = [];
  let i = 0;
  for (const y of rows) {
    for (let p = 0; p < perRow; p++) {
      // un voyant au-dessus (rangée haute) ou au-dessous (rangée basse) de chaque port
      const col = p % 12, row = Math.floor(p / 12);
      const lz = -0.22 + 0.107 + col * 0.0232 + 0.009;
      m4.compose(new THREE.Vector3(x - 0.0005, y + (row ? 0.0035 : 0.0415), z + lz), q, new THREE.Vector3(1, 1, 1));
      mesh.setMatrixAt(i, m4);
      const active = ((p * 7 + Math.round(y * 10)) % 5) !== 0;
      states.push({ active, rate: 0.05 + ((p * 13) % 7) / 20 });
      mesh.setColorAt(i, color.set(active ? 0x5CD694 : 0x2B2D31));
      i++;
    }
  }
  let acc = 0;
  return {
    mesh,
    update(dt) {
      acc += dt;
      if (acc < 0.09) return;
      acc = 0;
      for (let k = 0; k < count; k++) {
        const s = states[k];
        if (!s.active) continue;
        const blink = Math.random() < s.rate;
        mesh.setColorAt(k, color.set(blink ? 0xF6A623 : 0x5CD694));
      }
      mesh.instanceColor.needsUpdate = true;
    }
  };
}

/* ------------------------------------------------ plaques de code d'emplacement (un seul atlas) */
function makeCodePlates(requests) {
  const cols = 8, cw = 256, chh = 96;
  const { c, ctx } = canvas(cols * cw, Math.max(1, Math.ceil(requests.length / cols)) * chh);
  const mat = new THREE.MeshStandardMaterial({ map: toTexture(c, { aniso: 8 }), roughness: 0.6 });
  requests.forEach((req, i) => {
    const x0 = (i % cols) * cw, y0 = Math.floor(i / cols) * chh;
    ctx.fillStyle = '#26272B';
    ctx.fillRect(x0, y0, cw, chh);
    ctx.strokeStyle = 'rgba(203,163,90,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x0 + 5, y0 + 5, cw - 10, chh - 10);
    ctx.fillStyle = INK.brass;
    ctx.beginPath(); ctx.arc(x0 + 20, y0 + 20, 4, 0, PI * 2); ctx.fill();
    setFont(ctx, FONT.mono, 44, 500, 4);
    ctx.textAlign = 'center';
    ctx.fillText(req.text, x0 + cw / 2 + 8, y0 + 66);
    ctx.textAlign = 'left';
    const geo = new THREE.PlaneGeometry(0.19, 0.071);
    const uv = geo.attributes.uv;
    const u0 = x0 / c.width, u1 = (x0 + cw) / c.width, v1 = 1 - y0 / c.height, v0 = 1 - (y0 + chh) / c.height;
    uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(req.lx, req.ly, req.lz);
    m.rotation.y = req.lry;
    m.userData.noShadow = true;
    req.group.add(m);
  });
}

/* ------------------------------------------------ étiquettes de prix (un seul atlas, un seul maillage) */
function makePriceTags(M, requests) {
  const cols = 8, cw = 256, chh = 128;
  const rows = Math.ceil(requests.length / cols);
  const { c, ctx } = canvas(cols * cw, Math.max(1, rows) * chh);
  const group = new THREE.Group();
  const tex = toTexture(c, { aniso: 8 });
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 });

  requests.forEach((req, i) => {
    const x0 = (i % cols) * cw, y0 = Math.floor(i / cols) * chh;
    const { data, zone } = req.entry;
    ctx.fillStyle = '#F6F4F0';
    ctx.fillRect(x0, y0, cw, chh);
    ctx.fillStyle = INK.graphite;
    ctx.fillRect(x0, y0 + chh - 10, cw, 10);
    setFont(ctx, FONT.mono, 13, 500, 1);
    ctx.fillStyle = '#9A7A3E';
    ctx.fillText(zone.code + ' · ' + data.ref, x0 + 14, y0 + 24);
    setFont(ctx, FONT.sign, 22, 700, 0.5);
    ctx.fillStyle = INK.graphite;
    let name = data.name;
    while (ctx.measureText(name).width > cw - 28 && name.length > 4) name = name.slice(0, -2);
    if (name !== data.name) name = name.trimEnd() + '…';
    ctx.fillText(name, x0 + 14, y0 + 54);
    setFont(ctx, FONT.ui, 34, 700, 0);
    ctx.fillText(formatPrice(data.price), x0 + 14, y0 + 100);

    // géométrie de la carte, avec les bonnes coordonnées dans l'atlas
    const w = 0.12, h = 0.06;
    const geo = new THREE.PlaneGeometry(w, h);
    const uv = geo.attributes.uv;
    const u0 = x0 / c.width, u1 = (x0 + cw) / c.width;
    const v1 = 1 - y0 / c.height, v0 = 1 - (y0 + chh) / c.height;
    uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0);

    const card = new THREE.Group();
    const face = new THREE.Mesh(geo, mat);
    face.position.z = 0.002;
    card.add(face);
    add(card, box(w + 0.004, h + 0.004, 0.003), M.graphite, 0, 0, 0);

    const f = new THREE.Vector3(Math.sin(req.ry), 0, Math.cos(req.ry));
    const side = new THREE.Vector3(Math.cos(req.ry), 0, -Math.sin(req.ry));
    const forward = req.dz ?? (req.shelf ? req.shelf : req.reach + 0.08);
    const lateral = req.side ?? 0;
    const pos = new THREE.Vector3(req.x, req.y + (req.dy ?? 0), req.z)
      .addScaledVector(f, forward).addScaledVector(side, lateral);
    if (req.shelf) {
      // collée sur le chant de la tablette
      card.position.copy(pos).setY(pos.y - 0.03);
      card.rotation.set(0, req.ry, 0);
    } else {
      // petit chevalet posé devant le produit
      card.position.copy(pos).setY(pos.y + 0.035);
      card.rotation.set(-0.35, req.ry, 0, 'YXZ');
      add(card, box(0.004, 0.05, 0.004), M.graphite, 0, -0.03, -0.012);
    }
    group.add(card);
  });
  tex.needsUpdate = true;
  return group;
}

export { EYE };
