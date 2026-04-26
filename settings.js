/* ============================================================
   settings.js — Settings page
   ============================================================ */

const sb = supabase.createClient(
  'https://rdnswueidjqnxgkhvrjf.supabase.co',
  'sb_publishable_EWpwtIRhvsIQMbNaiKIrPg_vLbgOMNp'
);

startBackground();

// ── Auth gate + populate account info ────────────────────────

(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }

  const user  = session.user;
  const name  = user.user_metadata?.username || user.email.split('@')[0];
  const email = user.email;
  const count = user.user_metadata?.pomodoro_count || 0;
  const joined = new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  document.getElementById('settingAvatar').textContent   = name[0].toUpperCase();
  document.getElementById('settingName').textContent     = name;
  document.getElementById('settingEmail').textContent    = email;
  document.getElementById('settingJoined').textContent   = `Joined ${joined}`;
  document.getElementById('settingPomoCount').textContent = `· ${count}`;

  setTimeout(() => { document.getElementById('settingPage').style.opacity = '1'; }, 200);
})();

// ── Back button ───────────────────────────────────────────────

document.getElementById('btnBack').addEventListener('click', () => {
  window.location.href = 'menu.html';
});

// ── Day mode toggle ───────────────────────────────────────────

const dayToggle = document.getElementById('dayModeToggle');
dayToggle.checked = localStorage.getItem('luminesce_day_mode') === 'on';

dayToggle.addEventListener('change', () => {
  const on = dayToggle.checked;
  localStorage.setItem('luminesce_day_mode', on ? 'on' : 'off');
  if (on) {
    document.documentElement.setAttribute('data-theme', 'day');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  buildSky();
});

// ── Chime toggle ──────────────────────────────────────────────

const chimeToggle = document.getElementById('chimeToggle');
chimeToggle.checked = localStorage.getItem('luminesce_chimes') !== 'off';

chimeToggle.addEventListener('change', () => {
  localStorage.setItem('luminesce_chimes', chimeToggle.checked ? 'on' : 'off');
});

// ── Reset Pomodoro count ──────────────────────────────────────

document.getElementById('btnResetPomo').addEventListener('click', async () => {
  if (!confirm('Reset your Pomodoro count to 0?')) return;
  await sb.auth.updateUser({ data: { pomodoro_count: 0 } });
  document.getElementById('settingPomoCount').textContent = '· 0';
  showToast('Pomodoro count reset to 0.');
});

// ── Clear local study data ────────────────────────────────────

document.getElementById('btnClearData').addEventListener('click', () => {
  if (!confirm('Clear all local study data? This removes tasks, notes, deadline, distractions, and session intention.')) return;
  [
    'luminesce_tasks',
    'luminesce_notes',
    'luminesce_deadline',
    'luminesce_distractions',
    'luminesce_intention',
  ].forEach(k => localStorage.removeItem(k));
  showToast('Study data cleared.');
});

// ── Change password (send reset email) ───────────────────────

document.getElementById('btnChangePassword').addEventListener('click', async () => {
  const { data: { user } } = await sb.auth.getUser();
  await sb.auth.resetPasswordForEmail(user.email);
  showToast('Password reset link sent to ' + user.email);
});

// ── Edit display name ─────────────────────────────────────────

document.getElementById('settingName').addEventListener('click', startEditName);

function startEditName() {
  const nameEl = document.getElementById('settingName');
  const current = nameEl.textContent;

  const input = document.createElement('input');
  input.className = 'set-name-input';
  input.value = current;
  nameEl.replaceWith(input);
  input.focus();
  input.select();

  async function commitName() {
    const newName = input.value.trim() || current;
    await sb.auth.updateUser({ data: { username: newName } });

    const span = document.createElement('span');
    span.className = 'set-name-val';
    span.id = 'settingName';
    span.title = 'Click to edit display name';
    span.textContent = newName;
    input.replaceWith(span);
    span.addEventListener('click', startEditName);

    document.getElementById('settingAvatar').textContent = newName[0].toUpperCase();
    showToast('Display name updated.');
  }

  input.addEventListener('blur', commitName);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { input.value = current; input.blur(); }
  });
}

// ── Sign out ──────────────────────────────────────────────────

document.getElementById('btnSignOut').addEventListener('click', async () => {
  await sb.auth.signOut();
  window.location.href = 'index.html';
});

// ── Toast helper ──────────────────────────────────────────────

function showToast(msg) {
  const toast = document.getElementById('settingToast');
  toast.textContent = msg;
  toast.hidden = false;
  toast.classList.add('set-toast--visible');
  setTimeout(() => {
    toast.classList.remove('set-toast--visible');
    setTimeout(() => { toast.hidden = true; }, 300);
  }, 2800);
}
