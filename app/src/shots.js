// shots.js — deterministic scenes for screenshots, driven by the URL query.
//
//   ?shot=cover&photo=boulevard&caption=Sunset%20Heist
//       The finished cover alone, full-bleed: the first screenshot.
//       Optional: photo2=<sample> fills the smaller panels, size=square|
//       portrait|wide, layout=poster|split|strip, grade=sunset|neon|dusk,
//       subcaption=<words>.
//   ?shot=editor&photo=boulevard&caption=Boulevard%20Queen
//       The editor with a sample photo loaded, as a person sees it.
//
// window.__shotReady is set once the fonts are in and the cover is painted,
// so a screenshot tool can wait for it instead of guessing a delay.

const SAMPLES = ['boulevard', 'pier'];

function sampleName(query, key, fallback) {
  const name = query.get(key) ?? fallback;
  return SAMPLES.includes(name) ? name : fallback;
}

/** Applies a shot scene. `api` is { loadImage, state, redraw, setStatus }. */
export async function runShot(shot, query, api) {
  const { loadImage, state, redraw } = api;
  const caption = query.get('caption') ?? 'Sunset Heist';
  const subcaption = query.get('subcaption') ?? state.subcaption;
  const size = query.get('size') ?? 'square';
  const layout = query.get('layout') ?? 'poster';
  const grade = query.get('grade') ?? 'sunset';

  if (['square', 'portrait', 'wide'].includes(size)) state.size = size;
  if (['poster', 'split', 'strip'].includes(layout)) state.layout = layout;
  if (['sunset', 'neon', 'dusk'].includes(grade)) state.grade = grade;
  state.caption = caption;
  state.subcaption = subcaption;

  const main = await loadImage(`samples/${sampleName(query, 'photo', 'boulevard')}.jpg`);
  const second = await loadImage(`samples/${sampleName(query, 'photo2', sampleName(query, 'photo', 'boulevard'))}.jpg`);
  state.photos[0] = main;
  state.photos[1] = second;
  state.panels.forEach((panel, i) => {
    // Alternate the two samples across the panels so no cover shows the
    // same photo twice in a row.
    panel.photo = i === 0 ? 0 : (i % 2 === 1 ? 1 : 0);
    panel.zoom = 1;
    panel.ox = 0;
    panel.oy = 0;
  });
  // The pier shot reads better zoomed slightly into the fisherman.
  if (sampleName(query, 'photo', 'boulevard') === 'pier') {
    state.panels[0].zoom = 1.12;
    state.panels[0].oy = -0.04;
  }
  // The editor's slot list and panel controls show the shot's photos too.
  if (typeof api.buildPhotoSlots === 'function') api.buildPhotoSlots();
  if (typeof api.syncPanelControls === 'function') api.syncPanelControls();

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    state.selectedPanel = -1;
    const sizeSelect = document.getElementById('size');
    if (sizeSelect) sizeSelect.value = state.size;
  } else {
    // Editor shot: keep the controls visible and the hero panel selected.
    state.selectedPanel = 0;
    const captionInput = document.getElementById('caption');
    if (captionInput) captionInput.value = caption;
  }
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
