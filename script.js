/* ============================================================
   AFTERGLOW STUDY — script.js
   ============================================================ */

// ============================================================
//  CITY LIGHTS CANVAS
// ============================================================

const canvas  = document.getElementById('cityCanvas');
const ctx     = canvas.getContext('2d');
let   lights  = [];

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = Math.round(window.innerHeight * 0.45);
  buildLights();
}

function buildLights() {
  lights = [];

  // Scale light count to screen area so it looks good on any device
  const area  = canvas.width * canvas.height;
  const count = Math.max(50, Math.min(140, Math.round(area / 4800)));

  for (let i = 0; i < count; i++) {
    // yFraction: 0 = top of canvas (far/high buildings), 1 = bottom (near/low)
    const yFraction = Math.pow(Math.random(), 0.7); // bias toward bottom
    lights.push({
      x:     Math.random() * canvas.width,
      y:     yFraction * canvas.height,
      // lights near the bottom (closer) are fractionally larger
      r:     0.45 + yFraction * 0.75 + Math.random() * 0.55,
      // base brightness
      base:  0.22 + Math.random() * 0.48,
      // unique twinkle speed & phase so they don't all pulse together
      speed: 0.0006 + Math.random() * 0.0016,
      phase: Math.random() * Math.PI * 2,
      // warm amber–gold palette: hue 26°–50°
      hue:   26 + Math.random() * 24,
      sat:   75 + Math.random() * 22,
      lit:   52 + Math.random() * 28,
    });
  }
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let frameCount = 0;

function animateLights() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  frameCount++;

  for (const l of lights) {
    // Gentle sine-wave twinkle
    const twinkle = Math.sin(frameCount * l.speed * 60 + l.phase) * 0.11;
    const alpha   = Math.max(0.06, Math.min(0.92, l.base + twinkle));

    const hsl  = `hsl(${l.hue}, ${l.sat}%, ${l.lit}%)`;
    const hsla = (a) => `hsla(${l.hue}, ${l.sat}%, ${l.lit}%, ${a})`;

    // Soft outer glow halo
    const glow = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 5.5);
    glow.addColorStop(0, hsla(alpha * 0.40));
    glow.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r * 5.5, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    // Core bright dot
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    ctx.fillStyle = hsl;
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  requestAnimationFrame(animateLights);
}

animateLights();


// ============================================================
//  TITLE TYPEWRITER
// ============================================================

const titleEl  = document.getElementById('mainTitle');
const cursorEl = document.getElementById('typeCursor');
const wrapEl   = document.getElementById('titleWrap');

// All 9 languages — properly translated "Afterglow Study"
const LANGUAGES = [
  { text: 'Afterglow Study',          dir: 'ltr', lang: 'en' }, // English
  { text: 'Estudio Resplandor',       dir: 'ltr', lang: 'es' }, // Spanish
  { text: 'Étude du Crépuscule',      dir: 'ltr', lang: 'fr' }, // French
  { text: 'دراسة الشفق',             dir: 'rtl', lang: 'ar' }, // Arabic
  { text: '余晖学习',                  dir: 'ltr', lang: 'zh' }, // Chinese
  { text: 'Alacakaranlık Çalışması',  dir: 'ltr', lang: 'tr' }, // Turkish
  { text: '노을 공부',                 dir: 'ltr', lang: 'ko' }, // Korean
  { text: 'Skemergloed Studie',       dir: 'ltr', lang: 'af' }, // Afrikaans
  { text: '夕映えの学び',              dir: 'ltr', lang: 'ja' }, // Japanese
];

const CHAR_DELAY  = 95;   // ms between each character (base)
const HOLD_TIME   = 5000; // ms to hold the full title before fading
const FADE_OUT_MS = 1400; // ms for the fade-out transition
const PAUSE_MS    = 500;  // ms of silence between languages

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Type `text` one character at a time into titleEl
async function typeText(text) {
  for (let i = 1; i <= text.length; i++) {
    titleEl.textContent = text.slice(0, i);
    // Small random jitter makes it feel human
    const jitter = (Math.random() - 0.5) * 38;
    await wait(CHAR_DELAY + jitter);
  }
}

// Smoothly fade the title opacity to a target value
function setOpacity(value, durationMs) {
  return new Promise((resolve) => {
    if (durationMs === 0) {
      titleEl.style.transition = 'none';
      titleEl.style.opacity    = value;
      // Force reflow so the transition:none takes effect
      void titleEl.offsetHeight;
      resolve();
    } else {
      titleEl.style.transition = `opacity ${durationMs}ms ease`;
      titleEl.style.opacity    = value;
      setTimeout(resolve, durationMs + 30);
    }
  });
}

let langIndex = 0;

async function titleLoop() {
  while (true) {
    const { text, dir, lang } = LANGUAGES[langIndex];

    // ── Prepare ──────────────────────────────────────────────
    // Snap to invisible with no transition
    await setOpacity('0', 0);
    titleEl.textContent = '';

    // Set language attributes (affects font via CSS)
    titleEl.setAttribute('lang', lang);
    titleEl.setAttribute('dir',  dir);

    // Flip cursor side for RTL text
    if (dir === 'rtl') {
      wrapEl.classList.add('rtl');
    } else {
      wrapEl.classList.remove('rtl');
    }

    // Show cursor while typing
    cursorEl.style.visibility = 'visible';

    // Make title visible (text is still empty so nothing shows yet)
    await setOpacity('1', 0);

    // Brief beat before we start typing
    await wait(280);

    // ── Type ─────────────────────────────────────────────────
    await typeText(text);

    // ── Hold ─────────────────────────────────────────────────
    // Hide cursor while the title just sits there
    cursorEl.style.visibility = 'hidden';
    await wait(HOLD_TIME);

    // ── Fade out ─────────────────────────────────────────────
    await setOpacity('0', FADE_OUT_MS);
    titleEl.textContent = '';

    // Silence before next language
    await wait(PAUSE_MS);

    // Advance to next language
    langIndex = (langIndex + 1) % LANGUAGES.length;
  }
}

// Wait for fonts before starting so there's no flash of unstyled text
document.fonts.ready.then(() => {
  setTimeout(titleLoop, 700);
});
