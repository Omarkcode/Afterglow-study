/* ============================================================
   AFTERGLOW STUDY — menu.js  (main menu)
   ============================================================ */

// ── Supabase ─────────────────────────────────────────────────

const SUPABASE_URL = 'https://rdnswueidjqnxgkhvrjf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_EWpwtIRhvsIQMbNaiKIrPg_vLbgOMNp';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
  const greeting = hour < 12 ? 'Good morning'
                 : hour < 18 ? 'Good afternoon'
                 :             'Good evening';

  document.getElementById('menuGreeting').textContent = `${greeting}, ${name}`;

  // Fade menu in gently
  const wrap = document.getElementById('menuWrap');
  wrap.style.transition = 'opacity 1.4s ease';
  // Small delay so the background has a moment to paint first
  setTimeout(() => { wrap.style.opacity = '1'; }, 300);
})();

// ── Sign Out ──────────────────────────────────────────────────

document.getElementById('signOutBtn').addEventListener('click', async () => {
  await sb.auth.signOut();
  window.location.href = 'index.html';
});

// ── Background (shared functions from background.js) ─────────

startBackground();
