/* =============================================================
   Niveau de qualité : on part d'une estimation du matériel, puis
   on ajuste la résolution de rendu selon la fluidité mesurée.
   ============================================================= */

export function detectTier() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const phone = coarse && Math.min(screen.width, screen.height) < 820;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 8;
  const dpr = window.devicePixelRatio || 1;
  const weak = cores <= 4 || memory <= 3;

  let level = 'high';
  if (phone || weak) level = 'low';
  else if (cores <= 8 || dpr > 1.5) level = 'mid';
  // réglage manuel : ?qualite=basse | moyenne | haute
  const forced = { basse: 'low', moyenne: 'mid', haute: 'high' }[new URLSearchParams(location.search).get('qualite')];
  if (forced) level = forced;

  const settings = {
    // sur téléphone, l'écran est très dense : on garde la netteté (l'anticrénelage
    // coûte peu sur ces puces) et on économise plutôt sur les ombres
    low: phone && !weak
      ? { antialias: true, maxRatio: 2, shadows: false, shadowSize: 0 }
      : { antialias: false, maxRatio: phone ? 1.5 : 1.25, shadows: false, shadowSize: 0 },
    mid: { antialias: true, maxRatio: 1.5, shadows: true, shadowSize: 1024 },
    high: { antialias: true, maxRatio: 2, shadows: true, shadowSize: 2048 }
  }[level];

  return { level, mobile: phone, ...settings, ratio: Math.min(dpr, settings.maxRatio) };
}

/* baisse la résolution de rendu quand l'image saccade, sans passer sous un pixel par point.
   Si une baisse n'accélère rien (écran bridé à 30 images/s, processeur saturé),
   on revient à la résolution d'avant et on n'y touche plus : l'image resterait floue pour rien. */
export function createAdaptiveResolution(renderer, tier, onChange) {
  let frames = 0, time = 0, ratio = tier.ratio;
  const min = Math.min(tier.ratio, Math.max(1, tier.ratio * 0.6));
  let cooldown = 3, tried = null, settled = false;

  function set(next) {
    ratio = next;
    renderer.setPixelRatio(ratio);
    onChange && onChange(ratio);
    cooldown = 1.5;
    frames = 0; time = 0;
  }

  return function sample(dt) {
    if (settled) return;
    if (cooldown > 0) { cooldown -= dt; return; }
    frames++; time += dt;
    if (time < 2) return;
    const ms = (time / frames) * 1000;
    frames = 0; time = 0;
    if (tried) {
      const helped = ms < tried.ms * 0.88;
      if (!helped) { set(tried.ratio); settled = true; return; }
      tried = null;
    }
    if (ms > 24 && ratio > min) {
      tried = { ms, ratio };
      set(Math.max(min, ratio - 0.25));
    } else if (ms < 14 && ratio < tier.ratio) set(Math.min(tier.ratio, ratio + 0.25));
  };
}
