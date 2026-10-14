/* =============================================================
   Modèles des produits. Chaque modèle a son origine au centre de
   sa base, posé sur son support, face avant vers +z.
   Tous sont modélisés à partir de volumes simples et de textures
   dessinées en canvas : aucune image à télécharger.
   ============================================================= */
import * as THREE from 'three';
import { add, rbox, box, cyl, plane } from './kit.js';
import { keysTexture, portsTexture, fanTexture, labelTexture, grilleTexture, displayTexture } from './textures.js';

const PI = Math.PI;

export function createModels(M, screens) {
  const cache = new Map();
  const matFor = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
  const screenMat = (tex) => matFor(tex.uuid, () => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  const texMat = (tex, rough = 0.6) => matFor('t' + tex.uuid, () => new THREE.MeshStandardMaterial({ map: tex, roughness: rough }));

  const keysDark = keysTexture();
  const keysSilver = keysTexture('#B9BDC1', '#2A2C30', 'rgba(255,255,255,0.4)');
  const keysGaming = keysTexture('#141517', '#1E2024', null, 'rgba(255,214,160,0.85)');
  const fanTex = fanTexture();
  const fanMat = new THREE.MeshBasicMaterial({ map: fanTex, transparent: true, color: 0x9A9A9A });
  const ports = portsTexture();
  const grilleDark = grilleTexture('#1E1F22', '#0C0D0E');
  const coolerDisplay = displayTexture('CPU 42°C');
  const coolerBoxArt = labelTexture(['120 mm', 'VENTIRAD'], { w: 304, h: 400 });
  // verre d'objectif : sombre et brillant, il accroche les reflets de la salle
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x101218, roughness: 0.08, metalness: 0.5 });
  const trackpad = {
    dark: new THREE.MeshStandardMaterial({ color: 0x232427, roughness: 0.35 }),
    silver: new THREE.MeshStandardMaterial({ color: 0xB4B8BC, roughness: 0.3, metalness: 0.5 })
  };

  const spin = [];   // pales qui tournent (ventilateurs)

  /* ------------------------------------------------ portables */
  function laptop({ w = 0.36, d = 0.245, finish = 'black', screen, keys, open = 1.95 }) {
    const g = new THREE.Group();
    const shell = finish === 'silver' ? M.silver : finish === 'graphite' ? M.graphite : M.black;
    const t = 0.017;
    add(g, rbox(w, t, d, 0.006), shell, 0, t / 2, 0);
    add(g, plane(w * 0.86, d * 0.44), texMat(keys || (finish === 'silver' ? keysSilver : keysDark), 0.7), 0, t + 0.0007, -d * 0.1, -PI / 2);
    add(g, plane(w * 0.33, d * 0.25), finish === 'silver' ? trackpad.silver : trackpad.dark, 0, t + 0.0007, d * 0.28, -PI / 2);
    const hinge = new THREE.Group();
    hinge.position.set(0, t, -d / 2 + 0.005);
    hinge.rotation.x = -(open - PI / 2);
    g.add(hinge);
    add(hinge, rbox(w, d * 0.97, 0.007, 0.0045), shell, 0, d * 0.485, 0);
    add(hinge, plane(w * 0.935, d * 0.88), M.black, 0, d * 0.49, 0.0036);
    add(hinge, plane(w * 0.9, d * 0.8), screenMat(screen), 0, d * 0.5, 0.0038);
    return g;
  }

  function laptopStand() {
    const g = new THREE.Group();
    add(g, rbox(0.25, 0.006, 0.22, 0.003), M.alu, 0, 0.003, 0);
    const top = add(g, rbox(0.25, 0.006, 0.24, 0.003), M.alu, 0, 0.075, -0.01);
    top.rotation.x = 0.42;
    add(g, rbox(0.012, 0.13, 0.012, 0.004), M.alu, -0.1, 0.06, -0.07, -0.5);
    add(g, rbox(0.012, 0.13, 0.012, 0.004), M.alu, 0.1, 0.06, -0.07, -0.5);
    add(g, rbox(0.23, 0.012, 0.012, 0.004), M.alu, 0, 0.012, 0.12);
    return g;
  }

  function sleeve() {
    const g = new THREE.Group();
    add(g, rbox(0.36, 0.022, 0.26, 0.01), M.felt, 0, 0.011, 0);
    add(g, box(0.34, 0.004, 0.004), M.aluDark, 0, 0.021, -0.12);
    add(g, rbox(0.2, 0.004, 0.12, 0.002), M.felt, 0.02, 0.023, 0.04);
    return g;
  }

  /* ------------------------------------------------ écrans */
  function monitor({ w = 0.62, h = 0.355, screen, standH = 0.11 }) {
    const g = new THREE.Group();
    add(g, rbox(0.26, 0.012, 0.2, 0.004), M.graphite, 0, 0.006, -0.02);
    add(g, rbox(0.05, standH + h * 0.5, 0.028, 0.006), M.graphite, 0, 0.012 + (standH + h * 0.5) / 2, -0.07);
    const cy = 0.012 + standH + h / 2;
    add(g, rbox(w + 0.018, h + 0.018, 0.026, 0.006), M.black, 0, cy, -0.045);
    add(g, plane(w, h), screenMat(screen), 0, cy, -0.045 + 0.0135);
    return g;
  }

  /* ------------------------------------------------ PC gaming : boîtier panoramique */
  function pcTower() {
    const g = new THREE.Group();
    const cw = 0.24, ch = 0.49, cd = 0.46;
    add(g, rbox(cw, 0.03, cd, 0.006), M.black, 0, 0.035, 0);
    add(g, rbox(cw, 0.03, cd, 0.006), M.black, 0, ch - 0.015 + 0.02, 0);
    add(g, rbox(cw, ch, 0.02, 0.004), M.black, 0, ch / 2 + 0.02, -cd / 2 + 0.01);
    add(g, rbox(0.014, ch, cd, 0.004), M.black, cw / 2 - 0.007, ch / 2 + 0.02, 0);
    add(g, rbox(0.016, ch, 0.016, 0.004), M.black, -cw / 2 + 0.008, ch / 2 + 0.02, cd / 2 - 0.008);
    for (const [x, z] of [[-0.09, 0.19], [0.09, 0.19], [-0.09, -0.19], [0.09, -0.19]]) add(g, cyl(0.014, 0.016, 0.02, 12), M.rubber, x, 0.01, z);
    // verre avant et latéral
    const gf = add(g, plane(cw - 0.03, ch - 0.04), M.glass, -0.007, ch / 2 + 0.02, cd / 2 - 0.002);
    const gs = add(g, plane(cd - 0.03, ch - 0.04), M.glass, -cw / 2 + 0.002, ch / 2 + 0.02, 0, 0, -PI / 2);
    gf.userData.noMerge = gs.userData.noMerge = true;
    // intérieur visible
    add(g, box(0.004, 0.3, 0.3), M.pcb, cw / 2 - 0.02, 0.32, -0.04);
    add(g, rbox(0.12, 0.045, 0.3, 0.006), M.graphite, 0.035, 0.2, -0.02);
    add(g, box(0.004, 0.012, 0.26), M.ledWarm, -0.026, 0.2, -0.02);
    add(g, cyl(0.035, 0.035, 0.06, 20), M.aluDark, 0.07, 0.36, -0.06, 0, 0, PI / 2);
    for (const z of [-0.14, -0.125]) add(g, box(0.03, 0.1, 0.005), M.black, 0.08, 0.34, z);
    add(g, box(0.034, 0.004, 0.02), M.ledWhite, 0.08, 0.392, -0.132);
    // ventilateurs : anneau lumineux blanc chaud, pales qui tournent
    const fan = (x, y, z, rx, ry) => {
      const f = new THREE.Group();
      f.position.set(x, y, z); f.rotation.set(rx, ry, 0);
      add(f, new THREE.TorusGeometry(0.058, 0.004, 6, 40), M.ledWarm);
      const blades = add(f, new THREE.CircleGeometry(0.054, 24), fanMat, 0, 0, 0.001);
      blades.userData.noMerge = true;
      spin.push(blades);
      add(f, rbox(0.125, 0.125, 0.012, 0.01), M.black, 0, 0, -0.008);
      g.add(f);
    };
    for (const y of [0.13, 0.265, 0.4]) fan(-0.005, y, cd / 2 - 0.03, 0, 0);
    fan(0.0, 0.3, -cd / 2 + 0.035, 0, PI);
    for (const z of [0.07, -0.08]) fan(0.0, ch - 0.01, z, -PI / 2, 0);
    return g;
  }

  function pedestal() {
    const g = new THREE.Group();
    add(g, rbox(0.8, 0.46, 0.8, 0.02), M.graphite, 0, 0.23, 0);
    add(g, box(0.82, 0.012, 0.82), M.brass, 0, 0.466, 0);
    return g;
  }

  /* ------------------------------------------------ gaming */
  function chair() {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2;
      const leg = add(g, rbox(0.3, 0.03, 0.05, 0.01), M.blackMatte, Math.cos(a) * 0.15, 0.07, Math.sin(a) * 0.15);
      leg.rotation.y = -a;
      add(g, new THREE.SphereGeometry(0.026, 12, 8), M.rubber, Math.cos(a) * 0.3, 0.026, Math.sin(a) * 0.3);
    }
    add(g, cyl(0.024, 0.028, 0.32, 16), M.aluDark, 0, 0.24, 0);
    add(g, rbox(0.52, 0.09, 0.5, 0.03), M.fabric, 0, 0.46, 0.02);
    const back = add(g, rbox(0.5, 0.78, 0.09, 0.035), M.fabric, 0, 0.9, -0.23);
    back.rotation.x = -0.17;
    add(g, rbox(0.3, 0.12, 0.06, 0.03), M.graphite, 0, 1.2, -0.3, -0.17);
    add(g, rbox(0.34, 0.1, 0.05, 0.025), M.graphite, 0, 0.7, -0.19, -0.17);
    for (const s of [-1, 1]) {
      add(g, rbox(0.04, 0.2, 0.04, 0.01), M.blackMatte, s * 0.29, 0.56, -0.02);
      add(g, rbox(0.07, 0.03, 0.26, 0.012), M.blackMatte, s * 0.29, 0.67, 0.0);
    }
    return g;
  }

  function headset() {
    const g = new THREE.Group();
    add(g, cyl(0.06, 0.07, 0.012, 28), M.graphite, 0, 0.006, 0);
    add(g, cyl(0.009, 0.009, 0.26, 12), M.aluDark, 0, 0.14, 0);
    add(g, rbox(0.1, 0.014, 0.032, 0.006), M.graphite, 0, 0.276, 0);
    add(g, new THREE.TorusGeometry(0.09, 0.013, 10, 36, PI), M.black, 0, 0.2, 0);
    for (const s of [-1, 1]) {
      add(g, cyl(0.048, 0.048, 0.036, 28), M.black, s * 0.095, 0.165, 0, 0, 0, PI / 2);
      add(g, cyl(0.041, 0.041, 0.016, 28), M.fabric, s * 0.07, 0.165, 0, 0, 0, PI / 2);
    }
    add(g, cyl(0.004, 0.004, 0.13, 8), M.black, -0.12, 0.11, 0.05, 0.9, 0, 0.3);
    return g;
  }

  function controller() {
    const g = new THREE.Group();
    add(g, rbox(0.022, 0.012, 0.02, 0.004), M.acrylic, 0, 0.006, 0);
    const body = new THREE.Group();
    body.position.set(0, 0.03, 0);
    body.rotation.x = 0.35;
    g.add(body);
    add(body, rbox(0.15, 0.036, 0.072, 0.016), M.black, 0, 0, 0);
    for (const s of [-1, 1]) {
      add(body, new THREE.CapsuleGeometry(0.024, 0.05, 4, 12), M.black, s * 0.055, -0.006, 0.035, PI / 2 + 0.3, 0, s * 0.35);
    }
    add(body, cyl(0.012, 0.011, 0.012, 16), M.rubber, -0.038, 0.022, -0.008);
    add(body, cyl(0.012, 0.011, 0.012, 16), M.rubber, 0.022, 0.022, 0.018);
    for (const [x, z] of [[0.05, -0.02], [0.062, -0.008], [0.038, -0.008], [0.05, 0.004]]) add(body, new THREE.SphereGeometry(0.0055, 10, 8), M.greyPlastic, x, 0.02, z);
    add(body, box(0.024, 0.004, 0.008), M.greyPlastic, -0.028 - 0.02, 0.02, 0.015);
    add(body, box(0.008, 0.004, 0.024), M.greyPlastic, -0.028 - 0.02, 0.02, 0.015);
    return g;
  }

  /* ------------------------------------------------ mobile */
  function standingDevice({ w, h, t = 0.008, shell = M.black, screen, tilt = 0.26, cam = true }) {
    const g = new THREE.Group();
    add(g, rbox(w + 0.03, 0.012, 0.09, 0.004), M.acrylic, 0, 0.006, 0);
    const dev = new THREE.Group();
    dev.position.set(0, 0.014, 0.01);
    dev.rotation.x = -tilt;
    g.add(dev);
    add(dev, rbox(w, h, t, Math.min(0.009, w * 0.12)), shell, 0, h / 2, 0);
    add(dev, plane(w - 0.006, h - 0.008), screenMat(screen), 0, h / 2, t / 2 + 0.0004);
    if (cam) add(dev, rbox(0.028, 0.03, 0.004, 0.006), shell, -w / 2 + 0.02, h - 0.024, -t / 2 - 0.0015);
    add(g, rbox(w * 0.6, 0.012, 0.012, 0.004), M.acrylic, 0, 0.016, 0.02);
    return g;
  }

  function powerbank() {
    const g = new THREE.Group();
    add(g, rbox(0.072, 0.145, 0.017, 0.007), M.greyPlastic, 0, 0.0725, 0);
    for (let i = 0; i < 4; i++) add(g, plane(0.006, 0.003), i < 3 ? M.ledWhite : M.greyPlastic, -0.012 + i * 0.008, 0.02, 0.0087);
    add(g, box(0.02, 0.004, 0.006), M.black, 0, 0.144, 0);
    return g;
  }

  function charger() {
    const g = new THREE.Group();
    add(g, rbox(0.05, 0.056, 0.032, 0.009), M.whitePlastic, 0, 0.028, 0);
    for (const y of [0.03, 0.017]) add(g, rbox(0.009, 0.004, 0.002, 0.0015), M.graphite, 0, y, 0.0165);
    add(g, new THREE.TorusGeometry(0.03, 0.0035, 6, 28), M.whitePlastic, 0.07, 0.004, 0.0, PI / 2);
    add(g, new THREE.TorusGeometry(0.024, 0.0035, 6, 28), M.whitePlastic, 0.07, 0.011, 0.0, PI / 2);
    return g;
  }

  function hub() {
    const g = new THREE.Group();
    add(g, rbox(0.125, 0.015, 0.042, 0.005), M.silver, 0, 0.0075, 0);
    for (let i = 0; i < 4; i++) add(g, box(0.012, 0.005, 0.002), M.black, -0.04 + i * 0.022, 0.0075, 0.021);
    add(g, cyl(0.003, 0.003, 0.09, 6), M.graphite, -0.1, 0.006, 0, 0, 0, PI / 2);
    return g;
  }

  /* ------------------------------------------------ composants */
  function gpu() {
    const g = new THREE.Group();
    add(g, rbox(0.1, 0.012, 0.06, 0.004), M.acrylic, 0, 0.006, 0);
    const card = new THREE.Group();
    card.position.y = 0.012;
    g.add(card);
    add(card, rbox(0.31, 0.125, 0.048, 0.008), M.graphite, 0, 0.0625, 0);
    add(card, rbox(0.3, 0.12, 0.004, 0.002), M.aluDark, 0, 0.0625, -0.026);
    for (const x of [-0.1, 0, 0.1]) {
      add(card, new THREE.TorusGeometry(0.043, 0.004, 6, 36), M.aluDark, x, 0.0625, 0.025);
      add(card, new THREE.CircleGeometry(0.04, 24), fanMat, x, 0.0625, 0.0245).userData.noMerge = true;
    }
    add(card, box(0.26, 0.004, 0.03), M.ledWarm, 0, 0.126, 0);
    add(card, box(0.09, 0.008, 0.003), M.gold, -0.06, 0.004, 0);
    return g;
  }

  function cpu() {
    const g = new THREE.Group();
    add(g, rbox(0.08, 0.012, 0.07, 0.004), M.acrylic, 0, 0.006, 0);
    const chip = new THREE.Group();
    chip.position.set(0, 0.045, 0);
    chip.rotation.x = 1.1;
    g.add(chip);
    add(chip, rbox(0.07, 0.008, 0.07, 0.004), M.acrylic, 0, 0, 0);
    add(chip, box(0.045, 0.003, 0.045), M.pcb, 0, 0.005, 0);
    add(chip, rbox(0.036, 0.004, 0.036, 0.003), M.silver, 0, 0.0085, 0);
    add(g, rbox(0.012, 0.06, 0.01, 0.003), M.acrylic, 0, 0.03, -0.02, 0.3);
    return g;
  }

  function ram() {
    const g = new THREE.Group();
    add(g, rbox(0.15, 0.012, 0.05, 0.004), M.acrylic, 0, 0.006, 0);
    for (const z of [-0.008, 0.008]) {
      add(g, rbox(0.133, 0.034, 0.007, 0.002), M.black, 0, 0.031, z);
      add(g, box(0.13, 0.004, 0.0072), M.ledWhite, 0, 0.049, z);
      add(g, box(0.12, 0.004, 0.0074), M.gold, 0, 0.014, z);
    }
    return g;
  }

  function ssd() {
    const g = new THREE.Group();
    add(g, rbox(0.1, 0.012, 0.05, 0.004), M.acrylic, 0, 0.006, 0);
    const s = new THREE.Group();
    s.position.set(0, 0.03, 0);
    s.rotation.x = 1.15;
    g.add(s);
    add(s, box(0.08, 0.0022, 0.022), M.pcb, 0, 0, 0);
    add(s, rbox(0.016, 0.002, 0.016, 0.001), M.black, -0.02, 0.002, 0);
    add(s, rbox(0.016, 0.002, 0.016, 0.001), M.black, 0.005, 0.002, 0);
    add(s, box(0.007, 0.0024, 0.018), M.gold, 0.037, 0, 0);
    add(s, plane(0.05, 0.016), texMat(labelTexture(['2 To', 'NVMe PCIe 4.0'], { w: 256, h: 96, bg: '#1F2023', ink: '#F4F2EE' })), -0.012, 0.0036, 0, -PI / 2);
    add(g, rbox(0.012, 0.05, 0.008, 0.003), M.acrylic, 0, 0.025, -0.015, 0.4);
    return g;
  }

  function psu() {
    const g = new THREE.Group();
    add(g, rbox(0.15, 0.086, 0.16, 0.006), M.black, 0, 0.043, 0);
    add(g, new THREE.CircleGeometry(0.058, 32), texMat(grilleDark, 0.6), 0, 0.0865, 0, -PI / 2);
    add(g, new THREE.TorusGeometry(0.058, 0.003, 6, 36), M.aluDark, 0, 0.087, 0, PI / 2);
    add(g, plane(0.12, 0.05), texMat(labelTexture(['850 W', '80 PLUS GOLD · MODULAIRE'], { w: 384, h: 160, bg: '#1F2023', ink: '#F4F2EE' })), 0, 0.043, 0.0801);
    return g;
  }

  /* ------------------------------------------------ périphériques */
  function mic() {
    const g = new THREE.Group();
    add(g, cyl(0.05, 0.056, 0.016, 28), M.graphite, 0, 0.008, 0);
    add(g, cyl(0.008, 0.008, 0.07, 12), M.aluDark, 0, 0.05, 0);
    add(g, cyl(0.032, 0.032, 0.1, 28), M.black, 0, 0.13, 0);
    add(g, cyl(0.0325, 0.0325, 0.075, 28), M.grille, 0, 0.215, 0);
    add(g, new THREE.SphereGeometry(0.0325, 20, 10, 0, PI * 2, 0, PI / 2), M.grille, 0, 0.2525, 0);
    add(g, plane(0.012, 0.012), M.ledGreen, 0, 0.12, 0.0326);
    return g;
  }

  function printer() {
    const g = new THREE.Group();
    add(g, rbox(0.4, 0.2, 0.36, 0.02), M.whitePlastic, 0, 0.1, 0);
    add(g, rbox(0.36, 0.012, 0.28, 0.005), M.greyPlastic, 0, 0.2, -0.02);
    add(g, box(0.3, 0.012, 0.01), M.graphite, 0, 0.16, 0.176);
    add(g, rbox(0.32, 0.02, 0.12, 0.006), M.greyPlastic, 0, 0.035, 0.22);
    add(g, rbox(0.1, 0.04, 0.012, 0.004), M.graphite, 0.12, 0.2, 0.14, -0.6);
    add(g, plane(0.06, 0.022), M.ledWhite, 0.12, 0.203, 0.147, -0.6);
    return g;
  }

  /* ------------------------------------------------ réseau */
  function router() {
    const g = new THREE.Group();
    add(g, rbox(0.26, 0.036, 0.17, 0.01), M.black, 0, 0.018 + 0.012, 0);
    for (const x of [-0.1, 0.1]) add(g, rbox(0.03, 0.012, 0.12, 0.004), M.rubber, x, 0.006, 0);
    for (const x of [-0.105, -0.035, 0.035, 0.105]) {
      const a = add(g, rbox(0.018, 0.16, 0.008, 0.004), M.black, x, 0.048 + 0.08, -0.08);
      a.rotation.z = x * 0.8;
    }
    for (let i = 0; i < 6; i++) add(g, plane(0.006, 0.004), i === 0 ? M.ledWhite : M.ledGreen, -0.05 + i * 0.02, 0.03, 0.0851);
    return g;
  }

  function accessPoint() {
    const g = new THREE.Group();
    const d = new THREE.Group();
    d.position.set(0, 0.1, 0);
    d.rotation.x = PI / 2;
    g.add(d);
    add(d, cyl(0.1, 0.105, 0.03, 48), M.whitePlastic, 0, 0, 0);
    add(d, new THREE.TorusGeometry(0.028, 0.0035, 6, 32), M.ledCyan, 0, 0.0155, 0, PI / 2);
    add(g, rbox(0.12, 0.012, 0.03, 0.004), M.aluDark, 0, 0.006, -0.01);
    return g;
  }

  function switch24() {
    const g = new THREE.Group();
    add(g, box(0.44, 0.044, 0.26), M.black, 0, 0.022, 0);
    add(g, plane(0.44, 0.044), texMat(ports, 0.7), 0, 0.022, 0.1301);
    for (const s of [-1, 1]) add(g, box(0.02, 0.044, 0.004), M.aluDark, s * 0.23, 0.022, 0.128);
    return g;
  }

  function nas() {
    const g = new THREE.Group();
    add(g, rbox(0.105, 0.17, 0.22, 0.008), M.black, 0, 0.085, 0);
    for (const x of [-0.024, 0.024]) {
      add(g, rbox(0.044, 0.13, 0.004, 0.003), M.graphite, x, 0.09, 0.111);
      add(g, plane(0.004, 0.004), M.ledGreen, x, 0.145, 0.1135);
    }
    add(g, plane(0.006, 0.006), M.ledWhite, 0, 0.16, 0.1105);
    return g;
  }

  function spool() {
    const g = new THREE.Group();
    const c = new THREE.Group();
    c.position.y = 0.17;
    c.rotation.z = PI / 2;
    g.add(c);
    for (const y of [-0.08, 0.08]) add(c, cyl(0.17, 0.17, 0.012, 36), M.spoolWood, 0, y, 0);
    add(c, cyl(0.13, 0.13, 0.148, 36), M.cable, 0, 0, 0);
    add(c, cyl(0.03, 0.03, 0.2, 12), M.aluDark, 0, 0, 0);
    add(g, plane(0.09, 0.05), texMat(labelTexture(['CAT 6', '30 m · U/UTP'], { w: 256, h: 128 })), 0.0875, 0.17, 0, 0, PI / 2);
    return g;
  }

  /* ------------------------------------------------ claviers : posés à plat, l'arrière relevé par une cale en acrylique */
  function keyboard({ w, d, keys, shell = M.black, h = 0.016, tilt = 0.1, knob = false, glow = false }) {
    const g = new THREE.Group();
    const lift = (d / 2) * Math.sin(tilt) + 0.002;
    const kb = new THREE.Group();
    kb.position.set(0, lift, 0);
    kb.rotation.x = tilt;
    g.add(kb);
    add(kb, rbox(w, h, d, 0.005), shell, 0, h / 2, 0);
    const kw = knob ? w * 0.86 : w * 0.93;
    add(kb, plane(kw, d * 0.84), texMat(keys, 0.7), knob ? -w * 0.04 : 0, h + 0.0006, d * 0.03, -PI / 2);
    if (knob) add(kb, cyl(0.009, 0.009, 0.012, 20), M.aluDark, w * 0.44, h + 0.006, -d * 0.3);
    if (glow) add(kb, box(w * 0.8, 0.002, 0.004), M.ledWarm, 0, h + 0.001, -d / 2 + 0.006);
    const wedge = lift + d * 0.35 * Math.sin(tilt);
    add(g, rbox(w * 0.9, wedge, 0.04, 0.003), M.acrylic, 0, wedge / 2, -d * 0.35);
    return g;
  }

  /* ------------------------------------------------ hybride plein format et son zoom, sur socle */
  function camera() {
    const g = new THREE.Group();
    add(g, rbox(0.15, 0.03, 0.17, 0.006), M.graphite, 0, 0.015, 0.02);
    add(g, box(0.14, 0.003, 0.004), M.brass, 0, 0.026, 0.105);
    const y0 = 0.03, bw = 0.128, bh = 0.088, bd = 0.042, bz = -0.035;
    add(g, rbox(bw, bh, bd, 0.008), M.black, 0, y0 + bh / 2, bz);
    add(g, rbox(0.034, bh * 0.92, 0.062, 0.012), M.rubber, -bw / 2 + 0.017, y0 + bh * 0.46, bz + 0.005);   // poignée
    add(g, rbox(0.046, 0.026, 0.05, 0.006), M.black, 0, y0 + bh + 0.011, bz - 0.003);                      // viseur
    for (const x of [0.03, 0.048]) add(g, cyl(0.008, 0.008, 0.008, 18), M.aluDark, x, y0 + bh + 0.004, bz + 0.005);
    // objectif : monture, fût, bague de zoom, pare-soleil, lentille frontale
    const ly = y0 + 0.046, lz = bz + bd / 2;
    add(g, cyl(0.03, 0.03, 0.006, 32), M.aluDark, 0, ly, lz + 0.003, PI / 2);
    add(g, cyl(0.039, 0.037, 0.05, 32), M.black, 0, ly, lz + 0.031, PI / 2);
    add(g, cyl(0.041, 0.041, 0.03, 32), M.rubber, 0, ly, lz + 0.04, PI / 2);
    add(g, cyl(0.04, 0.04, 0.035, 32), M.black, 0, ly, lz + 0.074, PI / 2);
    add(g, new THREE.TorusGeometry(0.036, 0.003, 8, 36), M.aluDark, 0, ly, lz + 0.0915);
    add(g, new THREE.CircleGeometry(0.034, 32), lensMat, 0, ly, lz + 0.0918);
    return g;
  }

  /* ------------------------------------------------ caméra de poche : poignée à écran, nacelle au sommet */
  function pocketCam() {
    const g = new THREE.Group();
    add(g, rbox(0.07, 0.012, 0.06, 0.004), M.acrylic, 0, 0.006, 0);
    const hh = 0.09, top = 0.012 + hh;
    add(g, rbox(0.034, hh, 0.028, 0.009), M.black, 0, 0.012 + hh / 2, 0);
    add(g, plane(0.022, 0.024), screenMat(S.wall.tide), 0, 0.012 + hh * 0.72, 0.0141);
    for (const [x, m] of [[-0.007, M.graphite], [0.007, M.rubber]]) add(g, cyl(0.0045, 0.0045, 0.002, 16), m, x, 0.012 + hh * 0.4, 0.0145, PI / 2);
    add(g, rbox(0.014, 0.012, 0.014, 0.003), M.black, 0, top + 0.006, 0);
    add(g, rbox(0.006, 0.034, 0.016, 0.002), M.black, 0.016, top + 0.024, 0);
    add(g, rbox(0.026, 0.024, 0.026, 0.007), M.black, 0, top + 0.03, 0.002);
    add(g, cyl(0.0075, 0.0075, 0.004, 20), M.aluDark, 0, top + 0.03, 0.016, PI / 2);
    add(g, new THREE.CircleGeometry(0.0055, 20), lensMat, 0, top + 0.03, 0.0182);
    return g;
  }

  /* ------------------------------------------------ ventirad tour : caloducs, ailettes, ventilateur, afficheur */
  function towerCooler() {
    const g = new THREE.Group();
    const fw = 0.12, fh = 0.12, fd = 0.05, y0 = 0.034;
    add(g, rbox(0.045, 0.012, 0.045, 0.003), M.aluDark, 0, 0.006, 0);
    const pipe = y0 + fh - 0.01;
    for (const x of [-0.021, -0.007, 0.007, 0.021]) add(g, cyl(0.003, 0.003, pipe, 10), M.brass, x, 0.006 + pipe / 2, 0);
    add(g, box(fw, fh, fd), M.alu, 0, y0 + fh / 2, 0);
    for (let i = 1; i < 12; i++) add(g, box(fw + 0.001, 0.0015, fd + 0.001), M.aluDark, 0, y0 + i * (fh / 12), 0);
    add(g, rbox(fw + 0.004, fh + 0.004, 0.024, 0.01), M.graphite, 0, y0 + fh / 2, fd / 2 + 0.012);
    add(g, new THREE.TorusGeometry(0.058, 0.0035, 6, 36), M.aluDark, 0, y0 + fh / 2, fd / 2 + 0.024);
    add(g, new THREE.CircleGeometry(0.055, 32), fanMat, 0, y0 + fh / 2, fd / 2 + 0.0245).userData.noMerge = true;
    add(g, rbox(fw + 0.004, 0.016, fd + 0.026, 0.004), M.black, 0, y0 + fh + 0.008, 0.012);
    add(g, plane(0.06, 0.012), screenMat(coolerDisplay), 0, y0 + fh + 0.008, 0.012 + (fd + 0.026) / 2 + 0.0004);
    return g;
  }

  /* sa boîte, pour les doubles en réserve à côté du modèle exposé */
  function coolerBox() {
    const g = new THREE.Group();
    add(g, rbox(0.13, 0.17, 0.1, 0.002), M.whitePlastic, 0, 0.085, 0);
    add(g, plane(0.126, 0.166), texMat(coolerBoxArt, 0.75), 0, 0.085, 0.0502);
    return g;
  }

  /* ------------------------------------------------ webcams */
  /* posée sur le haut d'un écran : la pince descend derrière la dalle */
  function webcamBar() {
    const g = new THREE.Group();
    add(g, rbox(0.032, 0.006, 0.036, 0.002), M.black, 0, 0, -0.004);
    add(g, rbox(0.03, 0.05, 0.005, 0.002), M.black, 0, -0.024, -0.022);
    add(g, rbox(0.096, 0.03, 0.03, 0.008), M.black, 0, 0.018, 0.004);
    add(g, cyl(0.0125, 0.0125, 0.006, 28), M.black, 0, 0.018, 0.019, PI / 2);
    add(g, new THREE.TorusGeometry(0.0115, 0.002, 8, 28), M.aluDark, 0, 0.018, 0.022);
    add(g, new THREE.CircleGeometry(0.0105, 28), lensMat, 0, 0.018, 0.0222);
    for (const x of [-0.034, 0.034]) add(g, plane(0.014, 0.01), M.grille, x, 0.018, 0.0192);
    add(g, new THREE.CircleGeometry(0.0016, 10), M.ledWhite, 0.019, 0.026, 0.0192);
    return g;
  }

  /* boule sur pince repliée en socle */
  function webcamBall() {
    const g = new THREE.Group();
    add(g, rbox(0.06, 0.012, 0.055, 0.005), M.black, 0, 0.006, 0);
    add(g, cyl(0.006, 0.008, 0.03, 12), M.graphite, 0, 0.027, 0);
    add(g, new THREE.SphereGeometry(0.032, 28, 18), M.black, 0, 0.074, 0);
    add(g, new THREE.TorusGeometry(0.032, 0.0035, 8, 40), M.silver, 0, 0.074, 0);
    add(g, cyl(0.015, 0.015, 0.008, 28), M.black, 0, 0.074, 0.03, PI / 2);
    add(g, new THREE.TorusGeometry(0.0135, 0.0025, 8, 28), M.aluDark, 0, 0.074, 0.034);
    add(g, new THREE.CircleGeometry(0.012, 28), lensMat, 0, 0.074, 0.0342);
    return g;
  }

  /* ------------------------------------------------ souris et son récepteur, sur une plaque en acrylique */
  function mouse() {
    const g = new THREE.Group();
    add(g, rbox(0.1, 0.01, 0.14, 0.004), M.acrylic, 0, 0.005, 0);
    add(g, new THREE.SphereGeometry(1, 28, 14, 0, PI * 2, 0, PI / 2), M.black, -0.012, 0.01, 0).scale.set(0.031, 0.022, 0.055);
    add(g, cyl(0.0048, 0.0048, 0.004, 16), M.rubber, -0.012, 0.03, 0.024, 0, 0, PI / 2);
    add(g, rbox(0.012, 0.006, 0.016, 0.002), M.black, 0.03, 0.013, 0.02);
    add(g, box(0.012, 0.0045, 0.012), M.silver, 0.03, 0.0128, 0.034);
    return g;
  }

  const S = screens;
  const builders = {
    'luna-15': () => laptop({ finish: 'silver', w: 0.357, d: 0.235, screen: S.wall.tide }),
    'portable-pro-16': () => laptop({ finish: 'black', w: 0.362, d: 0.25, screen: S.wall.ink }),
    'ultrabook-14': () => laptop({ finish: 'silver', w: 0.31, d: 0.215, screen: S.wall.dune }),
    'portable-gaming-16': () => laptop({ finish: 'graphite', w: 0.36, d: 0.265, screen: S.wall.ember, keys: keysGaming }),
    'support-portable': laptopStand,
    'housse-14': sleeve,
    'pc-forge': pcTower,
    'ecran-27-qhd': () => monitor({ w: 0.6, h: 0.34, screen: S.game }),
    'ecran-34-uw': () => monitor({ w: 0.8, h: 0.34, screen: S.gameWide, standH: 0.1 }),
    'clavier-75-magnetique': () => keyboard({ w: 0.33, d: 0.13, keys: keysGaming, h: 0.02, tilt: 0.12, knob: true, glow: true }),
    'casque-sans-fil': headset,
    'manette-sans-fil': controller,
    'fauteuil-gaming': chair,
    'hybride-plein-format': camera,
    'camera-poche': pocketCam,
    'smartphone-61': () => standingDevice({ w: 0.071, h: 0.147, screen: S.wall.tide }),
    'smartphone-67': () => standingDevice({ w: 0.078, h: 0.162, shell: M.graphite, screen: S.wall.sand }),
    'tablette-11': () => standingDevice({ w: 0.254, h: 0.166, t: 0.006, shell: M.silver, screen: S.wall.dune, tilt: 0.3, cam: false }),
    'batterie-20000': powerbank,
    'chargeur-65': charger,
    'hub-usbc': hub,
    'ventirad-afficheur': towerCooler,
    'gpu-16': gpu,
    'cpu-8c': cpu,
    'ram-ddr5-32': ram,
    'ssd-nvme-2to': ssd,
    'alim-850': psu,
    'webcam-fhd': webcamBar,
    'webcam-compacte': webcamBall,
    'clavier-bt-azerty': () => keyboard({ w: 0.27, d: 0.11, keys: keysDark, h: 0.008, tilt: 0.08 }),
    'souris-silencieuse': mouse,
    'micro-usb': mic,
    'imprimante-laser': printer,
    'routeur-wifi6': router,
    'point-acces': accessPoint,
    'switch-24': switch24,
    'nas-2-baies': nas,
    'cable-cat6': spool
  };

  return {
    build(id) { const f = builders[id]; return f ? f() : null; },
    laptop, monitor, pedestal, coolerBox, spin
  };
}
