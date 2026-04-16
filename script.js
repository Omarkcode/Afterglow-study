/* ============================================================
   LUMINESCE STUDY — script.js  (title screen)
   ============================================================ */

// ── Supabase auth ─────────────────────────────────────────────

const SUPABASE_URL = 'https://rdnswueidjqnxgkhvrjf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_EWpwtIRhvsIQMbNaiKIrPg_vLbgOMNp';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Background ────────────────────────────────────────────────
// (functions defined in background.js, loaded before this file)

startBackground();

// ── Auth modal ────────────────────────────────────────────────

const authOverlay = document.getElementById('authOverlay');

// Study button: if already logged in go straight to menu,
// otherwise open the sign-up / sign-in modal.
document.querySelector('.study-btn').addEventListener('click', async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    window.location.href = 'menu.html';
  } else {
    authOverlay.classList.add('visible');
  }
});

document.getElementById('authClose').addEventListener('click', closeAuth);
authOverlay.addEventListener('click', (e) => {
  if (e.target === authOverlay) closeAuth();
});

function closeAuth() {
  authOverlay.classList.remove('visible');
}

document.getElementById('tabSignup').addEventListener('click', () => switchTab('signup'));
document.getElementById('tabLogin').addEventListener('click',  () => switchTab('login'));
document.getElementById('toLogin').addEventListener('click',   () => switchTab('login'));
document.getElementById('toSignup').addEventListener('click',  () => switchTab('signup'));

function switchTab(tab) {
  const signup = tab === 'signup';
  document.getElementById('signupForm').classList.toggle('auth-form--hidden', !signup);
  document.getElementById('loginForm').classList.toggle('auth-form--hidden',   signup);
  document.getElementById('tabSignup').classList.toggle('active', signup);
  document.getElementById('tabLogin').classList.toggle('active', !signup);
  // Clear any error messages when switching
  document.getElementById('signupError').textContent = '';
  document.getElementById('loginError').textContent  = '';
}

// ── Sign Up ───────────────────────────────────────────────────

document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('signupUsername').value.trim();
  const email    = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const btn      = e.target.querySelector('.auth-submit');
  const errEl    = document.getElementById('signupError');

  errEl.textContent = '';
  errEl.style.color = '';
  btn.textContent   = '···';
  btn.disabled      = true;

  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });

  btn.textContent = 'Create Account';
  btn.disabled    = false;

  if (error) {
    errEl.textContent = error.message;
    return;
  }

  if (data.session) {
    window.location.href = 'menu.html';
  } else {
    // Supabase sent a confirmation email
    errEl.style.color = 'rgba(168, 230, 163, 0.9)';
    errEl.textContent = 'Check your email to confirm your account, then sign in!';
  }
});

// ── Sign In ───────────────────────────────────────────────────

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn      = e.target.querySelector('.auth-submit');
  const errEl    = document.getElementById('loginError');

  errEl.textContent = '';
  btn.textContent   = '···';
  btn.disabled      = true;

  const { error } = await sb.auth.signInWithPassword({ email, password });

  btn.textContent = 'Sign In';
  btn.disabled    = false;

  if (error) {
    errEl.textContent = error.message;
    return;
  }

  window.location.href = 'menu.html';
});

// ── Title canvas — Flowy Assembly Animation ───────────────────

const titleCanvas = document.createElement('canvas');
titleCanvas.style.cssText =
  'position:fixed;top:0;left:0;width:100%;height:100%;z-index:12;pointer-events:none;';
document.body.appendChild(titleCanvas);
const tCtx = titleCanvas.getContext('2d');

function resizeTitleCanvas() {
  titleCanvas.width  = window.innerWidth;
  titleCanvas.height = window.innerHeight;
}
resizeTitleCanvas();
window.addEventListener('resize', resizeTitleCanvas);

const titleEl = document.getElementById('mainTitle');

const LANGUAGES = [
  { text: 'Luminesce Study',         dir: 'ltr', lang: 'en' },
  { text: 'Estudio Luminesce',       dir: 'ltr', lang: 'es' },
  { text: 'Étude Luminesce',         dir: 'ltr', lang: 'fr' },
  { text: 'دراسة لومينيس',           dir: 'rtl', lang: 'ar' },
  { text: '流光学习',                  dir: 'ltr', lang: 'zh' },
  { text: 'Luminesce Çalışması',     dir: 'ltr', lang: 'tr' },
  { text: '빛나는 공부',               dir: 'ltr', lang: 'ko' },
  { text: 'Luminesce Studie',        dir: 'ltr', lang: 'af' },
  { text: '輝きの学び',               dir: 'ltr', lang: 'ja' },
];

function easeSinInOut(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fadeCanvasOut(duration) {
  return new Promise(resolve => {
    const start = performance.now();
    function step(now) {
      const t = Math.min((now - start) / duration, 1);
      titleCanvas.style.opacity = 1 - t;
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
}

function buildTokens(text, dir, lang, fontSpec, cx, cy) {
  const mCtx = document.createElement('canvas').getContext('2d');
  mCtx.font      = fontSpec;
  mCtx.direction = dir;

  const totalW   = mCtx.measureText(text).width;
  const spaceW   = mCtx.measureText(' ').width;
  const rawParts = (lang === 'ar')
    ? text.split(' ').filter(w => w.length > 0)
    : [...text];

  const tokens = [];

  if (dir === 'rtl') {
    let xCursor = cx + totalW / 2;
    for (const part of rawParts) {
      const pw = mCtx.measureText(part).width;
      tokens.push({ text: part, finalX: xCursor - pw / 2, finalY: cy });
      xCursor -= pw + spaceW;
    }
  } else {
    let xCursor = cx - totalW / 2;
    for (const part of rawParts) {
      const pw = mCtx.measureText(part).width;
      tokens.push({ text: part, finalX: xCursor + pw / 2, finalY: cy, isGap: part === ' ' });
      xCursor += pw;
    }
  }

  const visible = tokens.filter(t => !t.isGap && t.text !== ' ');
  visible.forEach((tk, i) => {
    tk.startX = tk.finalX + (Math.random() - 0.5) * 50;
    tk.startY = tk.finalY - (30 + Math.random() * 45);
    tk.delay  = i * 80 + Math.random() * 25;
  });
  return visible;
}

async function flowyTitle(text, dir, lang, fontSpec, cx, cy) {
  const W = titleCanvas.width, H = titleCanvas.height;
  const tokens  = buildTokens(text, dir, lang, fontSpec, cx, cy);
  const charDur = 1300;
  titleCanvas.style.opacity = '1';

  return new Promise(resolve => {
    const start = performance.now();
    function frame(now) {
      const elapsed = now - start;
      tCtx.clearRect(0, 0, W, H);
      tCtx.font         = fontSpec;
      tCtx.textAlign    = 'center';
      tCtx.textBaseline = 'middle';
      tCtx.direction    = dir;

      let allDone = true;
      for (const tk of tokens) {
        const rawT = (elapsed - tk.delay) / charDur;
        const t    = Math.max(0, Math.min(rawT, 1));
        if (t < 1) allDone = false;
        const te = easeSinInOut(t);
        const x  = tk.startX + (tk.finalX - tk.startX) * te;
        const y  = tk.startY + (tk.finalY - tk.startY) * te;
        tCtx.save();
        tCtx.globalAlpha = Math.max(0, te);
        tCtx.shadowColor = 'rgba(255, 175, 70, 0.55)';
        tCtx.shadowBlur  = 22 * (1 - te) + 14;
        tCtx.fillStyle   = '#f4ead8';
        tCtx.fillText(tk.text, x, y);
        tCtx.restore();
      }
      if (!allDone) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

let langIndex = 0;

async function titleLoop() {
  while (true) {
    const { text, dir, lang } = LANGUAGES[langIndex];
    titleEl.setAttribute('lang', lang);
    titleEl.setAttribute('dir',  dir);
    titleEl.textContent = text;

    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));

    const cs       = getComputedStyle(titleEl);
    const fontSpec = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const rect     = titleEl.getBoundingClientRect();
    const cx       = window.innerWidth / 2;
    const cy       = rect.top + rect.height / 2;

    tCtx.clearRect(0, 0, titleCanvas.width, titleCanvas.height);
    titleCanvas.style.opacity = '0';
    await wait(400);

    await flowyTitle(text, dir, lang, fontSpec, cx, cy);
    await wait(2500);
    await fadeCanvasOut(1400);
    tCtx.clearRect(0, 0, titleCanvas.width, titleCanvas.height);
    titleEl.textContent = '';

    await wait(600);
    langIndex = (langIndex + 1) % LANGUAGES.length;
  }
}

document.fonts.ready.then(() => {
  document.fonts.load('700 72px "Dancing Script"').then(() => {
    setTimeout(titleLoop, 900);
  });
});
