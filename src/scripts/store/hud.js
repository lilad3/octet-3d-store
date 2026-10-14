/* =============================================================
   Interface : barre, étiquette du produit en vue, fiche produit,
   panier, recherche, plan. Tout ce qui est HTML par-dessus la 3D.
   ============================================================= */
import { products, formatPrice, zoneById } from '../../data/catalog.js';
import { toPlan, zoneAt } from './plan.js';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const svg = (d) => '<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
const ICON = { minus: svg('<path d="M5 12h14"/>'), plus: svg('<path d="M12 5v14M5 12h14"/>'), trash: svg('<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>') };
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function createHud(app) {
  const hud = $('#hud');
  const coarse = matchMedia('(pointer: coarse)');
  const compact = matchMedia('(max-width: 860px), (pointer: coarse) and (max-width: 1024px)');

  /* ------------------------------------------------ où suis-je */
  const whereCode = $('.where-code'), whereName = $('.where-name');
  const whereBits = $$('.where-byte rect');
  const backBtn = $('.where .back');
  let zoneId = null;
  function setZone(id) {
    if (!id || id === zoneId) return;
    zoneId = id;
    const z = zoneById(id);
    whereCode.textContent = z.code;
    whereName.textContent = z.name;
    whereBits.forEach((r, i) => r.classList.toggle('on', i === z.bit));
    $$('.store-plan .zone').forEach((g) => g.classList.toggle('is-here', g.dataset.zone === id));
    $$('.plan-zone').forEach((b) => b.classList.toggle('is-here', b.dataset.goZone === id));
  }

  const yous = $$('.store-plan .you');
  function updateYou(x, z, yaw) {
    const [px, py] = toPlan(x, z);
    const t = 'translate(' + px.toFixed(1) + ' ' + py.toFixed(1) + ') rotate(' + (-yaw * 180 / Math.PI).toFixed(1) + ')';
    for (const y of yous) y.setAttribute('transform', t);
  }

  /* ------------------------------------------------ étiquette du produit en vue */
  const tag = $('.tag'), tagName = $('.tag-name'), tagPrice = $('.tag-price'), tagStock = $('.tag-stock');
  let tagFor = null;
  function stockText(p, el) {
    const out = p.stock <= 0, low = !out && p.stock <= 5;
    el.classList.toggle('is-low', low);
    el.classList.toggle('is-out', out);
    el.querySelector('span').textContent = out ? 'Épuisé' : low ? 'Plus que ' + p.stock : 'En stock · ' + p.stock;
  }
  function setTag(entry) {
    if (entry === tagFor) return;
    tagFor = entry;
    tag.classList.toggle('is-on', !!entry);
    if (!entry) return;
    tagName.textContent = entry.data.name;
    tagPrice.textContent = formatPrice(entry.data.price);
    stockText(entry.data, tagStock);
  }
  function placeTag(screen) {
    if (!tagFor || compact.matches) return;
    if (!screen) { tag.style.transform = 'translate3d(-9999px,0,0)'; return; }
    const w = tag.offsetWidth, h = tag.offsetHeight;
    const x = Math.max(16, Math.min(innerWidth - w - 16, screen.x - w / 2));
    const y = Math.max(76, Math.min(innerHeight - h - 16, screen.y - h - 26));
    tag.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
  }
  $('.tag-open').addEventListener('click', () => { if (tagFor) app.openProduct(tagFor); });

  /* ------------------------------------------------ fiche produit */
  const sheet = $('#sheet');
  const sh = {
    photo: $('.sheet-photo', sheet), name: $('.sheet-name', sheet),
    code: $('.meta-code', sheet), zone: $('.meta-zone', sheet), ref: $('.meta-ref', sheet),
    pitch: $('.sheet-pitch', sheet), price: $('.sheet-price', sheet), stock: $('.sheet-stock', sheet),
    specs: $('.sheet-specs', sheet), desc: $('.sheet-desc', sheet), qty: $('.qty-value', sheet),
    add: $('.sheet-add', sheet), addLabel: $('.add-label', sheet)
  };
  let sheetEntry = null, qty = 1, closeTimer = 0, lastFocus = null;

  function openSheet(entry) {
    closeCart(true);
    sheetEntry = entry;
    const p = entry.data, z = entry.zone;
    qty = 1;
    sh.name.textContent = p.name;
    sh.code.textContent = z.code;
    sh.zone.textContent = z.name + (p.brand ? ' · ' + p.brand : '');
    sh.ref.textContent = 'réf. ' + p.ref;
    sh.pitch.textContent = p.pitch;
    sh.price.textContent = formatPrice(p.price);
    stockText(p, sh.stock);
    sh.specs.innerHTML = p.specs.map(([k, v]) => '<dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd>').join('');
    sh.desc.textContent = p.description;
    sh.photo.replaceChildren();
    sh.photo.hidden = !p.photo;
    if (p.photo) {
      const img = new Image();
      img.decoding = 'async';
      img.src = p.photo;
      img.alt = p.name;
      sh.photo.classList.toggle('is-poster', p.id === 'luna-15');
      sh.photo.append(img);
    }
    refreshAdd();
    clearTimeout(closeTimer);
    if (sheet.hidden) lastFocus = document.activeElement;
    sheet.hidden = false;
    $('.sheet-scroll', sheet).scrollTop = 0;
    requestAnimationFrame(() => {
      sheet.classList.add('is-open');
      sheet.focus({ preventScroll: true });
    });
    setTag(null);
    setPanelState(true);
    fadeHint();
    app.onPanel(compact.matches ? { y: sheet.offsetHeight } : { x: sheet.offsetWidth + 24 });
  }

  function closeSheet(silent) {
    if (!sheetEntry) return;
    sheetEntry = null;
    sheet.classList.remove('is-open');
    closeTimer = setTimeout(() => { sheet.hidden = true; }, 240);
    if (!cartOpen) setPanelState(false);
    app.onSheetClosed();
    if (!silent) app.onPanel(null);
    if (lastFocus && lastFocus.focus && !silent) lastFocus.focus({ preventScroll: true });
  }

  function refreshAdd() {
    if (!sheetEntry) return;
    const p = sheetEntry.data;
    const inCart = app.cart.qty(p.id);
    const room = Math.max(0, p.stock - inCart);
    qty = Math.max(1, Math.min(qty, room || 1));
    sh.qty.textContent = qty;
    sh.add.disabled = room <= 0;
    if (!sh.add.classList.contains('is-done')) {
      sh.addLabel.textContent = room <= 0 ? 'Tout le stock est au panier' : inCart ? 'Ajouter au panier (' + inCart + ' déjà)' : 'Ajouter au panier';
    }
  }

  sheet.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const act = a.dataset.action;
    if (act === 'close-sheet') closeSheet();
    if (act === 'qty-minus') { qty = Math.max(1, qty - 1); sh.qty.textContent = qty; }
    if (act === 'qty-plus') { qty = Math.min(qty + 1, Math.max(1, sheetEntry.data.stock - app.cart.qty(sheetEntry.data.id))); sh.qty.textContent = qty; }
    if (act === 'add-to-cart' && sheetEntry) {
      app.cart.add(sheetEntry.data.id, qty);
      sh.add.classList.add('is-done');
      sh.addLabel.textContent = qty > 1 ? qty + ' ajoutés au panier' : 'Ajouté au panier';
      setTimeout(() => { sh.add.classList.remove('is-done'); refreshAdd(); }, 1400);
    }
  });

  /* ------------------------------------------------ panier */
  const cartPanel = $('#cart');
  const cartLines = $('.cart-lines', cartPanel), cartEmpty = $('.cart-empty', cartPanel);
  const cartTotal = $('.cart-total strong', cartPanel), cartFoot = $('.cart-foot', cartPanel);
  const cartCount = $('.cart-count'), cartBtn = $('.dock-btn--cart');
  let cartTimer = 0, cartOpen = false;

  function renderCart() {
    const items = app.cart.items();
    const count = app.cart.count();
    cartCount.textContent = count;
    cartCount.dataset.count = count;
    cartBtn.setAttribute('aria-label', 'Panier, ' + count + (count > 1 ? ' articles' : ' article'));
    cartEmpty.hidden = items.length > 0;
    cartFoot.hidden = items.length === 0;
    cartTotal.textContent = formatPrice(app.cart.total());
    cartLines.innerHTML = items.map(({ product: p, qty: q }) => {
      const z = zoneById(p.zone);
      const thumb = p.photo && p.id !== 'luna-15' ? '<img src="' + p.photo + '" alt="" loading="lazy">' : '<span>' + z.code + '</span>';
      return '<li class="cart-line" data-id="' + p.id + '">' +
        '<div class="cart-thumb">' + thumb + '</div>' +
        '<p class="cart-name"><button type="button" data-cart="show">' + esc(p.name) + '</button></p>' +
        '<p class="cart-sum">' + formatPrice(p.price * q) + '</p>' +
        '<div class="cart-ctrl"><div class="qty" role="group" aria-label="Quantité de ' + esc(p.name) + '">' +
        '<button type="button" class="icon-btn" data-cart="minus" aria-label="Retirer un">' + ICON.minus + '</button>' +
        '<output class="qty-value">' + q + '</output>' +
        '<button type="button" class="icon-btn" data-cart="plus" aria-label="Ajouter un"' + (q >= p.stock ? ' disabled' : '') + '>' + ICON.plus + '</button></div>' +
        '<span class="cart-unit">' + formatPrice(p.price) + ' l’unité</span>' +
        '<button type="button" class="icon-btn" data-cart="remove" aria-label="Retirer ' + esc(p.name) + ' du panier">' + ICON.trash + '</button></div>' +
        '</li>';
    }).join('');
    $$('.store-plan .cart-dots').forEach((g) => {
      g.innerHTML = items.map(({ product }) => {
        const e = app.entry(product.id);
        if (!e || !e.center) return '';
        const [x, y] = toPlan(e.center.x, e.center.z);
        return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.2"/>';
      }).join('');
    });
    refreshAdd();
  }

  cartLines.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cart]');
    if (!b) return;
    const id = b.closest('.cart-line').dataset.id;
    const q = app.cart.qty(id);
    const p = products.find((x) => x.id === id);
    if (b.dataset.cart === 'minus') app.cart.set(id, q - 1);
    if (b.dataset.cart === 'plus') app.cart.set(id, Math.min(p.stock, q + 1));
    if (b.dataset.cart === 'remove') app.cart.remove(id);
    if (b.dataset.cart === 'show') { closeCart(); app.openProduct(app.entry(id)); }
  });

  function openCart() {
    if (sheetEntry) closeSheet(true);
    clearTimeout(cartTimer);
    renderCart();
    cartOpen = true;
    lastFocus = document.activeElement;
    cartPanel.hidden = false;
    requestAnimationFrame(() => { cartPanel.classList.add('is-open'); cartPanel.focus({ preventScroll: true }); });
    setPanelState(true);
    fadeHint();
    app.onPanel(compact.matches ? null : { x: cartPanel.offsetWidth + 24 });
  }
  function closeCart(silent) {
    if (!cartOpen) return;
    cartOpen = false;
    cartPanel.classList.remove('is-open');
    cartTimer = setTimeout(() => { cartPanel.hidden = true; }, 240);
    if (!sheetEntry) setPanelState(false);
    if (!silent) { app.onPanel(null); lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true }); }
  }

  let bump = 0;
  app.cart.on(() => {
    renderCart();
    cartCount.classList.add('is-bumped');
    clearTimeout(bump);
    bump = setTimeout(() => cartCount.classList.remove('is-bumped'), 200);
  });

  /* ------------------------------------------------ recherche */
  const search = $('#search'), input = $('input', search), results = $('#search-results');
  const index = products.map((p) => ({ p, zone: zoneById(p.zone), hay: fold([p.name, p.brand, zoneById(p.zone).name, p.ref, p.pitch, ...p.specs.flat()].filter(Boolean).join(' ')) }));
  let matches = [], sel = 0;

  function renderSearch() {
    const q = fold(input.value.trim());
    const words = q.split(/\s+/).filter(Boolean);
    matches = index.filter((it) => words.every((w) => it.hay.includes(w)));
    sel = Math.min(sel, Math.max(0, matches.length - 1));
    if (!matches.length) { results.innerHTML = '<li class="search-none" role="presentation">Aucun produit ne correspond. Essayez un autre mot, ou ouvrez le plan.</li>'; return; }
    let html = '', lastZone = null;
    matches.forEach((it, i) => {
      if (it.zone.id !== lastZone) {
        lastZone = it.zone.id;
        html += '<li class="search-group" role="presentation"><span>' + it.zone.code + '</span>' + esc(it.zone.name) + '</li>';
      }
      let name = esc(it.p.name);
      if (words.length) {
        const plain = fold(it.p.name), w = words[0], at = plain.indexOf(w);
        if (at >= 0) name = esc(it.p.name.slice(0, at)) + '<mark>' + esc(it.p.name.slice(at, at + w.length)) + '</mark>' + esc(it.p.name.slice(at + w.length));
      }
      html += '<li class="search-item" role="option" id="sr-' + i + '" data-i="' + i + '" aria-selected="' + (i === sel) + '">' +
        '<span class="si-name">' + name + '</span><span class="si-price">' + formatPrice(it.p.price) + '</span>' +
        '<span class="si-meta">' + esc([it.p.brand, it.p.pitch].filter(Boolean).join(' · ')) + '</span></li>';
    });
    results.innerHTML = html;
    input.setAttribute('aria-activedescendant', 'sr-' + sel);
  }
  function moveSel(d) {
    if (!matches.length) return;
    sel = (sel + d + matches.length) % matches.length;
    $$('.search-item', results).forEach((el) => el.setAttribute('aria-selected', String(Number(el.dataset.i) === sel)));
    const el = $('#sr-' + sel);
    el && el.scrollIntoView({ block: 'nearest' });
    input.setAttribute('aria-activedescendant', 'sr-' + sel);
  }
  function choose(i) {
    const it = matches[i];
    if (!it) return;
    closeSearch();
    const e = app.entry(it.p.id);
    if (e) app.openProduct(e);
  }
  function openSearch() {
    closePlan();
    fadeHint(0);
    lastFocus = document.activeElement;
    search.hidden = false;
    input.value = '';
    sel = 0;
    renderSearch();
    input.focus();
  }
  function closeSearch() {
    if (search.hidden) return;
    search.hidden = true;
    lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
  }
  input.addEventListener('input', () => { sel = 0; renderSearch(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveSel(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSel(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(sel); }
  });
  results.addEventListener('click', (e) => { const li = e.target.closest('.search-item'); if (li) choose(Number(li.dataset.i)); });
  search.addEventListener('click', (e) => { if (e.target === search) closeSearch(); });

  /* ------------------------------------------------ plan */
  const plan = $('#plan');
  function openPlan() {
    closeSearch();
    fadeHint(0);
    lastFocus = document.activeElement;
    plan.hidden = false;
    $('[data-action="close-plan"]', plan).focus();
  }
  function closePlan() {
    if (plan.hidden) return;
    plan.hidden = true;
    lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
  }
  plan.addEventListener('click', (e) => {
    if (e.target === plan) { closePlan(); return; }
    const z = e.target.closest('[data-go-zone], .plan-big .zone');
    if (z) { closePlan(); app.goZone(z.dataset.goZone || z.dataset.zone); }
  });
  plan.addEventListener('keydown', (e) => {
    const z = e.target.closest && e.target.closest('.plan-big .zone');
    if (z && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); closePlan(); app.goZone(z.dataset.zone); }
  });

  /* ------------------------------------------------ légende, message, aide */
  const caption = $('.caption');
  function showCaption(z) {
    if (!z) { caption.hidden = true; return; }
    const name = $('.caption-name', caption);
    name.innerHTML = '<span class="caption-code">' + z.code + '</span><span></span>';
    name.lastChild.textContent = z.name;
    $('.caption-text', caption).textContent = z.blurb;
    caption.hidden = false;
  }

  const toast = $('.toast');
  let toastTimer = 0, toastAction = null;
  function showToast(text, label, action, ms = 9000) {
    $('.toast-text', toast).textContent = text;
    const b = $('[data-action="toast"]', toast);
    b.hidden = !label;
    b.textContent = label || '';
    toastAction = action;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, ms);
  }

  const hint = $('.hint');
  let hintDone = false;
  function fadeHint(delay = 2600) {
    if (hintDone) return;
    hintDone = true;
    setTimeout(() => hint.classList.add('is-faded'), delay);
  }
  /* un panneau ouvert à droite (ordinateur) : la barre d'outils se range à sa gauche */
  function setPanelState(open) {
    hud.dataset.panel = open && !compact.matches ? 'open' : '';
  }

  /* ------------------------------------------------ manette tactile */
  const stick = $('.stick'), knob = $('.stick-knob');
  let stickId = null;
  function stickMove(e) {
    const r = stick.getBoundingClientRect(), max = r.width / 2 - 12;
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const l = Math.hypot(dx, dy);
    if (l > max) { dx = dx / l * max; dy = dy / l * max; }
    knob.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
    app.nav.setStick(dx / max, dy / max);
  }
  function stickEnd(e) {
    if (stickId === null || (e && e.pointerId !== stickId)) return;
    stickId = null;
    stick.classList.remove('is-active');
    knob.style.transform = '';
    app.nav.setStick(0, 0);
  }
  stick.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    stickId = e.pointerId;
    stick.classList.add('is-active');
    try { stick.setPointerCapture(e.pointerId); } catch (err) { /* ignoré */ }
    stickMove(e);
  });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) { e.preventDefault(); stickMove(e); } });
  stick.addEventListener('pointerup', stickEnd);
  stick.addEventListener('pointercancel', stickEnd);
  stick.addEventListener('lostpointercapture', stickEnd);

  /* ------------------------------------------------ boutons et raccourcis */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    switch (a.dataset.action) {
      case 'search': openSearch(); break;
      case 'close-search': closeSearch(); break;
      case 'plan': closeCart(); openPlan(); break;
      case 'close-plan': closePlan(); break;
      case 'cart': cartOpen ? closeCart() : openCart(); break;
      case 'close-cart': closeCart(); break;
      case 'go-till': closeCart(true); app.goZone('caisses'); break;
      case 'tour': closePlan(); app.toggleTour(); break;
      case 'back': app.back(); break;
      case 'home': app.goZone('accueil'); break;
      case 'toast': toast.hidden = true; toastAction && toastAction(); break;
      case 'sound': app.toggleSound(a); break;
      case 'catalog': app.catalogOnly(); openSearch(); break;
    }
  });

  window.addEventListener('keydown', (e) => {
    const typing = e.target.closest && e.target.closest('input, textarea');
    if (e.key === 'Escape') {
      if (!search.hidden) closeSearch();
      else if (!plan.hidden) closePlan();
      else if (cartOpen) closeCart();
      else if (sheetEntry) closeSheet();
      return;
    }
    if (typing) return;
    if (!search.hidden || !plan.hidden) return;
    const k = e.key.toLowerCase();
    if (k === '/' || ((e.ctrlKey || e.metaKey) && k === 'k')) { e.preventDefault(); openSearch(); }
    else if (k === 'm' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); openPlan(); }
    else if ((k === 'e' || (k === 'enter' && e.target === document.body)) && tagFor && !sheetEntry) { e.preventDefault(); app.openProduct(tagFor); }
  });

  renderCart();

  return {
    get overlayOpen() { return !search.hidden || !plan.hidden; },
    get sheetEntry() { return sheetEntry; },
    get cartOpen() { return cartOpen; },
    ready() {
      hud.dataset.ready = 'true';
    },
    setZone, openSheet, closeSheet, closeCart, openSearch, showCaption, showToast, fadeHint, refreshCart: renderCart,
    setTour(on) { $$('[data-action="tour"]').forEach((b) => { b.setAttribute('aria-pressed', String(on)); }); if (!on) showCaption(null); },
    setBack(on) { if (backBtn.hidden === on) backBtn.hidden = !on; },
    showSound() { const b = $('[data-action="sound"]'); if (b) b.hidden = false; },
    frame({ position, yaw, focused, project, traveling }) {
      setZone(zoneAt(position.x, position.z));
      updateYou(position.x, position.z, yaw);
      const showTag = focused && !sheetEntry && !cartOpen && !traveling && focused !== sheetEntry;
      setTag(showTag ? focused : null);
      if (showTag) placeTag(project(focused.tagAnchor));
    },
    isCompact: () => compact.matches,
    isCoarse: () => coarse.matches
  };
}
