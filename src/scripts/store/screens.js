/* =============================================================
   Écrans du magasin. Le code n'apparaît que là où un vrai magasin
   aurait un terminal : la borne d'accueil, le labo, le rack réseau,
   la caisse. Les terminaux ne s'écrivent que quand on approche.
   ============================================================= */
import * as THREE from 'three';
import { canvas, toTexture, setFont, FONT, INK, arrow, roundRect, drawByte } from './textures.js';
import { store, zones, products, formatPrice } from '../../data/catalog.js';

const SCREEN_BG = '#121316';

function screenMaterial(tex) {
  // un écran émet sa propre lumière : ses couleurs ne passent pas par le rendu tonal
  return new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
}

/* ------------------------------------------------ terminal qui s'écrit */
export class Terminal {
  constructor({ w = 1024, h = 640, title, lines, fontSize = 30 }) {
    const { c, ctx } = canvas(w, h);
    this.c = c; this.ctx = ctx; this.w = w; this.h = h;
    this.title = title;
    this.fontSize = fontSize;
    this.setLines(lines, true);
    this.typed = this.total;
    this.armed = true;
    this.texture = toTexture(c);
    this.material = screenMaterial(this.texture);
    this.blink = 0;
    this.draw();
  }
  setLines(lines, instant = false) {
    this.lines = lines;
    this.total = lines.reduce((n, l) => n + l.text.length + 6, 0);
    this.typed = instant ? 0 : Math.min(this.typed || 0, this.total);
    this.dirty = true;
  }
  showAll() { this.typed = this.total; this.dirty = true; }
  update(dt, active) {
    // vu de loin, l'écran est déjà rempli ; à la première approche, il se réécrit sous vos yeux
    if (active && this.armed) { this.armed = false; this.typed = 0; this.dirty = true; }
    if (active && this.typed < this.total) {
      this.typed = Math.min(this.total, this.typed + dt * 46);
      this.dirty = true;
    }
    this.blink += dt;
    if (this.blink > 0.53) { this.blink = 0; this.cursorOn = !this.cursorOn; this.dirty = true; }
    if (this.dirty) { this.draw(); this.texture.needsUpdate = true; this.dirty = false; }
  }
  draw() {
    const { ctx, w, h } = this;
    ctx.fillStyle = SCREEN_BG;
    ctx.fillRect(0, 0, w, h);
    // barre de titre
    ctx.fillStyle = '#1C1D21';
    ctx.fillRect(0, 0, w, 54);
    setFont(ctx, FONT.mono, 18, 500, 2);
    ctx.fillStyle = INK.mute;
    ctx.fillText(this.title, 28, 35);
    ctx.fillStyle = INK.brass;
    ctx.fillRect(w - 58, 22, 10, 10);
    ctx.fillStyle = 'rgba(203,163,90,0.35)';
    ctx.fillRect(w - 42, 22, 10, 10);

    const fs = this.fontSize, lh = fs * 1.55;
    let budget = this.typed, y = 54 + lh * 1.1, lastX = 28, lastY = y;
    setFont(ctx, FONT.mono, fs, 400, 0);
    for (const line of this.lines) {
      if (budget <= 0) break;
      const shown = line.text.slice(0, Math.max(0, Math.floor(budget)));
      budget -= line.text.length + 6;
      let x = 28;
      if (line.kind === 'cmd') {
        ctx.fillStyle = INK.brass;
        ctx.fillText('$', x, y);
        x += fs * 1.2;
        ctx.fillStyle = INK.white;
      } else if (line.kind === 'ok') ctx.fillStyle = INK.green;
      else if (line.kind === 'hi') ctx.fillStyle = INK.cyan;
      else if (line.kind === 'dim') ctx.fillStyle = '#6E6B66';
      else ctx.fillStyle = '#CFCBC3';
      if (line.kind !== 'cmd' && line.kind !== 'bar') x += fs * 1.2;
      if (line.kind === 'bar') drawBar(ctx, x + fs * 1.2, y, line, fs, shown.length / line.text.length);
      else ctx.fillText(shown, x, y);
      lastX = x + ctx.measureText(shown).width + 6; lastY = y;
      y += line.gap ? lh * 1.5 : lh;
    }
    if (this.cursorOn) {
      ctx.fillStyle = INK.white;
      ctx.fillRect(lastX, lastY - fs * 0.8, fs * 0.55, fs);
    }
  }
}

function drawBar(ctx, x, y, line, fs, progress) {
  ctx.fillStyle = '#CFCBC3';
  ctx.fillText(line.label, x, y);
  const bx = x + fs * 8.2, bw = fs * 10, cells = 16;
  const filled = Math.round(cells * line.value * progress);
  for (let i = 0; i < cells; i++) {
    ctx.fillStyle = i < filled ? INK.cyan : '#2B2D31';
    ctx.fillRect(bx + i * (bw / cells), y - fs * 0.72, bw / cells - 3, fs * 0.78);
  }
  ctx.fillStyle = INK.white;
  ctx.fillText(Math.round(line.value * 100 * progress) + ' %', bx + bw + fs * 0.8, y);
}

/* ------------------------------------------------ contenus des terminaux */
export function welcomeTerminal() {
  const departments = zones.filter((z) => z.id !== 'accueil' && z.id !== 'caisses').length;
  return new Terminal({
    title: 'octet@accueil — borne',
    lines: [
      { kind: 'cmd', text: 'store.status' },
      { kind: 'ok', text: 'OUVERT — entrée libre', gap: true },
      { kind: 'cmd', text: 'inventory.scan' },
      { kind: 'hi', text: products.length + ' produits · ' + departments + ' rayons', gap: true },
      { kind: 'cmd', text: 'guide --plan' },
      { kind: 'out', text: 'Suivez les pistes en laiton au sol.' },
      { kind: 'out', text: 'Touchez un produit pour voir sa fiche.', gap: true },
      { kind: 'cmd', text: 'checkout.ready' },
      { kind: 'ok', text: 'true — caisses au fond, tout droit' }
    ]
  });
}

export function buildTerminal() {
  const pick = ['cpu-8c', 'gpu-16', 'ram-ddr5-32', 'ssd-nvme-2to', 'alim-850', 'ventirad-afficheur']
    .map((id) => products.find((p) => p.id === id));
  const total = pick.reduce((s, p) => s + p.price, 0);
  const keys = ['cpu', 'gpu', 'ram', 'ssd', 'psu', 'cooler'];
  const rows = [[['kw', 'const '], ['id', 'build'], ['op', ' = {']]];
  pick.forEach((p, i) => {
    rows.push([['sp', '  '], ['key', keys[i]], ['op', ': '], ['str', '"' + p.name + '"'], ['op', ','], ['cm', '  // ' + formatPrice(p.price)]]);
  });
  rows.push([['op', '};']], [], [['cm', '// total de la configuration : '], ['num', formatPrice(total)]]);
  const lines = rows.map((tokens) => ({ kind: 'code', tokens, text: tokens.map((t) => t[1]).join('') }));
  return new CodeScreen({ title: 'labo/configurateur.js', lines });
}

class CodeScreen extends Terminal {
  draw() {
    const { ctx, w, h } = this;
    ctx.fillStyle = SCREEN_BG;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1C1D21';
    ctx.fillRect(0, 0, w, 54);
    setFont(ctx, FONT.mono, 18, 500, 2);
    ctx.fillStyle = INK.mute;
    ctx.fillText(this.title, 28, 35);
    const colors = { kw: INK.brass, id: INK.white, op: '#9C988F', key: '#E8E3D8', str: '#E9C98C', cm: '#6E6B66', num: INK.cyan, sp: INK.white };
    const fs = 24, lh = 40;
    let budget = this.typed, y = 104;
    this.lines.forEach((line, i) => {
      setFont(ctx, FONT.mono, fs, 400, 0);
      ctx.fillStyle = '#4A4B50';
      ctx.textAlign = 'right';
      ctx.fillText(String(i + 1), 58, y);
      ctx.textAlign = 'left';
      let x = 84;
      for (const [kind, text] of line.tokens) {
        if (budget <= 0) break;
        const shown = text.slice(0, Math.max(0, Math.floor(budget)));
        budget -= text.length;
        ctx.fillStyle = colors[kind];
        ctx.fillText(shown, x, y);
        x += ctx.measureText(shown).width;
      }
      budget -= 4;
      y += lh;
    });
  }
}

export function networkTerminal() {
  return new Terminal({
    title: 'rack-demo — état',
    fontSize: 26,
    lines: [
      { kind: 'cmd', text: 'network.status' },
      { kind: 'ok', text: 'rack de démonstration : en ligne', gap: true },
      { kind: 'bar', text: '................', label: 'switch 24p', value: 0.75 },
      { kind: 'bar', text: '................', label: 'wi-fi 6', value: 1 },
      { kind: 'bar', text: '................', label: 'nas', value: 0.5, gap: true },
      { kind: 'cmd', text: 'ping octet.local' },
      { kind: 'hi', text: '4 paquets · 0 perte · 0,4 ms' }
    ]
  });
}

/* ------------------------------------------------ écran client de la caisse, relié au panier */
export class CheckoutScreen extends Terminal {
  constructor() {
    super({ title: 'caisse-01 — écran client', fontSize: 26, lines: [] });
    this.setCart([]);
  }
  setCart(items) {
    const lines = [{ kind: 'cmd', text: 'cart.list' }];
    if (!items.length) {
      lines.push({ kind: 'dim', text: '(vide) — ajoutez des produits', gap: true });
    } else {
      items.slice(0, 5).forEach((it, i, arr) => {
        const name = it.product.name.length > 26 ? it.product.name.slice(0, 25) + '…' : it.product.name;
        lines.push({ kind: 'out', text: it.qty + ' × ' + name + '  ' + formatPrice(it.product.price * it.qty), gap: i === arr.length - 1 && items.length <= 5 });
      });
      if (items.length > 5) lines.push({ kind: 'dim', text: '+ ' + (items.length - 5) + ' autres lignes', gap: true });
    }
    const total = items.reduce((s, it) => s + it.product.price * it.qty, 0);
    lines.push({ kind: 'cmd', text: 'cart.total' });
    lines.push({ kind: 'hi', text: formatPrice(total), gap: true });
    lines.push({ kind: 'cmd', text: 'payment.online' });
    lines.push({ kind: 'dim', text: 'bientôt disponible' });
    this.setLines(lines);
    this.showAll();
    this.armed = false;
  }
}

/* ------------------------------------------------ plan-annuaire de l'accueil */
export function directoryTexture() {
  const { c, ctx } = canvas(1600, 960);
  ctx.fillStyle = INK.graphite;
  ctx.fillRect(0, 0, 1600, 960);
  setFont(ctx, FONT.sign, 64, 700, 8);
  ctx.fillStyle = INK.white;
  ctx.fillText('LES RAYONS', 90, 130);
  ctx.fillStyle = INK.brass;
  ctx.fillRect(90, 160, 120, 4);

  const where = {
    accueil: ['vous êtes ici', null], portables: ['à gauche', 'left'], gaming: ['tout droit', 'up'],
    mobile: ['à droite', 'right'], composants: ['au fond à gauche', 'left'], peripheriques: ['au fond, tout droit', 'up'],
    reseau: ['au fond à droite', 'right'], caisses: ['tout au fond', 'up']
  };
  zones.forEach((z, i) => {
    const y = 250 + i * 88;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.045)';
    ctx.fillRect(70, y - 58, 1460, 82);
    setFont(ctx, FONT.mono, 34, 500, 2);
    ctx.fillStyle = INK.brass;
    ctx.fillText(z.code, 100, y);
    setFont(ctx, FONT.sign, 48, 700, 4);
    ctx.fillStyle = z.id === 'accueil' ? INK.mute : INK.white;
    ctx.fillText(z.name.toUpperCase(), 210, y);
    setFont(ctx, FONT.sign, 36, 500, 2);
    ctx.fillStyle = INK.mute;
    ctx.textAlign = 'right';
    ctx.fillText(where[z.id][0], 1400, y - 2);
    ctx.textAlign = 'left';
    if (where[z.id][1]) arrow(ctx, 1466, y - 16, 44, where[z.id][1], INK.white);
    else { ctx.fillStyle = INK.amber; ctx.beginPath(); ctx.arc(1466, y - 16, 12, 0, Math.PI * 2); ctx.fill(); }
  });
  return toTexture(c, { aniso: 8 });
}

/* ------------------------------------------------ écrans de démonstration */
export function gameScreenTexture(w = 1024, h = 576, seed = 0) {
  const { c, ctx } = canvas(w, h);
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.7);
  sky.addColorStop(0, seed ? '#1E2A36' : '#232733');
  sky.addColorStop(0.6, seed ? '#7F6A5A' : '#9A6B4B');
  sky.addColorStop(1, seed ? '#E0B17C' : '#E8A566');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,236,205,0.9)';
  ctx.beginPath(); ctx.arc(w * (seed ? 0.3 : 0.64), h * 0.58, h * 0.07, 0, Math.PI * 2); ctx.fill();
  const layers = [['#5A4640', 0.62, 0.9], ['#3A302E', 0.7, 1.4], ['#221D1D', 0.8, 2.1]];
  layers.forEach(([col, base, freq], li) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) {
      const y = h * base - Math.abs(Math.sin((x / w) * Math.PI * freq + li + seed)) * h * 0.14 - Math.sin(x * 0.03 + li) * 6;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h); ctx.fill();
  });
  setFont(ctx, FONT.mono, Math.round(h * 0.04), 500, 2);
  ctx.fillStyle = 'rgba(244,242,238,0.8)';
  ctx.fillText(seed ? '165 Hz · 21:9' : '240 Hz · QHD', w * 0.04, h * 0.08);
  return toTexture(c);
}

export function webcamPreviewTexture() {
  const { c, ctx } = canvas(768, 432);
  const g = ctx.createLinearGradient(0, 0, 768, 432);
  g.addColorStop(0, '#C9B8A4'); g.addColorStop(1, '#8E7C6C');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 768, 432);
  ctx.fillStyle = '#5C4E45';
  ctx.beginPath(); ctx.ellipse(384, 470, 190, 150, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(384, 220, 86, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(18,19,22,0.55)';
  roundRect(ctx, 24, 22, 230, 50, 8); ctx.fill();
  ctx.fillStyle = INK.amber;
  ctx.beginPath(); ctx.arc(52, 47, 9, 0, Math.PI * 2); ctx.fill();
  setFont(ctx, FONT.mono, 20, 500, 2);
  ctx.fillStyle = INK.white;
  ctx.fillText('APERÇU 1080p', 72, 54);
  return toTexture(c);
}

export function wallpaperTexture(kind, w = 512, h = 320) {
  const { c, ctx } = canvas(w, h);
  const sets = {
    sand: ['#E8D8C0', '#B08A63', '#5E4A3C'],
    ink: ['#20242B', '#3A4350', '#C98A3E'],
    dune: ['#F2E6D3', '#D4A373', '#8A5A3B'],
    tide: ['#DCE6EA', '#8FAEBB', '#3F5D6E'],
    ember: ['#1A1B1E', '#5A3A28', '#E08A3A']
  };
  const [a, b, d] = sets[kind] || sets.sand;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, a); g.addColorStop(0.55, b); g.addColorStop(1, d);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.28;
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = i % 2 ? a : d;
    ctx.lineWidth = 18 - i * 3;
    ctx.beginPath();
    ctx.arc(w * 0.85, h * 1.15, h * (0.5 + i * 0.22), Math.PI, Math.PI * 1.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return toTexture(c);
}

/* ------------------------------------------------ affiche du caisson lumineux de l'accueil */
/* le produit vedette, dessiné d'après le catalogue : nom, accroche, caractéristiques, prix */
function fitFont(ctx, text, family, size, weight, maxW, tracking = 0) {
  setFont(ctx, family, size, weight, tracking);
  while (size > 12 && ctx.measureText(text).width > maxW) setFont(ctx, family, --size, weight, tracking);
}

function wrapLines(ctx, text, maxW) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? line + ' ' + word : word;
    if (line && ctx.measureText(next).width > maxW) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export function posterTexture(id, w = 704, h = 1056) {
  const p = products.find((x) => x.id === id);
  const { c, ctx } = canvas(w, h);
  const x0 = 60, inner = w - x0 * 2;
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#F1F4F5');
  bg.addColorStop(1, '#C6D4DB');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  // grands arcs, comme les fonds d'écran des portables
  ctx.globalAlpha = 0.2;
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = i % 2 ? '#8FAEBB' : '#3F5D6E';
    ctx.lineWidth = 26 - i * 3;
    ctx.beginPath();
    ctx.arc(w * 1.05, h * 0.62, w * (0.42 + i * 0.16), Math.PI * 0.75, Math.PI * 1.45);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  setFont(ctx, FONT.mono, 24, 500, 4);
  ctx.fillStyle = '#3F5D6E';
  ctx.fillText('NOUVEAUTÉ', x0, 104);
  fitFont(ctx, p.name.toUpperCase(), FONT.sign, 150, 700, inner, 2);
  ctx.fillStyle = INK.graphite;
  ctx.fillText(p.name.toUpperCase(), x0 - 4, 250);
  setFont(ctx, FONT.ui, 32, 400);
  ctx.fillStyle = '#3A4350';
  wrapLines(ctx, p.pitch, inner).slice(0, 2).forEach((line, i) => ctx.fillText(line, x0, 312 + i * 44));

  // le portable de face : écran allumé, base en perspective
  const sx = w / 2, sw = 470, sh = 296, sy = 430;
  ctx.fillStyle = 'rgba(40,52,60,0.18)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + sh + 44, sw * 0.62, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2A2C30';
  roundRect(ctx, sx - sw / 2, sy, sw, sh, 14);
  ctx.fill();
  const scr = ctx.createLinearGradient(sx - sw / 2, sy, sx + sw / 2, sy + sh);
  scr.addColorStop(0, '#DCE6EA'); scr.addColorStop(0.55, '#8FAEBB'); scr.addColorStop(1, '#3F5D6E');
  ctx.fillStyle = scr;
  ctx.fillRect(sx - sw / 2 + 14, sy + 14, sw - 28, sh - 28);
  ctx.save();
  ctx.beginPath();
  ctx.rect(sx - sw / 2 + 14, sy + 14, sw - 28, sh - 28);
  ctx.clip();
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = i % 2 ? '#DCE6EA' : '#3F5D6E';
    ctx.lineWidth = 14 - i * 3;
    ctx.beginPath();
    ctx.arc(sx + sw * 0.4, sy + sh * 1.1, sh * (0.5 + i * 0.22), Math.PI, Math.PI * 1.5);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#C3C7CB';
  ctx.beginPath();
  ctx.moveTo(sx - sw / 2 - 4, sy + sh);
  ctx.lineTo(sx + sw / 2 + 4, sy + sh);
  ctx.lineTo(sx + sw / 2 + 48, sy + sh + 28);
  ctx.lineTo(sx - sw / 2 - 48, sy + sh + 28);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#A3A8AD';
  ctx.fillRect(sx - sw / 2 - 48, sy + sh + 28, sw + 96, 7);

  // caractéristiques, sur deux colonnes
  const colW = inner / 2;
  p.specs.slice(0, 4).forEach(([k, v], i) => {
    const cx = x0 + (i % 2) * colW, cy = 836 + Math.floor(i / 2) * 78;
    setFont(ctx, FONT.mono, 17, 500, 2);
    ctx.fillStyle = '#5E7280';
    ctx.fillText(k.toUpperCase(), cx, cy);
    fitFont(ctx, v, FONT.ui, 27, 600, colW - 20);
    ctx.fillStyle = INK.graphite;
    ctx.fillText(v, cx, cy + 34);
  });

  // bandeau : le logo du magasin et le prix
  ctx.fillStyle = INK.graphite;
  ctx.fillRect(0, h - 104, w, 104);
  drawByte(ctx, x0, h - 62, 14, 5, [0, 2, 3, 5, 7], INK.brass, 'rgba(203,163,90,0.28)');
  setFont(ctx, FONT.sign, 30, 700, 4);
  ctx.fillStyle = INK.white;
  ctx.fillText(store.name, x0 + 8 * 14 + 7 * 5 + 18, h - 44);
  setFont(ctx, FONT.ui, 44, 700);
  ctx.fillStyle = INK.brass;
  ctx.textAlign = 'right';
  ctx.fillText(formatPrice(p.price), w - x0, h - 36);
  ctx.textAlign = 'left';
  return toTexture(c, { aniso: 8 });
}

export { screenMaterial };
