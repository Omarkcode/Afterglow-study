/* ============================================================
   AFTERGLOW STUDY — background.js
   Shared sky + city canvas code.  Both index and menu load this.
   Call startBackground() after the DOM is ready.
   ============================================================ */

// ── Sky canvas ────────────────────────────────────────────────

const skyCanvas = document.getElementById('skyCanvas');
const skyCtx    = skyCanvas.getContext('2d');

function buildSky() {
  skyCanvas.width  = window.innerWidth;
  skyCanvas.height = window.innerHeight;
  drawSky();
}

function drawSky() {
  const W = skyCanvas.width;
  const H = skyCanvas.height;
  skyCtx.clearRect(0, 0, W, H);

  const nebulae = [
    { cx: W*0.48, cy: H*0.18, rx: W*0.20, ry: H*0.09, r: 160, g: 140, b: 100, a: 0.14 },
    { cx: W*0.22, cy: H*0.14, rx: W*0.42, ry: H*0.22, r: 85,  g: 50,  b: 180, a: 0.11 },
    { cx: W*0.40, cy: H*0.28, rx: W*0.36, ry: H*0.17, r: 30,  g: 60,  b: 190, a: 0.09 },
    { cx: W*0.76, cy: H*0.11, rx: W*0.35, ry: H*0.20, r: 130, g: 55,  b: 190, a: 0.11 },
    { cx: W*0.28, cy: H*0.35, rx: W*0.27, ry: H*0.14, r: 20,  g: 120, b: 160, a: 0.06 },
    { cx: W*0.90, cy: H*0.22, rx: W*0.22, ry: H*0.16, r: 185, g: 105, b: 55,  a: 0.07 },
    { cx: W*0.50, cy: H*0.08, rx: W*0.78, ry: H*0.26, r: 50,  g: 42,  b: 125, a: 0.08 },
    { cx: W*0.57, cy: H*0.24, rx: W*0.16, ry: H*0.10, r: 175, g: 155, b: 120, a: 0.10 },
  ];

  for (const p of nebulae) {
    skyCtx.save();
    skyCtx.translate(p.cx, p.cy);
    skyCtx.scale(1, p.ry / p.rx);
    const grd = skyCtx.createRadialGradient(0, 0, 0, 0, 0, p.rx);
    grd.addColorStop(0,    `rgba(${p.r},${p.g},${p.b},${p.a})`);
    grd.addColorStop(0.45, `rgba(${p.r},${p.g},${p.b},${p.a * 0.42})`);
    grd.addColorStop(1,    'transparent');
    skyCtx.beginPath();
    skyCtx.arc(0, 0, p.rx, 0, Math.PI * 2);
    skyCtx.fillStyle = grd;
    skyCtx.fill();
    skyCtx.restore();
  }

  const skyH      = H * 0.72;
  const starCount = Math.round((W * skyH) / 900);

  for (let i = 0; i < starCount; i++) {
    const x  = Math.random() * W;
    const y  = Math.random() * skyH;
    const bw = galaxyBandWeight(x, y, W, H);

    if (Math.random() > 0.52 + bw * 0.48) continue;

    const roll = Math.random();
    const r = roll < 0.015 ? 1.9 + Math.random() * 0.9
            : roll < 0.10  ? 0.9 + Math.random() * 0.6
            :                0.2 + Math.random() * 0.45;

    const inBand = bw > 0.30;
    let hue, sat, lit, alpha;

    if (inBand && Math.random() < 0.32) {
      const cr = Math.random();
      if      (cr < 0.28) { hue = 248 + Math.random()*28; sat = 45+Math.random()*35; }
      else if (cr < 0.52) { hue = 195 + Math.random()*32; sat = 35+Math.random()*30; }
      else if (cr < 0.74) { hue = 38  + Math.random()*22; sat = 60+Math.random()*28; }
      else                { hue = 10  + Math.random()*18; sat = 55+Math.random()*30; }
      lit   = 68 + Math.random() * 24;
      alpha = 0.28 + Math.random() * 0.52;
    } else {
      hue   = 195 + Math.random() * 55;
      sat   = 4   + Math.random() * 32;
      lit   = 78  + Math.random() * 22;
      alpha = 0.14 + Math.random() * 0.75;
    }

    drawStar(skyCtx, x, y, r, hue, sat, lit, alpha);
  }

  const featured = [
    { x: W*0.08, y: H*0.06, r: 2.5, spike: true  },
    { x: W*0.22, y: H*0.11, r: 2.1, spike: true  },
    { x: W*0.47, y: H*0.04, r: 2.7, spike: true  },
    { x: W*0.63, y: H*0.09, r: 2.0, spike: false },
    { x: W*0.82, y: H*0.15, r: 2.3, spike: true  },
    { x: W*0.33, y: H*0.19, r: 1.9, spike: false },
    { x: W*0.91, y: H*0.07, r: 2.2, spike: true  },
    { x: W*0.55, y: H*0.23, r: 1.8, spike: false },
    { x: W*0.14, y: H*0.28, r: 2.0, spike: true  },
    { x: W*0.70, y: H*0.26, r: 2.1, spike: true  },
    { x: W*0.04, y: H*0.20, r: 1.7, spike: false },
    { x: W*0.96, y: H*0.16, r: 1.8, spike: false },
  ];

  for (const s of featured) {
    drawStar(skyCtx, s.x, s.y, s.r, 215, 18, 97, 0.90);
    if (s.spike) drawStarSpike(skyCtx, s.x, s.y, s.r);
  }
}

function galaxyBandWeight(x, y, W, H) {
  const bandY = H * 0.06 + (x / W) * H * 0.28;
  return Math.max(0, 1 - Math.abs(y - bandY) / (H * 0.22));
}

function drawStar(ctx, x, y, r, hue, sat, lit, alpha) {
  if (r > 0.9) {
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
    grd.addColorStop(0, `hsla(${hue},${sat}%,${lit}%,${alpha * 0.50})`);
    grd.addColorStop(1, 'transparent');
    ctx.beginPath(); ctx.arc(x, y, r * 5, 0, Math.PI * 2);
    ctx.fillStyle = grd; ctx.fill();
  }
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = `hsl(${hue},${sat}%,${lit}%)`;
  ctx.globalAlpha = alpha; ctx.fill();
  ctx.globalAlpha = 1;
}

function drawStarSpike(ctx, x, y, r) {
  ctx.save();
  const len = r * 12;
  for (let a = 0; a < 2; a++) {
    const angle = a * Math.PI / 2;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const grad = ctx.createLinearGradient(
      x - cos * len, y - sin * len,
      x + cos * len, y + sin * len
    );
    grad.addColorStop(0,    'transparent');
    grad.addColorStop(0.44, 'rgba(210, 228, 255, 0.22)');
    grad.addColorStop(0.50, 'rgba(230, 242, 255, 0.55)');
    grad.addColorStop(0.56, 'rgba(210, 228, 255, 0.22)');
    grad.addColorStop(1,    'transparent');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x - cos * len, y - sin * len);
    ctx.lineTo(x + cos * len, y + sin * len);
    ctx.stroke();
  }
  ctx.restore();
}

// ── City canvas ───────────────────────────────────────────────

const cityCanvas = document.getElementById('cityCanvas');
const cityCtx    = cityCanvas.getContext('2d');
let   buildings  = [];
let   cityLights = [];
let   cityFrame  = 0;

const STYLES = ['modern', 'artdeco', 'residential', 'office', 'historic'];

const BODY_COLORS = {
  modern:      [12, 18, 42],
  artdeco:     [14, 16, 38],
  residential: [17, 20, 40],
  office:      [10, 16, 36],
  historic:    [19, 18, 34],
};

function resizeCity() {
  cityCanvas.width  = window.innerWidth;
  cityCanvas.height = Math.round(window.innerHeight * 0.50);
  generateCity();
}

function generateCity() {
  buildings  = [];
  cityLights = [];
  const W = cityCanvas.width;
  const H = cityCanvas.height;

  let x = -30;
  while (x < W + 60) {
    const style = STYLES[Math.floor(Math.random() * STYLES.length)];
    const wMin  = style === 'modern' ? 36 : style === 'office' ? 80 : 55;
    const wMax  = style === 'modern' ? 68 : style === 'office' ? 145 : 115;
    const w     = wMin + Math.random() * (wMax - wMin);
    const centerBias = 1 - Math.abs((x / W) - 0.5) * 0.42;
    const hMin  = style === 'modern' ? 110 : 65;
    const hMax  = style === 'modern' ? 250 : style === 'historic' ? 120 : 175;
    const h     = (hMin + Math.random() * (hMax - hMin)) * centerBias;
    const bx = x, by = H - h;

    buildings.push({
      x: bx, y: by, w, h, style,
      windows: makeWindows(bx, by, w, h, style),
      rooftop: makeRooftop(bx, by, w, style),
    });
    x += w - 6 + Math.random() * 14;
  }

  const area  = W * H;
  const count = Math.max(55, Math.min(150, Math.round(area / 4500)));
  for (let i = 0; i < count; i++) {
    const yf = Math.pow(Math.random(), 0.65);
    cityLights.push({
      x: Math.random() * W, y: yf * H,
      r:     0.45 + yf * 0.80 + Math.random() * 0.55,
      base:  0.20 + Math.random() * 0.50,
      speed: 0.0005 + Math.random() * 0.0015,
      phase: Math.random() * Math.PI * 2,
      hue:   26 + Math.random() * 24,
      sat:   75 + Math.random() * 22,
      lit:   50 + Math.random() * 30,
    });
  }
}

function makeWindows(bx, by, bw, bh, style) {
  const wins = [];
  const cfg = {
    modern:      { cols: 4, ww: 5,  wh: 9,  px: 8,  py: 14, sy: 16 },
    artdeco:     { cols: 3, ww: 6,  wh: 15, px: 10, py: 16, sy: 22 },
    residential: { cols: 4, ww: 8,  wh: 7,  px: 10, py: 12, sy: 15 },
    office:      { cols: 5, ww: 12, wh: 6,  px: 8,  py: 14, sy: 13 },
    historic:    { cols: 3, ww: 7,  wh: 13, px: 10, py: 18, sy: 23 },
  }[style];
  const { cols, ww, wh, px, py, sy } = cfg;
  const gap = (bw - px * 2 - cols * ww) / Math.max(1, cols - 1);
  let wy = by + py;
  while (wy + wh < by + bh - 8) {
    for (let c = 0; c < cols; c++) {
      const wx = bx + px + c * (ww + gap);
      const lit = Math.random() > 0.36;
      wins.push({ x: wx, y: wy, w: ww, h: wh, lit,
        hue: 32 + Math.random() * 18,
        sat: 75 + Math.random() * 20,
        lum: 52 + Math.random() * 28 });
    }
    wy += sy;
  }
  return wins;
}

function makeRooftop(bx, by, bw, style) {
  const cx = bx + bw / 2;
  if (style === 'modern')      return bw < 52
    ? { type: 'antenna',   cx, y: by, h: 28 + Math.random() * 14 }
    : { type: 'hvac',      bx, by, bw, units: Math.floor(bw / 38) };
  if (style === 'artdeco')     return { type: 'stepped',   bx, by, bw };
  if (style === 'residential') return { type: 'watertower', cx, y: by };
  if (style === 'office')      return { type: 'parapet',   bx, by, bw, units: Math.floor(bw / 40) };
  if (style === 'historic')    return { type: 'cornice',   bx, by, bw, cx };
  return { type: 'flat' };
}

function drawBuilding(ctx, b) {
  const { x, y, w, h, style } = b;
  const [r, g, bl] = BODY_COLORS[style];

  ctx.fillStyle = `rgba(${r},${g},${bl},0.86)`;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = 'rgba(100, 135, 190, 0.11)';
  ctx.fillRect(x, y, w, 1.5);

  for (const win of b.windows) {
    if (win.lit) {
      const grd = ctx.createRadialGradient(
        win.x + win.w/2, win.y + win.h/2, 0,
        win.x + win.w/2, win.y + win.h/2, win.w * 2.2);
      grd.addColorStop(0, `hsla(${win.hue},${win.sat}%,${win.lum}%,0.22)`);
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.fillRect(win.x - win.w, win.y - win.h, win.w * 3, win.h * 3);
      ctx.fillStyle = `hsla(${win.hue},${win.sat}%,${win.lum}%,0.70)`;
      ctx.fillRect(win.x, win.y, win.w, win.h);
    } else {
      ctx.fillStyle = 'rgba(28, 36, 62, 0.30)';
      ctx.fillRect(win.x, win.y, win.w, win.h);
    }
  }
  drawRooftop(ctx, b.rooftop);
}

function drawRooftop(ctx, rt) {
  if (!rt) return;
  switch (rt.type) {
    case 'antenna': {
      ctx.strokeStyle = 'rgba(75, 95, 140, 0.70)';
      ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(rt.cx, rt.y); ctx.lineTo(rt.cx, rt.y - rt.h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rt.cx - 5, rt.y - rt.h * 0.7); ctx.lineTo(rt.cx + 5, rt.y - rt.h * 0.7); ctx.stroke();
      ctx.fillStyle = 'rgba(255, 55, 55, 0.50)';
      ctx.beginPath(); ctx.arc(rt.cx, rt.y - rt.h, 1.8, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'hvac': {
      ctx.fillStyle = 'rgba(10, 16, 34, 0.92)';
      ctx.fillRect(rt.bx - 2, rt.by - 5, rt.bw + 4, 6);
      const gap = (rt.bw - 20) / Math.max(1, rt.units);
      for (let u = 0; u < rt.units; u++) {
        ctx.fillStyle = 'rgba(18, 26, 50, 0.88)';
        ctx.fillRect(rt.bx + 10 + u * gap, rt.by - 14, 18, 10);
      }
      break;
    }
    case 'stepped': {
      const s1w = rt.bw * 0.78, s2w = rt.bw * 0.52;
      ctx.fillStyle = 'rgba(12, 16, 36, 0.92)';
      ctx.fillRect(rt.bx + (rt.bw - s1w) / 2, rt.by - 14, s1w, 16);
      ctx.fillRect(rt.bx + (rt.bw - s2w) / 2, rt.by - 26, s2w, 14);
      ctx.fillStyle = 'rgba(65, 78, 115, 0.85)';
      ctx.beginPath();
      ctx.moveTo(rt.bx + rt.bw / 2, rt.by - 44);
      ctx.lineTo(rt.bx + rt.bw / 2 - 5, rt.by - 28);
      ctx.lineTo(rt.bx + rt.bw / 2 + 5, rt.by - 28);
      ctx.closePath(); ctx.fill();
      break;
    }
    case 'watertower': {
      const twx = rt.cx, twy = rt.y - 32;
      ctx.strokeStyle = 'rgba(40, 52, 85, 0.72)'; ctx.lineWidth = 1.2;
      for (const dx of [-7, 0, 7]) {
        ctx.beginPath(); ctx.moveTo(twx + dx, twy + 10); ctx.lineTo(twx + dx * 1.6, rt.y); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(16, 22, 46, 0.90)';
      ctx.beginPath(); ctx.ellipse(twx, twy, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(twx - 10, twy, 20, 20);
      ctx.beginPath(); ctx.ellipse(twx, twy + 20, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'parapet': {
      ctx.fillStyle = 'rgba(9, 15, 33, 0.92)';
      ctx.fillRect(rt.bx, rt.by - 6, rt.bw, 8);
      const gap2 = (rt.bw - 20) / Math.max(1, rt.units);
      for (let u = 0; u < rt.units; u++) {
        ctx.fillStyle = 'rgba(16, 22, 44, 0.90)';
        ctx.fillRect(rt.bx + 10 + u * gap2, rt.by - 15, 20, 10);
      }
      break;
    }
    case 'cornice': {
      ctx.fillStyle = 'rgba(17, 21, 44, 0.90)';
      ctx.fillRect(rt.bx - 3, rt.by - 7, rt.bw + 6, 9);
      ctx.fillStyle = 'rgba(60, 72, 105, 0.80)';
      ctx.beginPath();
      ctx.moveTo(rt.cx, rt.by - 20);
      ctx.lineTo(rt.cx - 7, rt.by - 7);
      ctx.lineTo(rt.cx + 7, rt.by - 7);
      ctx.closePath(); ctx.fill();
      break;
    }
  }
}

function animateCity() {
  const W = cityCanvas.width, H = cityCanvas.height;
  cityCtx.clearRect(0, 0, W, H);
  cityFrame++;

  for (const b of buildings) drawBuilding(cityCtx, b);

  const horizGrd = cityCtx.createLinearGradient(0, H * 0.68, 0, H);
  horizGrd.addColorStop(0, 'transparent');
  horizGrd.addColorStop(1, 'rgba(255, 125, 28, 0.07)');
  cityCtx.fillStyle = horizGrd;
  cityCtx.fillRect(0, H * 0.68, W, H * 0.32);

  for (const l of cityLights) {
    const tw    = Math.sin(cityFrame * l.speed * 60 + l.phase) * 0.11;
    const alpha = Math.max(0.06, Math.min(0.92, l.base + tw));
    const hsla  = (a) => `hsla(${l.hue},${l.sat}%,${l.lit}%,${a})`;

    const glow = cityCtx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 5.5);
    glow.addColorStop(0, hsla(alpha * 0.38));
    glow.addColorStop(1, 'transparent');
    cityCtx.beginPath(); cityCtx.arc(l.x, l.y, l.r * 5.5, 0, Math.PI * 2);
    cityCtx.fillStyle = glow; cityCtx.fill();

    cityCtx.beginPath(); cityCtx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    cityCtx.fillStyle = `hsl(${l.hue},${l.sat}%,${l.lit}%)`;
    cityCtx.globalAlpha = alpha; cityCtx.fill();
    cityCtx.globalAlpha = 1;
  }

  requestAnimationFrame(animateCity);
}

// ── Entry point ───────────────────────────────────────────────

function startBackground() {
  buildSky();
  window.addEventListener('resize', buildSky);
  resizeCity();
  window.addEventListener('resize', resizeCity);
  animateCity();
}
