/* =============================================================
   Textures dessinées en canvas : matériaux, étiquettes, panneaux.
   Rien à télécharger, tout est généré au chargement.
   ============================================================= */
import * as THREE from 'three';

export const FONT = {
  sign: '"Archivo Narrow", "Arial Narrow", sans-serif',
  ui: 'Archivo, "Segoe UI", system-ui, sans-serif',
  mono: '"Martian Mono", ui-monospace, "Cascadia Mono", monospace'
};

export const INK = {
  graphite: '#222326',
  graphiteSoft: '#2E3034',
  white: '#F4F2EE',
  mute: '#A7A49D',
  brass: '#CBA35A',
  amber: '#F2A21B',
  cyan: '#43C6D6',
  green: '#4DBB83',
  plaster: '#F1EEE8'
};

/* générateur pseudo-aléatoire stable : la même salle à chaque visite */
export function rng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, ctx: c.getContext('2d') };
}

export function toTexture(c, { repeat, srgb = true, aniso = 4 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

export function setFont(ctx, family, size, weight = 400, tracking = 0) {
  ctx.font = weight + ' ' + size + 'px ' + family;
  if ('letterSpacing' in ctx) ctx.letterSpacing = tracking ? tracking + 'px' : '0px';
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* flèche dessinée (pas de glyphe) : dir = 'left' | 'right' | 'up' | 'down' */
export function arrow(ctx, cx, cy, size, dir, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[dir]);
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.14;
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  ctx.moveTo(0, size * 0.5); ctx.lineTo(0, -size * 0.42);
  ctx.moveTo(-size * 0.36, -size * 0.06); ctx.lineTo(0, -size * 0.46); ctx.lineTo(size * 0.36, -size * 0.06);
  ctx.stroke();
  ctx.restore();
}

/* l'octet du logo : huit bits, ceux de `lit` allumés */
export function drawByte(ctx, x, y, cell, gap, lit, on, off) {
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = lit.includes(i) ? on : off;
    ctx.fillRect(x + i * (cell + gap), y, cell, cell);
  }
}

/* ------------------------------------------------ matériaux */
export function terrazzoTexture() {
  const { c, ctx } = canvas(1024, 1024);
  const r = rng(7);
  ctx.fillStyle = '#E6E1D7';
  ctx.fillRect(0, 0, 1024, 1024);
  // nuages très doux de ton
  for (let i = 0; i < 40; i++) {
    const g = ctx.createRadialGradient(r() * 1024, r() * 1024, 0, r() * 1024, r() * 1024, 200 + r() * 260);
    g.addColorStop(0, r() > 0.5 ? 'rgba(255,252,246,0.18)' : 'rgba(205,196,182,0.14)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 1024);
  }
  const chips = ['#CFC6B8', '#B9AF9F', '#9D9384', '#F6F3ED', '#C9A57C', '#8E8A84', '#D8D2C6'];
  for (let i = 0; i < 5200; i++) {
    const x = r() * 1024, y = r() * 1024;
    const s = r() < 0.9 ? 1 + r() * 3 : 3 + r() * 7;
    ctx.fillStyle = chips[Math.floor(r() * chips.length)];
    ctx.globalAlpha = 0.55 + r() * 0.45;
    ctx.beginPath();
    const n = 5 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2, rr = s * (0.6 + r() * 0.5);
      k ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return toTexture(c, { repeat: [7.5, 9.5], aniso: 8 });
}

export function oakTexture() {
  const { c, ctx } = canvas(512, 512);
  const r = rng(21);
  // chêne clair, légèrement grisé : pas de pin miel
  ctx.fillStyle = '#CDBB9C';
  ctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 1) {
    const v = Math.sin(y * 0.09 + Math.sin(y * 0.013) * 4) * 0.5 + 0.5;
    ctx.fillStyle = 'rgba(128,104,76,' + (0.04 + v * 0.08) + ')';
    ctx.fillRect(0, y, 512, 1);
  }
  for (let i = 0; i < 90; i++) {
    const y = r() * 512;
    ctx.strokeStyle = 'rgba(110,88,62,' + (0.07 + r() * 0.12) + ')';
    ctx.lineWidth = 0.6 + r() * 1.4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * (2 + r() * 3));
    ctx.stroke();
  }
  return toTexture(c, { repeat: [1, 1], aniso: 8 });
}

/* trottoir : grandes dalles de pierre grise, joints fins */
export function pavingTexture() {
  const { c, ctx } = canvas(512, 512);
  const r = rng(12);
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
    const v = 196 + Math.floor(r() * 14);
    ctx.fillStyle = 'rgb(' + v + ',' + (v - 4) + ',' + (v - 10) + ')';
    ctx.fillRect(x * 256, y * 256, 256, 256);
  }
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(60,55,48,0.07)';
    ctx.fillRect(r() * 512, r() * 512, 2, 2);
  }
  ctx.fillStyle = 'rgba(95,88,78,0.45)';
  ctx.fillRect(0, 0, 512, 3); ctx.fillRect(0, 256, 512, 3);
  ctx.fillRect(0, 0, 3, 512); ctx.fillRect(256, 0, 3, 512);
  return toTexture(c, { repeat: [40, 17], aniso: 8 });
}

export function carpetTexture() {
  const { c, ctx } = canvas(256, 256);
  const r = rng(3);
  ctx.fillStyle = '#3A3B3F';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(r() * 256, r() * 256, 1.5, 1.5);
  }
  // joints de dalles
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.strokeRect(0.5, 0.5, 255, 255);
  return toTexture(c, { repeat: [18, 22] });
}

/* sol du labo : vinyle antistatique (ESD) des ateliers d'électronique,
   gris clair continu parcouru de fines veines conductrices */
export function labFloorTexture() {
  const { c, ctx } = canvas(512, 512);
  const r = rng(31);
  ctx.fillStyle = '#C9C8C3';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 220; i++) {
    ctx.strokeStyle = 'rgba(70,72,74,' + (0.05 + r() * 0.12) + ')';
    ctx.lineWidth = 0.6 + r() * 0.8;
    ctx.beginPath();
    let x = r() * 512, y = r() * 512;
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  for (let i = 0; i < 3000; i++) {
    ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(40,40,40,0.08)';
    ctx.fillRect(r() * 512, r() * 512, 1.5, 1.5);
  }
  return toTexture(c, { repeat: [4, 4] });
}

/* plafond : dalles acoustiques de 1,2 m, joints à peine marqués */
export function ceilingTexture() {
  const { c, ctx } = canvas(256, 256);
  ctx.fillStyle = '#F1EEE8';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = 'rgba(120,112,100,0.22)';
  ctx.fillRect(0, 0, 256, 2); ctx.fillRect(0, 0, 2, 256);
  const r = rng(5);
  for (let i = 0; i < 900; i++) { ctx.fillStyle = 'rgba(150,140,128,0.06)'; ctx.fillRect(r() * 256, r() * 256, 1.5, 1.5); }
  return toTexture(c, { repeat: [25, 32] });
}

export function perforatedTexture(base = '#B7BBBF', hole = '#3C3F43') {
  const { c, ctx } = canvas(256, 256);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = hole;
  for (let y = 16; y < 256; y += 32) for (let x = 16; x < 256; x += 32) {
    ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.fill();
  }
  return toTexture(c, { repeat: [8, 6] });
}

/* ombre de contact : un rectangle flou (et non un disque) pour suivre la forme des meubles */
export function blobTexture() {
  const { c, ctx } = canvas(128, 128);
  ctx.clearRect(0, 0, 128, 128);
  ctx.shadowColor = 'rgba(38,30,22,0.62)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetX = 400;
  ctx.fillStyle = '#000';
  ctx.fillRect(-400 + 26, 26, 76, 76);
  return toTexture(c, { srgb: false });
}

export function glowTexture(rgb = '242,162,27') {
  const { c, ctx } = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(' + rgb + ',0.75)');
  g.addColorStop(0.45, 'rgba(' + rgb + ',0.22)');
  g.addColorStop(1, 'rgba(' + rgb + ',0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return toTexture(c, { srgb: false });
}

/* ------------------------------------------------ détails de produits */
export function keysTexture(deck = '#1C1D20', key = '#2B2D31', legend = 'rgba(255,255,255,0.35)', backlight) {
  const { c, ctx } = canvas(512, 224);
  ctx.fillStyle = deck;
  ctx.fillRect(0, 0, 512, 224);
  const rows = [14, 14, 13, 12, 10];
  const kh = 34, gap = 6;
  for (let r = 0; r < rows.length; r++) {
    const n = rows[r];
    const kw = (512 - 24 - gap * (n - 1)) / n;
    for (let k = 0; k < n; k++) {
      const x = 12 + k * (kw + gap), y = 12 + r * (kh + gap);
      const w = kw;
      ctx.fillStyle = key;
      roundRect(ctx, x, y, w, kh, 4); ctx.fill();
      if (backlight) {
        ctx.fillStyle = backlight;
        ctx.fillRect(x + w * 0.35, y + kh * 0.4, w * 0.3, 3);
      } else {
        ctx.fillStyle = legend;
        ctx.fillRect(x + 7, y + 8, 6, 2);
      }
    }
  }
  return toTexture(c);
}

export function portsTexture(ports = 24) {
  const { c, ctx } = canvas(1024, 104);
  ctx.fillStyle = '#1B1C1F';
  ctx.fillRect(0, 0, 1024, 104);
  ctx.fillStyle = '#26282C';
  ctx.fillRect(0, 0, 1024, 6);
  const half = ports / 2;
  for (let i = 0; i < ports; i++) {
    const col = i % half, row = Math.floor(i / half);
    const x = 250 + col * 54, y = 16 + row * 42;
    ctx.fillStyle = '#0B0B0C';
    ctx.fillRect(x, y, 42, 32);
    ctx.fillStyle = '#C9A45C';
    ctx.fillRect(x + 8, y + 4, 26, 3);
  }
  // SFP
  ctx.fillStyle = '#0B0B0C';
  ctx.fillRect(920, 20, 60, 26); ctx.fillRect(920, 58, 60, 26);
  // marque et voyants
  setFont(ctx, FONT.mono, 18, 500, 2);
  ctx.fillStyle = 'rgba(244,242,238,0.8)';
  ctx.fillText('SW-24G', 36, 60);
  return toTexture(c);
}

export function grilleTexture(base = '#2A2B2E', dot = '#111214') {
  const { c, ctx } = canvas(128, 128);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = dot;
  for (let y = 4; y < 128; y += 8) for (let x = (y / 8) % 2 ? 8 : 4; x < 128; x += 8) {
    ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
  }
  return toTexture(c, { repeat: [2, 2] });
}

export function fanTexture() {
  const { c, ctx } = canvas(256, 256);
  ctx.clearRect(0, 0, 256, 256);
  ctx.translate(128, 128);
  ctx.fillStyle = '#17181B';
  for (let i = 0; i < 9; i++) {
    ctx.rotate((Math.PI * 2) / 9);
    ctx.beginPath();
    ctx.moveTo(18, -6);
    ctx.quadraticCurveTo(80, -40, 118, -8);
    ctx.quadraticCurveTo(84, 6, 22, 10);
    ctx.fill();
  }
  ctx.fillStyle = '#26282C';
  ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.fill();
  return toTexture(c);
}

export function labelTexture(lines, { w = 512, h = 256, bg = '#F4F2EE', ink = '#222326', accent = '#CBA35A' } = {}) {
  const { c, ctx } = canvas(w, h);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = accent;
  ctx.fillRect(0, h - 18, w, 18);
  ctx.fillStyle = ink;
  setFont(ctx, FONT.sign, h * 0.22, 700, 2);
  ctx.fillText(lines[0], w * 0.08, h * 0.38);
  if (lines[1]) {
    setFont(ctx, FONT.mono, h * 0.09, 400, 1);
    ctx.fillText(lines[1], w * 0.08, h * 0.6);
  }
  return toTexture(c);
}

/* petit afficheur rétroéclairé (ventirad) : texte cyan sur fond noir, comme un écran allumé */
export function displayTexture(text, { w = 280, h = 56 } = {}) {
  const { c, ctx } = canvas(w, h);
  ctx.fillStyle = '#0B0C0E';
  ctx.fillRect(0, 0, w, h);
  setFont(ctx, FONT.mono, h * 0.6, 500, 2);
  ctx.fillStyle = INK.cyan;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 2);
  return toTexture(c);
}

/* boîtes de réserve (décor des gondoles) */
export function boxTexture(kind) {
  const { c, ctx } = canvas(256, 256);
  const palettes = {
    white: ['#EEECE8', '#222326', '#CBA35A'],
    graphite: ['#2A2B2E', '#F4F2EE', '#CBA35A'],
    kraft: ['#C8A57A', '#3A2E22', '#F4F2EE'],
    blue: ['#E8ECEF', '#2F5D86', '#2F5D86']
  };
  const [bg, ink, band] = palettes[kind] || palettes.white;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = band;
  ctx.fillRect(0, 186, 256, 16);
  ctx.fillStyle = ink;
  ctx.fillRect(26, 40, 110, 14);
  ctx.fillRect(26, 64, 70, 8);
  ctx.globalAlpha = 0.5;
  ctx.fillRect(26, 150, 60, 6);
  ctx.globalAlpha = 1;
  return toTexture(c);
}

/* ------------------------------------------------ signalétique */
export function signTexture({ code, name, arrowDir, sub, w = 1024, h = 200 }) {
  const { c, ctx } = canvas(w, h);
  ctx.fillStyle = '#26272B';
  ctx.fillRect(0, 0, w, h);
  // contour « sérigraphie » et repère de broche 1
  ctx.strokeStyle = 'rgba(203,163,90,0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.fillStyle = INK.brass;
  ctx.beginPath(); ctx.arc(28, 28, 5, 0, Math.PI * 2); ctx.fill();

  let x = 56;
  if (arrowDir === 'left') { arrow(ctx, x + 34, h / 2, 64, 'left', INK.white); x += 96; }
  if (code) {
    setFont(ctx, FONT.mono, h * 0.3, 500, 2);
    ctx.fillStyle = INK.brass;
    ctx.fillText(code, x, h * 0.62);
    x += ctx.measureText(code).width + 30;
  }
  setFont(ctx, FONT.sign, h * 0.4, 700, 3);
  ctx.fillStyle = INK.white;
  ctx.fillText(name.toUpperCase(), x, h * 0.64);
  if (sub) {
    const nameW = ctx.measureText(name.toUpperCase()).width;
    setFont(ctx, FONT.sign, h * 0.17, 600, 3);
    ctx.fillStyle = INK.mute;
    ctx.fillText(sub.toUpperCase(), x + nameW + 26, h * 0.62);
  }
  if (arrowDir === 'right') arrow(ctx, w - 70, h / 2, 64, 'right', INK.white);
  if (arrowDir === 'up') arrow(ctx, w - 70, h / 2, 64, 'up', INK.white);
  return toTexture(c, { aniso: 8 });
}

/* code gravé au sol à côté d'une via */
export function floorCodeTexture(code) {
  const { c, ctx } = canvas(256, 128);
  ctx.clearRect(0, 0, 256, 128);
  setFont(ctx, FONT.mono, 72, 500, 4);
  ctx.fillStyle = 'rgba(160,122,58,0.9)';
  ctx.textAlign = 'center';
  ctx.fillText(code, 128, 92);
  return toTexture(c);
}
