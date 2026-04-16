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

// ── Music (Web Audio lofi synthesizer) ───────────────────────

const PRESETS = [
  { name: 'Late Night Study', bpm: 75 },
  { name: 'Rainy Café',       bpm: 68 },
  { name: 'Cozy Bedroom',     bpm: 82 },
  { name: 'Golden Hour',      bpm: 72 },
];

// Jazz chord progressions: Cmaj7 → Am7 → Fmaj7 → G7
const CHORD_SEQ = [
  [60, 64, 67, 71],
  [57, 60, 64, 67],
  [53, 57, 60, 64],
  [55, 59, 62, 65],
];
const BASS_SEQ = [60, 57, 53, 55];

const SWING        = 0.62;   // >0.5 swings the beat
const LOOKAHEAD    = 0.10;   // seconds to schedule ahead
const SCHED_MS     = 25;     // scheduler tick interval (ms)

let presetIdx    = 0;
let lofiCtx      = null;
let masterGain   = null;
let noiseBuffer  = null;
let lofiPlaying  = false;
let schedTimer   = null;
let beatStep     = 0;
let nextBeatTime = 0;

function midi2hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

function initAudio() {
  if (lofiCtx) return;
  lofiCtx    = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = lofiCtx.createGain();
  masterGain.gain.value = 0.70;
  const warmth = lofiCtx.createBiquadFilter();
  warmth.type = 'lowpass';
  warmth.frequency.value = 5500;
  masterGain.connect(warmth);
  warmth.connect(lofiCtx.destination);

  // Shared noise buffer (2 s of white noise, reused for drums)
  const nbLen = lofiCtx.sampleRate * 2;
  noiseBuffer = lofiCtx.createBuffer(1, nbLen, lofiCtx.sampleRate);
  const nd = noiseBuffer.getChannelData(0);
  for (let i = 0; i < nbLen; i++) nd[i] = Math.random() * 2 - 1;

  // Vinyl hiss + crackle
  const vLen = lofiCtx.sampleRate * 4;
  const vBuf = lofiCtx.createBuffer(1, vLen, lofiCtx.sampleRate);
  const vd   = vBuf.getChannelData(0);
  for (let i = 0; i < vLen; i++) {
    vd[i]  = (Math.random() - 0.5) * 0.016;
    if (Math.random() < 0.0007) vd[i] += (Math.random() - 0.5) * 0.85;
  }
  const vSrc = lofiCtx.createBufferSource();
  vSrc.buffer = vBuf; vSrc.loop = true;
  const vBp = lofiCtx.createBiquadFilter();
  vBp.type = 'bandpass'; vBp.frequency.value = 2800; vBp.Q.value = 0.6;
  const vG = lofiCtx.createGain(); vG.gain.value = 0.20;
  vSrc.connect(vBp); vBp.connect(vG); vG.connect(masterGain);
  vSrc.start();
}

// ── Drum voices ───────────────────────────────────────────────
function kick(t) {
  const o = lofiCtx.createOscillator();
  const g = lofiCtx.createGain();
  o.connect(g); g.connect(masterGain);
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(38, t + 0.10);
  g.gain.setValueAtTime(0.88, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
  o.start(t); o.stop(t + 0.42);
}

function snare(t) {
  const src = lofiCtx.createBufferSource(); src.buffer = noiseBuffer;
  const hp  = lofiCtx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
  const g   = lofiCtx.createGain();
  src.connect(hp); hp.connect(g); g.connect(masterGain);
  g.gain.setValueAtTime(0.46, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
  src.start(t); src.stop(t + 0.21);

  const o = lofiCtx.createOscillator(); const g2 = lofiCtx.createGain();
  o.frequency.value = 195; o.connect(g2); g2.connect(masterGain);
  g2.gain.setValueAtTime(0.20, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  o.start(t); o.stop(t + 0.11);
}

function hat(t, open = false) {
  const src = lofiCtx.createBufferSource(); src.buffer = noiseBuffer;
  const bp  = lofiCtx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 9000; bp.Q.value = 0.9;
  const g   = lofiCtx.createGain();
  src.connect(bp); bp.connect(g); g.connect(masterGain);
  const dur = open ? 0.09 : 0.04;
  g.gain.setValueAtTime(open ? 0.14 : 0.09, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.start(t); src.stop(t + dur + 0.01);
}

// ── Harmonic voices ───────────────────────────────────────────
function pad(t, notes, dur) {
  notes.forEach((m, i) => {
    const hz = midi2hz(m - 12);
    const o1 = lofiCtx.createOscillator(); o1.type = 'triangle'; o1.frequency.value = hz;
    const o2 = lofiCtx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = hz * 1.005;
    const lp = lofiCtx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
    const g  = lofiCtx.createGain();
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(masterGain);
    const del = i * 0.04;
    const vol = 0.048;
    g.gain.setValueAtTime(0, t + del);
    g.gain.linearRampToValueAtTime(vol, t + del + 0.35);
    g.gain.setValueAtTime(vol, t + dur - 0.55);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o1.start(t + del); o1.stop(t + dur + 0.05);
    o2.start(t + del); o2.stop(t + dur + 0.05);
  });
}

function bass(t, midi, dur) {
  const hz = midi2hz(midi - 24);
  const o  = lofiCtx.createOscillator(); o.type = 'triangle'; o.frequency.value = hz;
  const lp = lofiCtx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 360;
  const g  = lofiCtx.createGain();
  o.connect(lp); lp.connect(g); g.connect(masterGain);
  g.gain.setValueAtTime(0.52, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.start(t); o.stop(t + dur + 0.05);
}

// ── Beat scheduler ────────────────────────────────────────────
function playStep(t) {
  const s8    = beatStep % 8;   // 0-7 within bar (8th-note steps)
  const barN  = Math.floor(beatStep / 8) % CHORD_SEQ.length;
  const bpm   = PRESETS[presetIdx].bpm;
  const beat  = 60 / bpm;

  if (s8 === 0 || s8 === 4) kick(t);
  if (s8 === 2 || s8 === 6) snare(t);
  hat(t, s8 === 3);           // open hat just before snare on beat 2

  if (s8 === 0) {
    pad(t, CHORD_SEQ[barN], beat * 7.6);
    bass(t, BASS_SEQ[barN], beat * 1.4);
  }
  if (s8 === 4) bass(t, BASS_SEQ[barN], beat * 0.85);
}

function scheduler() {
  while (nextBeatTime < lofiCtx.currentTime + LOOKAHEAD) {
    playStep(nextBeatTime);
    const bpm    = PRESETS[presetIdx].bpm;
    const beat   = 60 / bpm;
    const even   = (beatStep % 2 === 0);
    nextBeatTime += even ? beat * SWING : beat * (1 - SWING);
    beatStep++;
  }
  if (lofiPlaying) schedTimer = setTimeout(scheduler, SCHED_MS);
}

function startLofi() {
  initAudio();
  if (lofiCtx.state === 'suspended') lofiCtx.resume();
  if (lofiPlaying) return;
  lofiPlaying  = true;
  beatStep     = 0;
  nextBeatTime = lofiCtx.currentTime + 0.05;
  scheduler();
}

function stopLofi() {
  lofiPlaying = false;
  clearTimeout(schedTimer);
  if (lofiCtx) lofiCtx.suspend();
}

// ── Music panel UI ────────────────────────────────────────────
document.getElementById('trackName').textContent = PRESETS[presetIdx].name;

document.getElementById('btnPlayPause').addEventListener('click', () => {
  const btn = document.getElementById('btnPlayPause');
  if (lofiPlaying) {
    stopLofi();
    btn.innerHTML = '&#9654;';
  } else {
    startLofi();
    btn.innerHTML = '&#9646;&#9646;';
  }
});

document.getElementById('btnPrev').addEventListener('click', () => {
  presetIdx = (presetIdx - 1 + PRESETS.length) % PRESETS.length;
  document.getElementById('trackName').textContent = PRESETS[presetIdx].name;
  if (lofiPlaying) { stopLofi(); startLofi(); }
});

document.getElementById('btnNext').addEventListener('click', () => {
  presetIdx = (presetIdx + 1) % PRESETS.length;
  document.getElementById('trackName').textContent = PRESETS[presetIdx].name;
  if (lofiPlaying) { stopLofi(); startLofi(); }
});
