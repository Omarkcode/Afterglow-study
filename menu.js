/* ============================================================
   LUMINESCE STUDY — menu.js  (main menu)
   ============================================================ */

// ── Supabase ─────────────────────────────────────────────────

const SUPABASE_URL = 'https://rdnswueidjqnxgkhvrjf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_EWpwtIRhvsIQMbNaiKIrPg_vLbgOMNp';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const DEV_ID = '0b6cdbd0-b937-4644-827c-3bc7a4d027fe';

// ── Auth gate — redirect if not logged in ─────────────────────

(async () => {
  const { data: { session } } = await sb.auth.getSession();

  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  // ── Personalised greeting ───────────────────────────────────
  const user     = session.user;
  const name     = user.user_metadata?.username
                || user.email.split('@')[0];
  const hour     = new Date().getHours();
  let greetingText;
  if (hour >= 21 || hour < 4) {
    greetingText = `Still up, ${name}?`;
  } else if (hour < 12) {
    greetingText = `Good morning, ${name}`;
  } else if (hour < 18) {
    greetingText = `Good afternoon, ${name}`;
  } else {
    greetingText = `Good evening, ${name}`;
  }

  document.getElementById('menuGreeting').textContent = greetingText;

  if (user.id === DEV_ID) {
    document.getElementById('btnAdmin').style.display = '';
  }

  // Fade panel in gently after background has a moment to paint
  const panel = document.getElementById('menuPanel');
  setTimeout(() => { panel.style.opacity = '1'; }, 300);
})();

// ── Background (shared functions from background.js) ─────────

startBackground();

// ── Classic mode — zoom-into-icon transition ──────────────────

document.querySelector('[data-mode="classic"]').addEventListener('click', (e) => {
  const card = e.currentTarget;
  const icon = card.querySelector('.grid-icon');
  const r    = icon.getBoundingClientRect();

  // Circular overlay that starts at the icon and expands to fill the screen
  const zoom = document.createElement('div');
  zoom.style.cssText = `
    position: fixed;
    left: ${r.left + r.width  / 2}px;
    top:  ${r.top  + r.height / 2}px;
    width: 4px; height: 4px;
    background: #06091a;
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(1);
    z-index: 1000;
    pointer-events: none;
    transition: transform 0.55s cubic-bezier(0.4, 0, 0.6, 1);
  `;
  document.body.appendChild(zoom);

  // Calculate scale needed to fill the diagonal of the viewport
  const diag  = Math.hypot(window.innerWidth, window.innerHeight);
  const scale = (diag * 2) / 4; // 4px base → cover full screen

  requestAnimationFrame(() => requestAnimationFrame(() => {
    zoom.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }));

  setTimeout(() => { window.location.href = 'classic.html'; }, 570);
});

document.querySelector('[data-mode="pomodoro"]').addEventListener('click', (e) => {
  const card = e.currentTarget;
  const icon = card.querySelector('.grid-icon');
  const r    = icon.getBoundingClientRect();

  const zoom = document.createElement('div');
  zoom.style.cssText = `
    position: fixed;
    left: ${r.left + r.width  / 2}px;
    top:  ${r.top  + r.height / 2}px;
    width: 4px; height: 4px;
    background: #06091a;
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(1);
    z-index: 1000;
    pointer-events: none;
    transition: transform 0.55s cubic-bezier(0.4, 0, 0.6, 1);
  `;
  document.body.appendChild(zoom);

  const diag  = Math.hypot(window.innerWidth, window.innerHeight);
  const scale = (diag * 2) / 4;

  requestAnimationFrame(() => requestAnimationFrame(() => {
    zoom.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }));

  setTimeout(() => { window.location.href = 'pomodoro.html'; }, 570);
});

document.querySelector('[data-mode="study-buddy"]').addEventListener('click', (e) => {
  const card = e.currentTarget;
  const icon = card.querySelector('.grid-icon');
  const r    = icon.getBoundingClientRect();

  const zoom = document.createElement('div');
  zoom.style.cssText = `
    position: fixed;
    left: ${r.left + r.width  / 2}px;
    top:  ${r.top  + r.height / 2}px;
    width: 4px; height: 4px;
    background: #06091a;
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(1);
    z-index: 1000;
    pointer-events: none;
    transition: transform 0.55s cubic-bezier(0.4, 0, 0.6, 1);
  `;
  document.body.appendChild(zoom);

  const diag  = Math.hypot(window.innerWidth, window.innerHeight);
  const scale = (diag * 2) / 4;

  requestAnimationFrame(() => requestAnimationFrame(() => {
    zoom.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }));

  setTimeout(() => { window.location.href = 'study-buddy.html'; }, 570);
});

document.querySelector('[data-mode="groups"]').addEventListener('click', (e) => {
  const card = e.currentTarget;
  const icon = card.querySelector('.grid-icon');
  const r    = icon.getBoundingClientRect();

  const zoom = document.createElement('div');
  zoom.style.cssText = `
    position: fixed;
    left: ${r.left + r.width  / 2}px;
    top:  ${r.top  + r.height / 2}px;
    width: 4px; height: 4px;
    background: #06091a;
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(1);
    z-index: 1000;
    pointer-events: none;
    transition: transform 0.55s cubic-bezier(0.4, 0, 0.6, 1);
  `;
  document.body.appendChild(zoom);

  const diag  = Math.hypot(window.innerWidth, window.innerHeight);
  const scale = (diag * 2) / 4;

  requestAnimationFrame(() => requestAnimationFrame(() => {
    zoom.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }));

  setTimeout(() => { window.location.href = 'groups.html'; }, 570);
});

document.querySelector('[data-mode="settings"]').addEventListener('click', (e) => {
  const card = e.currentTarget;
  const icon = card.querySelector('.grid-icon');
  const r    = icon.getBoundingClientRect();

  const zoom = document.createElement('div');
  zoom.style.cssText = `
    position: fixed;
    left: ${r.left + r.width  / 2}px;
    top:  ${r.top  + r.height / 2}px;
    width: 4px; height: 4px;
    background: #06091a;
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(1);
    z-index: 1000;
    pointer-events: none;
    transition: transform 0.55s cubic-bezier(0.4, 0, 0.6, 1);
  `;
  document.body.appendChild(zoom);

  const diag  = Math.hypot(window.innerWidth, window.innerHeight);
  const scale = (diag * 2) / 4;

  requestAnimationFrame(() => requestAnimationFrame(() => {
    zoom.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }));

  setTimeout(() => { window.location.href = 'settings.html'; }, 570);
});

document.querySelector('[data-mode="library"]').addEventListener('click', (e) => {
  const card = e.currentTarget;
  const icon = card.querySelector('.grid-icon');
  const r    = icon.getBoundingClientRect();

  const zoom = document.createElement('div');
  zoom.style.cssText = `
    position: fixed;
    left: ${r.left + r.width  / 2}px;
    top:  ${r.top  + r.height / 2}px;
    width: 4px; height: 4px;
    background: #06091a;
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(1);
    z-index: 1000;
    pointer-events: none;
    transition: transform 0.55s cubic-bezier(0.4, 0, 0.6, 1);
  `;
  document.body.appendChild(zoom);

  const diag  = Math.hypot(window.innerWidth, window.innerHeight);
  const scale = (diag * 2) / 4;

  requestAnimationFrame(() => requestAnimationFrame(() => {
    zoom.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }));

  setTimeout(() => { window.location.href = 'library.html'; }, 570);
});

document.querySelector('[data-mode="feedback"]').addEventListener('click', (e) => {
  const card = e.currentTarget;
  const icon = card.querySelector('.grid-icon');
  const r    = icon.getBoundingClientRect();

  const zoom = document.createElement('div');
  zoom.style.cssText = `
    position: fixed;
    left: ${r.left + r.width  / 2}px;
    top:  ${r.top  + r.height / 2}px;
    width: 4px; height: 4px;
    background: #06091a;
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(1);
    z-index: 1000;
    pointer-events: none;
    transition: transform 0.55s cubic-bezier(0.4, 0, 0.6, 1);
  `;
  document.body.appendChild(zoom);

  const diag  = Math.hypot(window.innerWidth, window.innerHeight);
  const scale = (diag * 2) / 4;

  requestAnimationFrame(() => requestAnimationFrame(() => {
    zoom.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }));

  setTimeout(() => { window.location.href = 'feedback.html'; }, 570);
});

document.getElementById('btnAdmin').addEventListener('click', (e) => {
  const card = e.currentTarget;
  const icon = card.querySelector('.grid-icon');
  const r    = icon.getBoundingClientRect();

  const zoom = document.createElement('div');
  zoom.style.cssText = `
    position: fixed;
    left: ${r.left + r.width  / 2}px;
    top:  ${r.top  + r.height / 2}px;
    width: 4px; height: 4px;
    background: #06091a;
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(1);
    z-index: 1000;
    pointer-events: none;
    transition: transform 0.55s cubic-bezier(0.4, 0, 0.6, 1);
  `;
  document.body.appendChild(zoom);

  const diag  = Math.hypot(window.innerWidth, window.innerHeight);
  const scale = (diag * 2) / 4;

  requestAnimationFrame(() => requestAnimationFrame(() => {
    zoom.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }));

  setTimeout(() => { window.location.href = 'admin.html'; }, 570);
});
