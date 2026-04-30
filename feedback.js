/* ============================================================
   feedback.js
   ============================================================ */

const sb = supabase.createClient(
  'https://rdnswueidjqnxgkhvrjf.supabase.co',
  'sb_publishable_EWpwtIRhvsIQMbNaiKIrPg_vLbgOMNp'
);

const DEV_ID = '0b6cdbd0-b937-4644-827c-3bc7a4d027fe';
let currentUser = null;

(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }
  currentUser = session.user;

  startBackground();
  document.getElementById('fbPage').style.opacity = '1';
  document.getElementById('fbPage').style.transition = 'opacity 0.4s ease';

  await loadFeedback();

  document.getElementById('btnBack').addEventListener('click', () => {
    window.location.href = 'menu.html';
  });

  document.getElementById('fbSend').addEventListener('click', sendFeedback);
  document.getElementById('fbInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendFeedback();
  });
})();

async function loadFeedback() {
  const { data, error } = await sb
    .from('feedback')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: true });

  const list = document.getElementById('fbMessages');

  if (error || !data?.length) {
    list.innerHTML = '<div class="fb-empty">No messages yet. We\'d love to hear from you!</div>';
    return;
  }

  list.innerHTML = '';
  data.forEach(row => appendMessage(row));
  list.scrollTop = list.scrollHeight;
}

function appendMessage(row) {
  const list   = document.getElementById('fbMessages');
  const isDev  = row.is_dev_reply === true;
  const el     = document.createElement('div');
  el.className = isDev ? 'fb-message fb-message--dev' : 'fb-message';

  const date = new Date(row.created_at).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  el.innerHTML = `
    ${isDev ? `<div class="fb-message-sender">Stellar <span class="fb-dev-badge">[DEV]</span></div>` : ''}
    <div class="fb-message-text">${escFb(row.message)}</div>
    <div class="fb-message-time">${date}</div>
  `;
  list.appendChild(el);
}

async function sendFeedback() {
  const input   = document.getElementById('fbInput');
  const message = input.value.trim();
  if (!message) return;

  const btn = document.getElementById('fbSend');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  const { data, error } = await sb.from('feedback').insert({
    user_id:      currentUser.id,
    message,
    is_dev_reply: false
  }).select().single();

  if (error) {
    btn.disabled = false;
    btn.textContent = 'Send';
    showToast('Could not send. Please try again.');
    return;
  }

  input.value = '';
  btn.disabled = false;
  btn.textContent = 'Send';

  const list = document.getElementById('fbMessages');
  const empty = list.querySelector('.fb-empty');
  if (empty) empty.remove();

  appendMessage(data);
  list.scrollTop = list.scrollHeight;
  showToast('Sent — thank you!');
}

function showToast(msg) {
  let toast = document.getElementById('fbToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'fbToast';
    toast.className = 'fb-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('fb-toast--visible');
  setTimeout(() => toast.classList.remove('fb-toast--visible'), 3000);
}

function escFb(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}
