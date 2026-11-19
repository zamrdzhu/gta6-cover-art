// cover.js — the cover renderer for Vice Cover Studio.
//
// A cover is a multi-panel poster: two or three photo panels separated by
// white gutters, a sunset sky band along the foot, and one big bold caption
// set in Anton with a dark outline. Every size (square, portrait, wide) has
// its own panel geometry, and every panel keeps its own photo, zoom and
// pan, so one photo can fill the whole poster or several photos can share it.
//
// The grade is applied twice: a CSS filter on the photo itself (warm and
// saturated for sunset, hot magenta/cyan for neon, cool purple for dusk),
// then a translucent colour wash over the panel. Nothing here copies any
// game's artwork: the panels, the sun, the rays and the lettering are all
// drawn from scratch on the canvas.

export const SIZES = {
  square: { width: 1080, height: 1080, label: 'Square · 1080 × 1080' },
  portrait: { width: 1080, height: 1350, label: 'Portrait · 1080 × 1350' },
  wide: { width: 1920, height: 1080, label: 'Wide · 1920 × 1080' },
};

export const LAYOUTS = {
  poster: 'Poster · hero + two panels',
  split: 'Split · two big panels',
  strip: 'Strip · three tall panels',
};

export const GRADES = {
  sunset: 'Sunset · warm orange to pink',
  neon: 'Neon · hot magenta and cyan',
  dusk: 'Dusk · cool violet night',
};

// Panel rectangles as fractions of the canvas [x, y, width, height], plus
// the title band rectangle, for each size and layout. The title band sits
// below the panels; the gutters between panels are the canvas paper showing.
const GEOMETRIES = {
  poster: {
    square: {
      panels: [[0, 0, 0.585, 0.8], [0.585, 0, 0.415, 0.395], [0.585, 0.395, 0.415, 0.405]],
      title: [0, 0.8, 1, 0.2],
    },
    portrait: {
      panels: [[0, 0, 1, 0.48], [0, 0.48, 0.5, 0.34], [0.5, 0.48, 0.5, 0.34]],
      title: [0, 0.82, 1, 0.18],
    },
    wide: {
      panels: [[0, 0, 0.55, 0.78], [0.55, 0, 0.45, 0.385], [0.55, 0.385, 0.45, 0.395]],
      title: [0, 0.78, 1, 0.22],
    },
  },
  split: {
    square: {
      panels: [[0, 0, 0.5, 0.8], [0.5, 0, 0.5, 0.8]],
      title: [0, 0.8, 1, 0.2],
    },
    portrait: {
      panels: [[0, 0, 1, 0.41], [0, 0.41, 1, 0.41]],
      title: [0, 0.82, 1, 0.18],
    },
    wide: {
      panels: [[0, 0, 0.5, 0.78], [0.5, 0, 0.5, 0.78]],
      title: [0, 0.78, 1, 0.22],
    },
  },
  strip: {
    square: {
      panels: [[0, 0, 1 / 3, 0.8], [1 / 3, 0, 1 / 3, 0.8], [2 / 3, 0, 1 / 3, 0.8]],
      title: [0, 0.8, 1, 0.2],
    },
    portrait: {
      panels: [[0, 0, 1 / 3, 0.82], [1 / 3, 0, 1 / 3, 0.82], [2 / 3, 0, 1 / 3, 0.82]],
      title: [0, 0.82, 1, 0.18],
    },
    wide: {
      panels: [[0, 0, 1 / 3, 0.78], [1 / 3, 0, 1 / 3, 0.78], [2 / 3, 0, 1 / 3, 0.78]],
      title: [0, 0.78, 1, 0.22],
    },
  },
};

/** The panel rectangles (in canvas pixels) for a size and layout. */
export function panelRects(sizeKey, layoutKey) {
  const size = SIZES[sizeKey] ?? SIZES.square;
  const geo = GEOMETRIES[layoutKey] ?? GEOMETRIES.poster;
  const set = geo[sizeKey] ?? geo.square;
  const gutter = Math.round(Math.min(size.width, size.height) * 0.014);
  return {
    gutter,
    panels: set.panels.map(([fx, fy, fw, fh]) => ({
      x: Math.round(fx * size.width) + (fx > 0 ? gutter / 2 : gutter),
      y: Math.round(fy * size.height) + (fy > 0 ? gutter / 2 : gutter),
      w: Math.round(fw * size.width) - gutter,
      h: Math.round(fh * size.height) - gutter,
    })),
    title: {
      x: 0,
      y: Math.round(set.title[1] * size.height),
      w: size.width,
      h: Math.round(set.title[3] * size.height),
    },
  };
}

const PHOTO_FILTERS = {
  sunset: 'saturate(1.32) contrast(1.08) brightness(1.03)',
  neon: 'saturate(1.65) contrast(1.14) brightness(1.0) hue-rotate(-14deg)',
  dusk: 'saturate(1.12) contrast(1.06) brightness(0.92) sepia(0.18)',
};

const SKY_STOPS = {
  sunset: ['#ff9e2c', '#ff5e62', '#c7247d', '#5b1a6e'],
  neon: ['#ff2e88', '#b01aff', '#2de2ff', '#12082e'],
  dusk: ['#3b2a7a', '#241a4d', '#120a2e', '#0b0620'],
};

const WASH_STOPS = {
  sunset: ['rgba(255, 140, 40, 0)', 'rgba(255, 90, 60, 0.22)', 'rgba(190, 40, 140, 0.30)'],
  neon: ['rgba(255, 46, 136, 0)', 'rgba(255, 46, 136, 0.18)', 'rgba(45, 226, 255, 0.22)'],
  dusk: ['rgba(80, 60, 180, 0)', 'rgba(80, 60, 180, 0.16)', 'rgba(20, 10, 50, 0.34)'],
};

function fitCaption(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px Anton, "Archivo Black", sans-serif`;
  while (size > 24 && ctx.measureText(text).width > maxWidth) {
    size = Math.floor(size * 0.94);
    ctx.font = `${size}px Anton, "Archivo Black", sans-serif`;
  }
  return size;
}

function drawPhotoPanel(ctx, rect, photo, panel, grade) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (photo) {
    const zoom = panel.zoom || 1;
    const scale = Math.max(w / photo.naturalWidth, h / photo.naturalHeight) * zoom;
    const pw = photo.naturalWidth * scale;
    const ph = photo.naturalHeight * scale;
    // A portrait photo in a landscape panel is cropped top and bottom by the
    // cover fit; bias the crop upward so a face near the top stays in frame
    // unless the person panned it themselves. The wider the panel, the
    // stronger the bias, since the crop is harsher there.
    let biasY = 0;
    if ((panel.oy || 0) === 0 && photo.naturalHeight > photo.naturalWidth && w > h) {
      const frac = Math.min(0.38, 0.18 + Math.max(0, w / h - 1.2) * 0.12);
      biasY = -(ph - h) * frac;
    }
    const dx = x + (w - pw) / 2 + (panel.ox || 0) * w;
    const dy = y + (h - ph) / 2 + (panel.oy || 0) * h + biasY;
    ctx.filter = PHOTO_FILTERS[grade] ?? PHOTO_FILTERS.sunset;
    ctx.drawImage(photo, dx, dy, pw, ph);
    ctx.filter = 'none';
  } else {
    const empty = ctx.createLinearGradient(x, y, x + w, y + h);
    empty.addColorStop(0, '#3a2350');
    empty.addColorStop(1, '#160b26');
    ctx.fillStyle = empty;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = Math.max(2, w * 0.004);
    for (let d = -h; d < w; d += Math.max(28, w * 0.06)) {
      ctx.beginPath();
      ctx.moveTo(x + d, y + h);
      ctx.lineTo(x + d + h, y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `600 ${Math.max(18, Math.round(w * 0.045))}px Oswald, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD A PHOTO', x + w / 2, y + h / 2);
  }
  // Colour wash: warm at the foot of the panel, cool at the top.
  const wash = ctx.createLinearGradient(0, y, 0, y + h);
  const stops = WASH_STOPS[grade] ?? WASH_STOPS.sunset;
  wash.addColorStop(0, stops[0]);
  wash.addColorStop(0.55, stops[1]);
  wash.addColorStop(1, stops[2]);
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);
  // Vignette: darken the panel edges so the white gutters pop.
  const vig = ctx.createRadialGradient(
    x + w / 2, y + h / 2, Math.min(w, h) * 0.35,
    x + w / 2, y + h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(10, 4, 20, 0)');
  vig.addColorStop(1, 'rgba(10, 4, 20, 0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  // Thin dark keyline around the panel.
  ctx.strokeStyle = 'rgba(16, 6, 28, 0.85)';
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.strokeRect(x, y, w, h);
}

// Sun rays fanning out of the hero panel's top corner, drawn under the
// wash so they read as light, not as white shapes.
function drawSunRays(ctx, rect) {
  const { x, y, w, h } = rect;
  const cx = x + w * 0.78;
  const cy = y + h * 0.12;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.9);
  glow.addColorStop(0, 'rgba(255, 214, 120, 0.45)');
  glow.addColorStop(0.35, 'rgba(255, 150, 80, 0.14)');
  glow.addColorStop(1, 'rgba(255, 150, 80, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255, 240, 200, 0.06)';
  for (let i = 0; i < 7; i++) {
    const a0 = (Math.PI * (0.15 + i * 0.13));
    const a1 = a0 + Math.PI * 0.05;
    const r = Math.max(w, h) * 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, a0, a1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// Faint halftone dots across the title band, a print-poster texture.
function drawHalftone(ctx, rect, spacing) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
  for (let yy = rect.y + spacing / 2; yy < rect.y + rect.h; yy += spacing) {
    for (let xx = rect.x + spacing / 2; xx < rect.x + rect.w; xx += spacing) {
      ctx.beginPath();
      ctx.arc(xx, yy, Math.max(1, spacing * 0.09), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawTitleBand(ctx, rect, caption, subcaption, grade, width) {
  const { x, y, w, h } = rect;
  const sky = ctx.createLinearGradient(x, y, x + w, y + h);
  const stops = SKY_STOPS[grade] ?? SKY_STOPS.sunset;
  sky.addColorStop(0, stops[0]);
  sky.addColorStop(0.38, stops[1]);
  sky.addColorStop(0.72, stops[2]);
  sky.addColorStop(1, stops[3]);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  // The setting sun, low on the right of the band.
  const sunX = x + w * 0.84;
  const sunY = y + h * 0.42;
  const sunR = h * 0.62;
  const sun = ctx.createRadialGradient(sunX, sunY, sunR * 0.1, sunX, sunY, sunR);
  sun.addColorStop(0, 'rgba(255, 246, 200, 0.98)');
  sun.addColorStop(0.55, 'rgba(255, 190, 90, 0.85)');
  sun.addColorStop(1, 'rgba(255, 120, 60, 0)');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  drawHalftone(ctx, rect, Math.max(14, h * 0.16));
  // Horizon glow line where the band meets the panels.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillRect(x, y, w, Math.max(2, h * 0.02));

  const text = (caption || '').trim().toUpperCase() || 'SUNSET HEIST';
  const sub = (subcaption || '').trim().toUpperCase();
  ctx.save();
  ctx.translate(x + w * 0.045, y + h * 0.56);
  ctx.rotate(-0.028);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const size = fitCaption(ctx, text, w * 0.86, h * 0.52);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160826';
  ctx.lineWidth = Math.max(3, size * 0.09);
  ctx.strokeText(text, 0, 0);
  ctx.shadowColor = 'rgba(20, 4, 40, 0.55)';
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetY = size * 0.05;
  const grad = ctx.createLinearGradient(0, -size * 0.55, 0, size * 0.55);
  grad.addColorStop(0, '#fffdf6');
  grad.addColorStop(0.55, '#ffe9a8');
  grad.addColorStop(1, '#ffb35c');
  ctx.fillStyle = grad;
  ctx.fillText(text, 0, 0);
  ctx.restore();

  if (sub) {
    ctx.save();
    ctx.font = `600 ${Math.max(14, Math.round(h * 0.16))}px Oswald, sans-serif`;
    try { ctx.letterSpacing = `${Math.max(2, h * 0.03)}px`; } catch { /* older canvas */ }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fillText(sub, x + w * 0.05, y + h * 0.90);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
    ctx.restore();
  }
}

/**
 * Draws the whole cover onto `canvas` (which must already be sized to the
 * chosen export size). `state` is { size, layout, grade, caption,
 * subcaption, photos, panels, selectedPanel } where photos is an array of
 * images (or null) and panels[i] is { photo, zoom, ox, oy } with photo an
 * index into photos or -1 for empty.
 */
export function drawCover(canvas, state) {
  const size = SIZES[state.size] ?? SIZES.square;
  const grade = state.grade ?? 'sunset';
  const layout = state.layout ?? 'poster';
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  // Warm paper: the gutters and the outer frame of the poster.
  ctx.fillStyle = '#f7f1e6';
  ctx.fillRect(0, 0, w, h);
  const { panels, title } = panelRects(state.size, layout);
  panels.forEach((rect, i) => {
    const panel = (state.panels && state.panels[i]) || { photo: -1, zoom: 1, ox: 0, oy: 0 };
    const photo = panel.photo >= 0 ? state.photos[panel.photo] : null;
    drawPhotoPanel(ctx, rect, photo, panel, grade);
    if (i === 0) drawSunRays(ctx, rect);
  });
  drawTitleBand(ctx, title, state.caption, state.subcaption, grade, w);
  // Selected panel gets a hot outline in the editor preview only.
  if (typeof state.selectedPanel === 'number' && panels[state.selectedPanel]) {
    const r = panels[state.selectedPanel];
    ctx.strokeStyle = '#ff2e88';
    ctx.lineWidth = Math.max(4, w * 0.006);
    ctx.setLineDash([Math.max(12, w * 0.02), Math.max(8, w * 0.012)]);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.setLineDash([]);
  }
}
