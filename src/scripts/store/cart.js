/* =============================================================
   Panier : quantités par produit, gardées dans le navigateur.
   ============================================================= */
import { products } from '../../data/catalog.js';

const KEY = 'octet-panier';

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    const clean = {};
    for (const id in raw) {
      const qty = Math.floor(Number(raw[id]));
      if (qty > 0 && products.some((p) => p.id === id)) clean[id] = Math.min(qty, 99);
    }
    return clean;
  } catch (e) {
    return {};
  }
}

export function createCart() {
  let lines = read();
  const target = new EventTarget();

  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch (e) { /* navigation privée : le panier vit le temps de la visite */ }
    target.dispatchEvent(new Event('change'));
  };

  return {
    on(fn) { target.addEventListener('change', fn); },
    qty(id) { return lines[id] || 0; },
    items() {
      return Object.keys(lines).map((id) => ({ product: products.find((p) => p.id === id), qty: lines[id] }));
    },
    count() { return Object.values(lines).reduce((s, q) => s + q, 0); },
    total() { return this.items().reduce((s, it) => s + it.product.price * it.qty, 0); },
    add(id, qty = 1) {
      const p = products.find((x) => x.id === id);
      if (!p) return;
      lines[id] = Math.min(99, Math.min(p.stock, (lines[id] || 0) + qty));
      save();
    },
    set(id, qty) {
      if (qty <= 0) delete lines[id];
      else lines[id] = Math.min(99, qty);
      save();
    },
    remove(id) { delete lines[id]; save(); }
  };
}
