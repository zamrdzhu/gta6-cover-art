// main.js — wires the Vice Cover Studio editor: photo slots, panel picking,
// caption and look controls, live preview and PNG export in the three post
// sizes. A `?shot=` query hands control to shots.js instead, for
// reproducible screenshots. Photos are read on this machine only and are
// never uploaded anywhere.

import { drawCover, panelRects, SIZES, LAYOUTS, GRADES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const captionInput = document.getElementById('caption');
const subcaptionInput = document.getElementById('subcaption');
const layoutSelect = document.getElementById('layout');
const gradeSelect = document.getElementById('grade');
const sizeSelect = document.getElementById('size');
const panelChips = document.getElementById('panel-chips');
const assignSelect = document.getElementById('assign');
const zoomInput = document.getElementById('zoom');
const panXInput = document.getElementById('panx');
const panYInput = document.getElementById('pany');
const photoSlots = document.getElementById('photo-slots');

export const state = {
  size: 'square',
  layout: 'poster',
  grade: 'sunset',
  caption: 'Sunset Heist',
  subcaption: 'Neon nights · 2026',
  photos: [null, null, null, null],
  panels: [
    { photo: -1, zoom: 1, ox: 0, oy: 0 },
    { photo: -1, zoom: 1, ox: 0, oy: 0 },
    { photo: -1, zoom: 1, ox: 0, oy: 0 },
  ],
  selectedPanel: 0,
};

let fontsReady = false;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Loads the bundled display fonts so the canvas lettering uses them. */
export async function loadFonts() {
  if (fontsReady) return;
  try {
    const anton = new FontFace('Anton', 'url(fonts/Anton-Regular.ttf)');
    const archivo = new FontFace('Archivo Black', 'url(fonts/ArchivoBlack-Regular.ttf)');
    const oswald = new FontFace('Oswald', 'url(fonts/Oswald-Variable.ttf)');
    const loaded = await Promise.all([anton.load(), archivo.load(), oswald.load()]);
    loaded.forEach((face) => document.fonts.add(face));
    await document.fonts.ready;
  } catch {
    // The canvas falls back to system sans-serif; the cover still draws.
  }
  fontsReady = true;
}

function panelCount() {
  return panelRects(state.size, state.layout).panels.length;
}

function ensurePanels() {
  const n = panelCount();
  while (state.panels.length < n) state.panels.push({ photo: -1, zoom: 1, ox: 0, oy: 0 });
  state.panels.length = n;
  if (state.selectedPanel >= n) state.selectedPanel = 0;
}

export function redraw() {
  ensurePanels();
  drawCover(canvas, state);
}

function setStatus(text) {
  statusEl.textContent = text;
}

function buildPhotoSlots() {
  photoSlots.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    const label = document.createElement('label');
    label.className = 'slot-label';
    label.textContent = `Photo ${i + 1}`;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('aria-label', `Photo ${i + 1}`);
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        state.photos[i] = await loadImage(URL.createObjectURL(file));
        state.panels.forEach((p) => {
          if (p.photo === -1) p.photo = i;
        });
        if (state.panels.every((p) => p.photo === i)) {
          // First photo fills the poster; later ones wait to be assigned.
        }
        buildPhotoSlots();
        syncPanelControls();
        redraw();
        setStatus(`Photo ${i + 1} loaded — click a panel, then pick its photo.`);
      } catch {
        setStatus('That file could not be read as a photo.');
      }
    });
    const thumb = document.createElement('span');
    thumb.className = 'thumb';
    thumb.textContent = photo ? '✓ loaded' : 'empty';
    slot.append(label, input, thumb);
    photoSlots.append(slot);
  });
}

function buildPanelChips() {
  panelChips.innerHTML = '';
  const n = panelCount();
  const names = ['Hero', 'Panel 2', 'Panel 3'];
  for (let i = 0; i < n; i++) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip' + (i === state.selectedPanel ? ' active' : '');
    chip.textContent = names[i] ?? `Panel ${i + 1}`;
    chip.addEventListener('click', () => {
      state.selectedPanel = i;
      buildPanelChips();
      syncPanelControls();
      redraw();
    });
    panelChips.append(chip);
  }
}

function syncPanelControls() {
  const panel = state.panels[state.selectedPanel];
  assignSelect.innerHTML = '';
  const none = document.createElement('option');
  none.value = '-1';
  none.textContent = 'Empty panel';
  assignSelect.append(none);
  state.photos.forEach((photo, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `Photo ${i + 1}${photo ? '' : ' (empty)'}`;
    assignSelect.append(opt);
  });
  assignSelect.value = String(panel.photo);
  zoomInput.value = String(panel.zoom);
  panXInput.value = String(panel.ox);
  panYInput.value = String(panel.oy);
}

function fillSelect(select, entries) {
  select.innerHTML = '';
  Object.entries(entries).forEach(([value, label]) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    select.append(opt);
  });
}

function exportPng(sizeKey) {
  const size = SIZES[sizeKey];
  const off = document.createElement('canvas');
  const snapshot = { ...state, size: sizeKey, selectedPanel: -1 };
  drawCover(off, snapshot);
  off.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed — try again.');
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${size.width}x${size.height}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved vice-cover-${size.width}x${size.height}.png`);
  }, 'image/png');
}

captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
subcaptionInput.addEventListener('input', () => { state.subcaption = subcaptionInput.value; redraw(); });
layoutSelect.addEventListener('change', () => {
  state.layout = layoutSelect.value;
  ensurePanels();
  buildPanelChips();
  syncPanelControls();
  redraw();
});
gradeSelect.addEventListener('change', () => { state.grade = gradeSelect.value; redraw(); });
sizeSelect.addEventListener('change', () => {
  state.size = sizeSelect.value;
  ensurePanels();
  buildPanelChips();
  syncPanelControls();
  redraw();
});
assignSelect.addEventListener('change', () => {
  state.panels[state.selectedPanel].photo = Number(assignSelect.value);
  redraw();
});
zoomInput.addEventListener('input', () => {
  state.panels[state.selectedPanel].zoom = Number(zoomInput.value);
  redraw();
});
panXInput.addEventListener('input', () => {
  state.panels[state.selectedPanel].ox = Number(panXInput.value);
  redraw();
});
panYInput.addEventListener('input', () => {
  state.panels[state.selectedPanel].oy = Number(panYInput.value);
  redraw();
});
document.getElementById('fill-all').addEventListener('click', () => {
  const photo = state.panels[state.selectedPanel].photo;
  if (photo < 0) {
    setStatus('Pick a photo for this panel first, then fill all panels with it.');
    return;
  }
  state.panels.forEach((p) => { p.photo = photo; });
  redraw();
  setStatus(`All panels now show Photo ${photo + 1}.`);
});
document.getElementById('export').addEventListener('click', () => exportPng(state.size));
document.getElementById('export-all').addEventListener('click', () => {
  Object.keys(SIZES).forEach((key, i) => {
    setTimeout(() => exportPng(key), i * 350);
  });
  setStatus('Exporting all three sizes…');
});

// Clicking the preview picks the panel under the pointer.
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const px = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const py = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const { panels } = panelRects(state.size, state.layout);
  const hit = panels.findIndex((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
  if (hit >= 0) {
    state.selectedPanel = hit;
    buildPanelChips();
    syncPanelControls();
    redraw();
  }
});

fillSelect(layoutSelect, LAYOUTS);
fillSelect(gradeSelect, GRADES);
fillSelect(sizeSelect, SIZES);
layoutSelect.value = state.layout;
gradeSelect.value = state.grade;
sizeSelect.value = state.size;
buildPhotoSlots();
buildPanelChips();
syncPanelControls();

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  loadFonts().then(() => runShot(shot, query, {
    loadImage, state, redraw, setStatus, buildPhotoSlots, syncPanelControls,
  }));
} else {
  loadFonts().then(redraw);
  redraw();
}
