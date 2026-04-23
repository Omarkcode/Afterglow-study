/* ============================================================
   LUMINESCE STUDY — classic.js  (Classic study mode)
   ============================================================ */

// ── Supabase auth gate ────────────────────────────────────────

const sb = supabase.createClient(
  'https://rdnswueidjqnxgkhvrjf.supabase.co',
  'sb_publishable_EWpwtIRhvsIQMbNaiKIrPg_vLbgOMNp'
);

(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) window.location.href = 'index.html';
})();

// ── Background ────────────────────────────────────────────────

startBackground();

// ── Exit ──────────────────────────────────────────────────────

document.getElementById('btnExit').addEventListener('click', () => {
  window.location.href = 'menu.html';
});

// ── Panel toggle ──────────────────────────────────────────────

function togglePanel(panelId, btnId) {
  const panel = document.getElementById(panelId);
  const btn   = document.getElementById(btnId);
  const open  = panel.hidden;

  panel.hidden = !open;
  btn.classList.toggle('sb-btn--active', open);
}

document.getElementById('btnTimer').addEventListener('click', () => togglePanel('panelTimer', 'btnTimer'));
document.getElementById('btnTasks').addEventListener('click', () => togglePanel('panelTasks', 'btnTasks'));
document.getElementById('btnMusic').addEventListener('click', () => togglePanel('panelMusic', 'btnMusic'));

// ── Drag-to-move panels ───────────────────────────────────────

function makeDraggable(panel) {
  const handle = panel.querySelector('.panel-handle');
  let dragging = false;
  let origX, origY, startX, startY;

  handle.addEventListener('mousedown', (e) => {
    dragging = true;
    const r = panel.getBoundingClientRect();
    origX = r.left; origY = r.top;
    startX = e.clientX; startY = e.clientY;

    // Fix position so transform doesn't interfere after first drag
    panel.style.left      = origX + 'px';
    panel.style.top       = origY + 'px';
    panel.style.right     = 'auto';
    panel.style.bottom    = 'auto';
    panel.style.transform = 'none';

    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    panel.style.left = (origX + e.clientX - startX) + 'px';
    panel.style.top  = (origY + e.clientY - startY) + 'px';
  });

  document.addEventListener('mouseup', () => { dragging = false; });
}

document.querySelectorAll('.panel').forEach(makeDraggable);

// ── Timer ─────────────────────────────────────────────────────

let timerH = 0, timerM = 25, timerS = 0;
let timerInterval = null;
let timerRunning  = false;

function renderTimer() {
  document.getElementById('tH').textContent = String(timerH).padStart(2, '0');
  document.getElementById('tM').textContent = String(timerM).padStart(2, '0');
  document.getElementById('tS').textContent = String(timerS).padStart(2, '0');
}

document.querySelectorAll('.timer-adj').forEach(btn => {
  btn.addEventListener('click', () => {
    if (timerRunning) return; // lock while counting down
    const delta = parseInt(btn.dataset.delta);
    const field = btn.dataset.field;
    if (field === 'h') timerH = Math.max(0, Math.min(99, timerH + delta));
    if (field === 'm') timerM = Math.max(0, Math.min(59, timerM + delta));
    if (field === 's') timerS = Math.max(0, Math.min(59, timerS + delta));
    renderTimer();
  });
});

document.getElementById('btnTimerStart').addEventListener('click', () => {
  const btn = document.getElementById('btnTimerStart');

  if (timerRunning) {
    clearInterval(timerInterval);
    timerRunning = false;
    btn.textContent = 'Start';
    return;
  }

  if (timerH === 0 && timerM === 0 && timerS === 0) return;

  timerRunning = true;
  btn.textContent = 'Pause';

  timerInterval = setInterval(() => {
    if (timerH === 0 && timerM === 0 && timerS === 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      btn.textContent = 'Start';
      return;
    }
    if (timerS > 0)       { timerS--; }
    else if (timerM > 0)  { timerM--; timerS = 59; }
    else if (timerH > 0)  { timerH--; timerM = 59; timerS = 59; }
    renderTimer();
  }, 1000);
});

document.getElementById('btnTimerReset').addEventListener('click', () => {
  clearInterval(timerInterval);
  timerRunning = false;
  timerH = 0; timerM = 25; timerS = 0;
  document.getElementById('btnTimerStart').textContent = 'Start';
  renderTimer();
});

renderTimer();

// ── Task List ─────────────────────────────────────────────────

document.getElementById('taskForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('taskInput');
  const text  = input.value.trim();
  if (!text) return;

  const li = document.createElement('li');
  li.className = 'task-item';

  // Sanitise text before inserting
  const safe = document.createTextNode(text);
  const span = document.createElement('span');
  span.className = 'task-text';
  span.appendChild(safe);

  const chk = document.createElement('input');
  chk.type = 'checkbox';
  chk.className = 'task-check';
  chk.addEventListener('change', () => li.classList.toggle('done', chk.checked));

  const del = document.createElement('button');
  del.className = 'task-del';
  del.textContent = '✕';
  del.setAttribute('aria-label', 'Delete task');
  del.addEventListener('click', () => li.remove());

  li.append(chk, span, del);
  document.getElementById('taskList').appendChild(li);

  input.value = '';
  input.focus();
});

// ── Music ─────────────────────────────────────────────────────

const PRESETS = [
  { name: 'Late Night Study', url: 'https://cdn.pixabay.com/audio/2025/12/14/audio_f942df3dcc.mp3' },
  { name: 'Rainy Café',       url: 'https://cdn.pixabay.com/audio/2022/12/12/audio_e17505bad5.mp3' },
  { name: 'Cozy Bedroom',     url: 'https://cdn.pixabay.com/audio/2024/11/03/audio_f8553f33ce.mp3' },
  { name: 'Golden Hour',      url: 'https://cdn.pixabay.com/audio/2025/05/19/audio_df39b1bba0.mp3' },
];

let presetIdx = 0;
let cycleMode = false; // false = loop (∞), true = cycle (→)

const audio = new Audio();
audio.src = PRESETS[presetIdx].url;

function loadTrack(idx) {
  audio.src = PRESETS[idx].url;
  document.getElementById('trackName').textContent = PRESETS[idx].name;
}

audio.addEventListener('ended', () => {
  if (cycleMode) {
    presetIdx = (presetIdx + 1) % PRESETS.length;
    loadTrack(presetIdx);
    audio.play();
  } else {
    audio.currentTime = 0;
    audio.play();
  }
});

// ── Music panel UI ────────────────────────────────────────────
document.getElementById('trackName').textContent = PRESETS[presetIdx].name;

document.getElementById('btnPlayPause').addEventListener('click', () => {
  const btn = document.getElementById('btnPlayPause');
  if (!audio.paused) {
    audio.pause();
    btn.innerHTML = '&#9654;';
  } else {
    audio.play();
    btn.innerHTML = '&#9646;&#9646;';
  }
});

document.getElementById('btnPrev').addEventListener('click', () => {
  const wasPlaying = !audio.paused;
  presetIdx = (presetIdx - 1 + PRESETS.length) % PRESETS.length;
  loadTrack(presetIdx);
  if (wasPlaying) audio.play();
});

document.getElementById('btnNext').addEventListener('click', () => {
  const wasPlaying = !audio.paused;
  presetIdx = (presetIdx + 1) % PRESETS.length;
  loadTrack(presetIdx);
  if (wasPlaying) audio.play();
});

document.getElementById('modeSwitch').addEventListener('change', e => {
  cycleMode = e.target.checked;
});
