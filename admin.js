/* ============================================================
   admin.js — developer-only feedback admin panel
   ============================================================ */

const sb = supabase.createClient(
  'https://rdnswueidjqnxgkhvrjf.supabase.co',
  'sb_publishable_EWpwtIRhvsIQMbNaiKIrPg_vLbgOMNp'
);

const DEV_ID = '0b6cdbd0-b937-4644-827c-3bc7a4d027fe';
let selectedUserId = null;

(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (!session || session.user.id !== DEV_ID) {
    window.location.href = 'menu.html';
    return;
  }

  startBackground();
  document.getElementById('admPage').style.opacity = '1';
  document.getElementById('admPage').style.transition = 'opacity 0.4s ease';

  document.getElementById('btnBack').addEventListener('click', () => {
    window.location.href = 'menu.html';
  });

  await loadThreads();
})();

async function loadThreads() {
  const { data, error } = await sb
    .from('feedback')
    .select('user_id, message, created_at, is_dev_reply')
    .order('created_at', { ascending: false });

  if (error || !data?.length) {
    document.getElementById('admThreadList').innerHTML =
      '<div class="adm-empty">No feedback yet.</div>';
    return;
  }

  // Group by user_id, keep latest message per user
  const threads = new Map();
  data.forEach(row => {
    if (!threads.has(row.user_id)) {
      threads.set(row.user_id, row);
    }
  });

  const list = document.getElementById('admThreadList');
  list.innerHTML = '';
  threads.forEach((latest, userId) => {
    const item = document.createElement('div');
    item.className = 'adm-thread-item';
    item.dataset.userId = userId;
    item.innerHTML = `
      <div class="adm-thread-id">${userId.slice(0, 8)}…</div>
      <div class="adm-thread-preview">${escAdm(latest.message).slice(0, 48)}…</div>
    `;
    item.addEventListener('click', () => openThread(userId, item));
    list.appendChild(item);
  });
}

async function openThread(userId, itemEl) {
  selectedUserId = userId;

  document.querySelectorAll('.adm-thread-item').forEach(el =>
    el.classList.remove('adm-thread-item--active')
  );
  itemEl.classList.add('adm-thread-item--active');

  const { data, error } = await sb
    .from('feedback')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  const convo = document.getElementById('admConvo');
  convo.innerHTML = '';

  const messages = document.createElement('div');
  messages.className = 'adm-messages';
  messages.id = 'admMessages';

  if (!error && data?.length) {
    data.forEach(row => appendAdmMessage(row, messages));
  }

  const inputWrap = document.createElement('div');
  inputWrap.className = 'adm-input-wrap';
  inputWrap.innerHTML = `
    <textarea class="adm-input" id="admInput"
      placeholder="Reply as Stellar [DEV]…" rows="2"></textarea>
    <button class="adm-send" id="admSend">Reply</button>
  `;

  convo.appendChild(messages);
  convo.appendChild(inputWrap);
  messages.scrollTop = messages.scrollHeight;

  document.getElementById('admSend').addEventListener('click', sendReply);
  document.getElementById('admInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendReply();
  });
}

function appendAdmMessage(row, container) {
  const el = document.createElement('div');
  el.className = row.is_dev_reply ? 'adm-message adm-message--dev' : 'adm-message adm-message--user';

  const date = new Date(row.created_at).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  el.innerHTML = `
    <div class="adm-message-label">${row.is_dev_reply ? 'Stellar [DEV]' : 'User'}</div>
    <div class="adm-message-text">${escAdm(row.message)}</div>
    <div class="adm-message-time">${date}</div>
  `;
  container.appendChild(el);
}

async function sendReply() {
  const input   = document.getElementById('admInput');
  const message = input.value.trim();
  if (!message || !selectedUserId) return;

  const btn = document.getElementById('admSend');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  const { data, error } = await sb.from('feedback').insert({
    user_id:      selectedUserId,
    message,
    is_dev_reply: true
  }).select().single();

  btn.disabled = false;
  btn.textContent = 'Reply';

  if (error) {
    alert('Could not send reply: ' + (error.message || error.code));
    return;
  }

  input.value = '';
  const messages = document.getElementById('admMessages');
  appendAdmMessage(data, messages);
  messages.scrollTop = messages.scrollHeight;
}

function escAdm(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}
