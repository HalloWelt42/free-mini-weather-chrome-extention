// ============================================================
// Free better Weather -- Icon Renderer v3.3.0
// Canvas-based weather icons for browser extension
// (c) HalloWelt42
// ============================================================

// === COLORS ===
export const COLORS = {
  SUN:            '#FFB300',
  SUN_RAY:        '#FF8F00',
  SUN_CORE:       '#FFD54F',
  MOON:           '#CFD8DC',
  MOON_DARK:      '#455A64',
  MOON_GLOW:      '#ECEFF1',
  CLOUD_LIGHT:    '#B0BEC5',
  CLOUD:          '#78909C',
  CLOUD_DARK:     '#546E7A',
  RAIN:           '#42A5F5',
  RAIN_HEAVY:     '#1E88E5',
  DRIZZLE:        '#90CAF9',
  SNOW:           '#E3F2FD',
  SNOW_FLAKE:     '#FFFFFF',
  LIGHTNING:       '#FFD600',
  LIGHTNING_DARK: '#F9A825',
  FOG:            '#90A4AE',
  FOG_LIGHT:      '#B0BEC5',
  WIND:           '#80CBC4',
  HAIL:           '#E0E0E0',
  SLEET_BLUE:     '#64B5F6',
  SLEET_WHITE:    '#FFFFFF',
  ERROR_RED:      '#EF5350',
  ERROR_BG:       '#37474F',
  TEMP_BAR:       'rgba(0,0,0,0.55)',
};

// === CONDITIONS ===
export const CONDITIONS = [
  { id: 'clear-day',           label: 'Clear (Day)',           icon: '' },
  { id: 'clear-night',         label: 'Clear (Night)',         icon: '' },
  { id: 'partly-cloudy-day',   label: 'Partly Cloudy (Day)',   icon: '' },
  { id: 'partly-cloudy-night', label: 'Partly Cloudy (Night)', icon: '' },
  { id: 'cloudy',              label: 'Cloudy',                icon: '' },
  { id: 'fog',                 label: 'Fog',                   icon: '' },
  { id: 'drizzle',             label: 'Drizzle',               icon: '' },
  { id: 'rain',                label: 'Rain',                  icon: '' },
  { id: 'heavy-rain',          label: 'Heavy Rain',            icon: '' },
  { id: 'snow',                label: 'Snow',                  icon: '' },
  { id: 'heavy-snow',          label: 'Heavy Snow',            icon: '' },
  { id: 'sleet',               label: 'Sleet',                 icon: '' },
  { id: 'thunderstorm',        label: 'Thunderstorm',          icon: '' },
  { id: 'hail',                label: 'Hail',                  icon: '' },
  { id: 'wind',                label: 'Wind',                  icon: '' },
];

// === TEMPERATURE COLOR ===
export function tempColor(temp) {
  if (temp <= -10) return '#42A5F5';
  if (temp <= 0)   return '#4FC3F7';
  if (temp <= 10)  return '#80DEEA';
  if (temp <= 20)  return '#FFFFFF';
  if (temp <= 25)  return '#FFE082';
  if (temp <= 30)  return '#FFA726';
  return '#EF5350';
}

// ============================================================
// DRAWING HELPERS
// ============================================================

function circle(ctx, cx, cy, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function cloudShape(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  const bY = y + h * 0.55;
  ctx.beginPath();
  ctx.arc(x + w * 0.28, bY, w * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + w * 0.5, bY - h * 0.18, w * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + w * 0.72, bY, w * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + w * 0.08, bY, w * 0.84, h * 0.3);
}

// ============================================================
// SYMBOL DRAWING FUNCTIONS (Reference: 32x32)
// ============================================================

function drawClearDay(ctx, s) {
  const cx = s * 0.5, cy = s * 0.5;
  const r = s * 0.2;
  ctx.strokeStyle = COLORS.SUN_RAY;
  ctx.lineWidth = Math.max(1.5, s * 0.06);
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const inner = r * 1.5;
    const outer = r * 2.3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
    ctx.stroke();
  }
  circle(ctx, cx, cy, r, COLORS.SUN);
  circle(ctx, cx - r * 0.25, cy - r * 0.25, r * 0.4, COLORS.SUN_CORE);
}

function drawClearNight(ctx, s) {
  const cx = s * 0.45, cy = s * 0.45;
  const r = s * 0.28;
  ctx.fillStyle = COLORS.MOON;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx + r * 0.55, cy - r * 0.35, r * 0.75, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = COLORS.MOON_GLOW;
  circle(ctx, s * 0.75, s * 0.2, s * 0.025, COLORS.MOON_GLOW);
  circle(ctx, s * 0.85, s * 0.4, s * 0.02, COLORS.MOON_GLOW);
  circle(ctx, s * 0.65, s * 0.75, s * 0.02, COLORS.MOON_GLOW);
}

function drawPartlyCloudyDay(ctx, s) {
  const sx = s * 0.62, sy = s * 0.3, sr = s * 0.16;
  ctx.strokeStyle = COLORS.SUN_RAY;
  ctx.lineWidth = Math.max(1, s * 0.04);
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(sx + Math.cos(a) * sr * 1.3, sy + Math.sin(a) * sr * 1.3);
    ctx.lineTo(sx + Math.cos(a) * sr * 2, sy + Math.sin(a) * sr * 2);
    ctx.stroke();
  }
  circle(ctx, sx, sy, sr, COLORS.SUN);
  cloudShape(ctx, s * 0.02, s * 0.3, s * 0.8, s * 0.6, COLORS.CLOUD_LIGHT);
}

function drawPartlyCloudyNight(ctx, s) {
  const mx = s * 0.65, my = s * 0.28, mr = s * 0.14;
  ctx.fillStyle = COLORS.MOON;
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(mx + mr * 0.5, my - mr * 0.35, mr * 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  cloudShape(ctx, s * 0.02, s * 0.3, s * 0.8, s * 0.6, COLORS.CLOUD_LIGHT);
}

function drawCloudy(ctx, s) {
  cloudShape(ctx, s * 0.15, s * 0.08, s * 0.75, s * 0.55, COLORS.CLOUD);
  cloudShape(ctx, s * 0.02, s * 0.25, s * 0.9, s * 0.65, COLORS.CLOUD_LIGHT);
}

function drawFog(ctx, s) {
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, s * 0.08);
  const lines = [
    { y: 0.25, w: 0.7, x: 0.15, alpha: 0.5 },
    { y: 0.42, w: 0.85, x: 0.08, alpha: 0.7 },
    { y: 0.58, w: 0.6, x: 0.2, alpha: 0.9 },
    { y: 0.75, w: 0.75, x: 0.12, alpha: 0.6 },
  ];
  lines.forEach(l => {
    ctx.strokeStyle = `rgba(144,164,174,${l.alpha})`;
    ctx.beginPath();
    ctx.moveTo(s * l.x, s * l.y);
    ctx.lineTo(s * (l.x + l.w), s * l.y);
    ctx.stroke();
  });
}

function drawDrizzle(ctx, s) {
  cloudShape(ctx, s * 0.05, s * 0.02, s * 0.85, s * 0.48, COLORS.CLOUD_LIGHT);
  ctx.fillStyle = COLORS.DRIZZLE;
  const drops = [[0.25, 0.68], [0.45, 0.62], [0.65, 0.72], [0.35, 0.82]];
  drops.forEach(([dx, dy]) => {
    circle(ctx, s * dx, s * dy, s * 0.03, COLORS.DRIZZLE);
  });
}

function drawRain(ctx, s) {
  cloudShape(ctx, s * 0.05, s * 0.02, s * 0.85, s * 0.48, COLORS.CLOUD);
  ctx.strokeStyle = COLORS.RAIN;
  ctx.lineWidth = Math.max(1.5, s * 0.05);
  ctx.lineCap = 'round';
  const drops = [[0.22, 0.6, 0.16, 0.76], [0.42, 0.58, 0.36, 0.74], [0.62, 0.62, 0.56, 0.78], [0.52, 0.78, 0.46, 0.9]];
  drops.forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(s * x1, s * y1);
    ctx.lineTo(s * x2, s * y2);
    ctx.stroke();
  });
}

function drawHeavyRain(ctx, s) {
  cloudShape(ctx, s * 0.05, s * 0.02, s * 0.85, s * 0.48, COLORS.CLOUD_DARK);
  ctx.strokeStyle = COLORS.RAIN_HEAVY;
  ctx.lineWidth = Math.max(2, s * 0.06);
  ctx.lineCap = 'round';
  const drops = [
    [0.18, 0.58, 0.1, 0.78], [0.35, 0.56, 0.27, 0.76],
    [0.52, 0.6, 0.44, 0.8], [0.68, 0.58, 0.6, 0.78],
    [0.28, 0.76, 0.2, 0.92], [0.55, 0.78, 0.47, 0.94],
  ];
  drops.forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(s * x1, s * y1);
    ctx.lineTo(s * x2, s * y2);
    ctx.stroke();
  });
}

function drawSnow(ctx, s) {
  cloudShape(ctx, s * 0.05, s * 0.02, s * 0.85, s * 0.48, COLORS.CLOUD_LIGHT);
  const flakes = [[0.22, 0.65], [0.5, 0.62], [0.72, 0.68], [0.35, 0.8], [0.6, 0.82]];
  flakes.forEach(([fx, fy]) => {
    drawFlake(ctx, s * fx, s * fy, s * 0.045);
  });
}

function drawFlake(ctx, cx, cy, r) {
  ctx.strokeStyle = COLORS.SNOW_FLAKE;
  ctx.lineWidth = Math.max(1, r * 0.5);
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(a) * r, cy - Math.sin(a) * r);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.stroke();
  }
}

function drawHeavySnow(ctx, s) {
  cloudShape(ctx, s * 0.05, s * 0.02, s * 0.85, s * 0.48, COLORS.CLOUD);
  const flakes = [
    [0.2, 0.62], [0.4, 0.58], [0.6, 0.64], [0.78, 0.6],
    [0.15, 0.8], [0.35, 0.78], [0.55, 0.82], [0.72, 0.8],
  ];
  flakes.forEach(([fx, fy]) => {
    drawFlake(ctx, s * fx, s * fy, s * 0.04);
  });
}

function drawSleet(ctx, s) {
  cloudShape(ctx, s * 0.05, s * 0.02, s * 0.85, s * 0.48, COLORS.CLOUD);
  ctx.strokeStyle = COLORS.SLEET_BLUE;
  ctx.lineWidth = Math.max(1.5, s * 0.04);
  ctx.lineCap = 'round';
  [[0.25, 0.6, 0.2, 0.74], [0.55, 0.58, 0.5, 0.72]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(s * x1, s * y1);
    ctx.lineTo(s * x2, s * y2);
    ctx.stroke();
  });
  [[0.4, 0.68], [0.7, 0.66], [0.3, 0.84], [0.6, 0.84]].forEach(([fx, fy]) => {
    drawFlake(ctx, s * fx, s * fy, s * 0.035);
  });
}

function drawThunderstorm(ctx, s) {
  cloudShape(ctx, s * 0.05, s * 0.02, s * 0.85, s * 0.45, COLORS.CLOUD_DARK);
  ctx.fillStyle = COLORS.LIGHTNING;
  ctx.beginPath();
  ctx.moveTo(s * 0.5, s * 0.45);
  ctx.lineTo(s * 0.38, s * 0.65);
  ctx.lineTo(s * 0.48, s * 0.65);
  ctx.lineTo(s * 0.4, s * 0.9);
  ctx.lineTo(s * 0.62, s * 0.6);
  ctx.lineTo(s * 0.52, s * 0.6);
  ctx.lineTo(s * 0.58, s * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = COLORS.LIGHTNING_DARK;
  ctx.lineWidth = Math.max(0.5, s * 0.02);
  ctx.stroke();
}

function drawHail(ctx, s) {
  cloudShape(ctx, s * 0.05, s * 0.02, s * 0.85, s * 0.48, COLORS.CLOUD);
  const stones = [[0.22, 0.66], [0.42, 0.62], [0.62, 0.68], [0.32, 0.82], [0.55, 0.8]];
  stones.forEach(([hx, hy]) => {
    circle(ctx, s * hx, s * hy, s * 0.04, COLORS.HAIL);
    circle(ctx, s * hx - s * 0.015, s * hy - s * 0.015, s * 0.015, 'rgba(255,255,255,0.6)');
  });
}

function drawWind(ctx, s) {
  ctx.strokeStyle = COLORS.WIND;
  ctx.lineWidth = Math.max(2, s * 0.07);
  ctx.lineCap = 'round';
  const lines = [
    { y: 0.3, x1: 0.15, cp1x: 0.45, cp1y: 0.18, x2: 0.82 },
    { y: 0.5, x1: 0.08, cp1x: 0.38, cp1y: 0.38, x2: 0.88 },
    { y: 0.7, x1: 0.2, cp1x: 0.5, cp1y: 0.58, x2: 0.78 },
  ];
  lines.forEach(l => {
    ctx.beginPath();
    ctx.moveTo(s * l.x1, s * l.y);
    ctx.quadraticCurveTo(s * l.cp1x, s * l.cp1y, s * l.x2, s * l.y);
    ctx.stroke();
  });
}

// === ERROR / LOADING ICONS ===

function drawError(ctx, s) {
  circle(ctx, s * 0.5, s * 0.5, s * 0.38, COLORS.ERROR_BG);
  ctx.fillStyle = COLORS.ERROR_RED;
  ctx.font = `bold ${Math.round(s * 0.55)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('!', s * 0.5, s * 0.48);
}

function drawLoading(ctx, s) {
  circle(ctx, s * 0.5, s * 0.5, s * 0.38, COLORS.ERROR_BG);
  ctx.fillStyle = '#90A4AE';
  ctx.font = `bold ${Math.round(s * 0.45)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', s * 0.5, s * 0.48);
}

// ============================================================
// DISPATCH: Condition -> Draw Function
// ============================================================

const DRAW_MAP = {
  'clear-day':           drawClearDay,
  'clear-night':         drawClearNight,
  'partly-cloudy-day':   drawPartlyCloudyDay,
  'partly-cloudy-night': drawPartlyCloudyNight,
  'cloudy':              drawCloudy,
  'fog':                 drawFog,
  'drizzle':             drawDrizzle,
  'rain':                drawRain,
  'heavy-rain':          drawHeavyRain,
  'snow':                drawSnow,
  'heavy-snow':          drawHeavySnow,
  'sleet':               drawSleet,
  'thunderstorm':        drawThunderstorm,
  'hail':                drawHail,
  'wind':                drawWind,
  'error':               drawError,
  'loading':             drawLoading,
};

// ============================================================
// TEMPERATURE TEXT RENDERING
// ============================================================

function drawTempText(ctx, s, temp, x, y, maxW, maxH) {
  const t = Math.round(temp);
  const label = `${t}`;
  const fontSize = Math.round(maxH * 0.85);
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tx = x + maxW / 2;
  const ty = y + maxH / 2;
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.lineWidth = Math.max(2, s * 0.06);
  ctx.lineJoin = 'round';
  ctx.strokeText(label, tx, ty);
  ctx.fillStyle = tempColor(temp);
  ctx.fillText(label, tx, ty);
}

function drawTempLarge(ctx, s, temp) {
  const t = Math.round(temp);
  const label = `${t}`;
  const fontSize = label.length > 3
    ? Math.round(s * 0.55)
    : Math.round(s * 0.65);
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(0,0,0,0.9)';
  ctx.lineWidth = Math.max(3, s * 0.09);
  ctx.lineJoin = 'round';
  ctx.strokeText(label, s * 0.5, s * 0.5);
  ctx.fillStyle = tempColor(temp);
  ctx.fillText(label, s * 0.5, s * 0.5);
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ============================================================
// DISPLAY MODE RENDERING
// ============================================================

/**
 * Main render function.
 * @param {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} ctx
 * @param {number} size - Canvas size (square)
 * @param {string} condition - Weather condition
 * @param {string} mode - Display mode (symbol | symbol-temp | temp)
 * @param {number|null} temp - Temperature in degrees
 */
export function renderIcon(ctx, size, condition, mode = 'symbol', temp = null) {
  ctx.clearRect(0, 0, size, size);

  const drawFn = DRAW_MAP[condition] || DRAW_MAP['loading'];

  switch (mode) {
    case 'symbol':
      drawFn(ctx, size);
      break;

    case 'temp':
      if (temp !== null) {
        drawTempLarge(ctx, size, temp);
      } else {
        drawFn(ctx, size);
      }
      break;

    case 'symbol-temp':
      ctx.save();
      drawFn(ctx, size);
      ctx.restore();
      if (temp !== null) {
        const barH = size * 0.38;
        const barY = size - barH;
        ctx.fillStyle = COLORS.TEMP_BAR;
        roundedRect(ctx, 0, barY, size, barH, size * 0.1);
        ctx.fill();
        drawTempText(ctx, size, temp, 0, barY, size, barH);
      }
      break;

    default:
      drawFn(ctx, size);
  }
}

/**
 * Creates ImageData for chrome.action.setIcon().
 * @returns {{ 16: ImageData, 32: ImageData }}
 */
export function createIconImageData(condition, mode = 'symbol', temp = null) {
  const sizes = [16, 32];
  const result = {};
  for (const s of sizes) {
    const canvas = new OffscreenCanvas(s, s);
    const ctx = canvas.getContext('2d');
    renderIcon(ctx, s, condition, mode, temp);
    result[s] = ctx.getImageData(0, 0, s, s);
  }
  return result;
}
