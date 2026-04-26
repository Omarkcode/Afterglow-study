/* ============================================================
   LUMINESCE STUDY — pomodoro.js  (Pomodoro study mode)
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

document.getElementById('btnPomodoro').addEventListener('click',  () => togglePanel('panelPomodoro',    'btnPomodoro'));
document.getElementById('btnTracker').addEventListener('click',   () => togglePanel('panelTracker',     'btnTracker'));
document.getElementById('btnTasks').addEventListener('click',     () => togglePanel('panelTasks',       'btnTasks'));
document.getElementById('btnMusic').addEventListener('click',     () => togglePanel('panelMusic',       'btnMusic'));
document.getElementById('btnNotes').addEventListener('click',     () => togglePanel('panelNotes',       'btnNotes'));
document.getElementById('btnDeadline').addEventListener('click',  () => togglePanel('panelDeadline',    'btnDeadline'));
document.getElementById('btnKF').addEventListener('click', () => {
  const panel = document.getElementById('kfPanel');
  const open  = panel.hidden;
  togglePanel('kfPanel', 'btnKF');
  if (open) renderKnowledgeFinder(document.getElementById('kfList'));
});

// Focus mode starts/stops the distraction reminder interval
let distractionInterval = null;
document.getElementById('btnDistraction').addEventListener('click', () => {
  const panel = document.getElementById('panelDistraction');
  const isOpening = panel.hidden;
  togglePanel('panelDistraction', 'btnDistraction');
  if (isOpening) {
    distractionInterval = setInterval(showFocusToast, 3 * 60 * 1000);
  } else {
    clearInterval(distractionInterval);
    distractionInterval = null;
  }
});

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

// ── Ambient chime ─────────────────────────────────────────────

function playChime() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = ctx.currentTime + i * 0.28;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.30, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    osc.start(t);
    osc.stop(t + 1.4);
  });
}

// ── Pomodoro Timer ────────────────────────────────────────────

const STUDY_SHORT = 20 * 60;
const STUDY_LONG  = 25 * 60;
const BREAK_SHORT =  5 * 60;
const BREAK_LONG  = 10 * 60;

let studyLong    = false;
let breakLong    = false;
let pomoPhase    = 'study';
let pomoRunning  = false;
let pomoSecsLeft = STUDY_SHORT;
let pomoInterval = null;

function getStudyTime() { return studyLong ? STUDY_LONG : STUDY_SHORT; }
function getBreakTime()  { return breakLong ? BREAK_LONG : BREAK_SHORT; }

function fmtSecs(s) {
  return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
}

function renderPomoTimers() {
  const studyStudySecs = pomoPhase === 'study' ? pomoSecsLeft : getStudyTime();
  const breakBreakSecs = pomoPhase === 'break' ? pomoSecsLeft : getBreakTime();
  document.getElementById('pomoStudyDisplay').textContent = fmtSecs(studyStudySecs);
  document.getElementById('pomoBreakDisplay').textContent = fmtSecs(breakBreakSecs);
}

function setPomoPhase(phase) {
  pomoPhase = phase;
  const studySec = document.getElementById('pomoStudySection');
  const breakSec = document.getElementById('pomoBreakSection');
  studySec.classList.toggle('pomo-section--active', phase === 'study');
  breakSec.classList.toggle('pomo-section--active', phase === 'break');
}

document.getElementById('studyModeSwitch').addEventListener('change', (e) => {
  if (pomoRunning) { e.target.checked = studyLong; return; }
  studyLong = e.target.checked;
  if (pomoPhase === 'study') {
    pomoSecsLeft = getStudyTime();
    renderPomoTimers();
  }
});

document.getElementById('breakModeSwitch').addEventListener('change', (e) => {
  if (pomoRunning) { e.target.checked = breakLong; return; }
  breakLong = e.target.checked;
  if (pomoPhase === 'break') {
    pomoSecsLeft = getBreakTime();
    renderPomoTimers();
  }
});

document.getElementById('btnPomoStart').addEventListener('click', () => {
  const btn = document.getElementById('btnPomoStart');
  if (pomoRunning) {
    clearInterval(pomoInterval);
    pomoRunning = false;
    btn.textContent = 'Start';
    return;
  }

  // Lock intention at start of study phase
  if (pomoPhase === 'study') {
    const text = document.getElementById('intentionText').value.trim();
    if (text) {
      document.getElementById('intentionDisplay').textContent = text;
      localStorage.setItem('luminesce_intention', text);
      setIntentionState('locked');
    }
  }

  pomoRunning = true;
  btn.textContent = 'Pause';

  pomoInterval = setInterval(() => {
    pomoSecsLeft--;
    renderPomoTimers();

    if (pomoSecsLeft <= 0) {
      playChime();
      if (pomoPhase === 'study') {
        setPomoPhase('break');
        pomoSecsLeft = getBreakTime();
        renderPomoTimers();
        showIntentionReview(); // show review during break
      } else {
        incrementTracker();
        setIntentionState('input'); // reset for next session
        setPomoPhase('study');
        pomoSecsLeft = getStudyTime();
        renderPomoTimers();
      }
    }
  }, 1000);
});

document.getElementById('btnPomoReset').addEventListener('click', () => {
  clearInterval(pomoInterval);
  pomoRunning = false;
  document.getElementById('btnPomoStart').textContent = 'Start';
  setIntentionState('input');
  setPomoPhase('study');
  pomoSecsLeft = getStudyTime();
  renderPomoTimers();
});

renderPomoTimers();

// ── Tomato Jar Tracker ────────────────────────────────────────

let pomodoroCount = 0;

(async () => {
  const { data: { user } } = await sb.auth.getUser();
  pomodoroCount = user?.user_metadata?.pomodoro_count || 0;
  document.getElementById('trackerCount').textContent = pomodoroCount;
})();

async function incrementTracker() {
  pomodoroCount++;
  document.getElementById('trackerCount').textContent = pomodoroCount;
  await sb.auth.updateUser({ data: { pomodoro_count: pomodoroCount } });
}

// ── Task List ─────────────────────────────────────────────────

const PRIORITY_ORDER = { red: 0, yellow: 1, green: 2, grey: 3 };

let tasks = JSON.parse(localStorage.getItem('luminesce_tasks') || '[]');

function saveTasks() {
  localStorage.setItem('luminesce_tasks', JSON.stringify(tasks));
}

function renderTasks() {
  const list = document.getElementById('taskList');
  list.innerHTML = '';

  [...tasks]
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    .forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item' + (task.done ? ' done' : '');

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.className = 'task-check';
      chk.checked = task.done;
      chk.addEventListener('change', () => {
        task.done = chk.checked;
        saveTasks();
        renderTasks();
      });

      const span = document.createElement('span');
      span.className = 'task-text';
      span.appendChild(document.createTextNode(task.text));

      const del = document.createElement('button');
      del.className = 'task-del';
      del.textContent = '✕';
      del.setAttribute('aria-label', 'Delete task');
      del.addEventListener('click', () => {
        tasks = tasks.filter(t => t.id !== task.id);
        saveTasks();
        renderTasks();
      });

      const dot = document.createElement('button');
      dot.className = 'priority-dot priority-dot--' + task.priority;
      dot.setAttribute('aria-label', 'Set priority');
      dot.addEventListener('click', (e) => {
        document.querySelectorAll('.priority-picker').forEach(p => p.remove());

        const picker = document.createElement('div');
        picker.className = 'priority-picker';

        ['red', 'yellow', 'green', 'grey'].forEach(color => {
          const opt = document.createElement('button');
          opt.className = 'priority-opt priority-opt--' + color;
          opt.setAttribute('aria-label', color + ' priority');
          opt.addEventListener('click', () => {
            task.priority = color;
            saveTasks();
            picker.remove();
            renderTasks();
          });
          picker.appendChild(opt);
        });

        li.appendChild(picker);
        e.stopPropagation();
      });

      li.append(chk, span, del, dot);
      list.appendChild(li);
    });
}

document.addEventListener('click', () => {
  document.querySelectorAll('.priority-picker').forEach(p => p.remove());
});

document.getElementById('taskForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('taskInput');
  const text  = input.value.trim();
  if (!text) return;
  tasks.push({ id: Date.now(), text, done: false, priority: 'grey' });
  saveTasks();
  renderTasks();
  input.value = '';
  input.focus();
});

document.getElementById('btnTasksClear').addEventListener('click', () => {
  tasks = [];
  saveTasks();
  renderTasks();
});

renderTasks();

// ── Music ─────────────────────────────────────────────────────

const PRESETS = [
  { name: 'Late Night Study', url: 'https://cdn.pixabay.com/audio/2025/12/14/audio_f942df3dcc.mp3' },
  { name: 'Rainy Café',       url: 'https://cdn.pixabay.com/audio/2022/12/12/audio_e17505bad5.mp3' },
  { name: 'Cozy Bedroom',     url: 'https://cdn.pixabay.com/audio/2024/11/03/audio_f8553f33ce.mp3' },
  { name: 'Golden Hour',      url: 'https://cdn.pixabay.com/audio/2025/05/19/audio_df39b1bba0.mp3' },
  { name: 'Intergalactic Trip', url: 'https://cdn.pixabay.com/audio/2026/04/11/audio_598980b38d.mp3' },
];

let presetIdx = 0;
let cycleMode = false;

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

// ── Notes ─────────────────────────────────────────────────────

const notesArea = document.getElementById('notesArea');
notesArea.value = localStorage.getItem('luminesce_notes') || '';
notesArea.addEventListener('input', () => {
  localStorage.setItem('luminesce_notes', notesArea.value);
});

document.getElementById('btnNotesClear').addEventListener('click', () => {
  notesArea.value = '';
  localStorage.setItem('luminesce_notes', '');
});

// ── Focus Mode (Distraction Blocker) ──────────────────────────

function showFocusToast() {
  const messages = [
    'Stay focused — you\'re doing great!',
    'Put distractions aside. You\'ve got this.',
    'Keep going — stay on task!',
    'Eyes on the goal. Stay present.',
  ];
  const toast = document.getElementById('focusToast');
  toast.textContent = messages[Math.floor(Math.random() * messages.length)];
  toast.hidden = false;
  toast.classList.add('toast--visible');
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => { toast.hidden = true; }, 400);
  }, 3500);
}

// ── Countdown to Deadline ─────────────────────────────────────

let deadlineInterval = null;

function showDeadlineCountdown(dateStr) {
  const deadline = new Date(dateStr);
  document.getElementById('deadlinePicker').hidden = true;
  document.getElementById('deadlineCountdown').hidden = false;

  function update() {
    const diff = deadline - new Date();
    if (diff <= 0) {
      document.getElementById('deadlineTime').textContent = 'Deadline has passed!';
      clearInterval(deadlineInterval);
      return;
    }
    const days  = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins  = Math.floor((diff % 3600000)  / 60000);
    const secs  = Math.floor((diff % 60000)    / 1000);
    document.getElementById('deadlineTime').textContent =
      `${days}d  ${String(hours).padStart(2,'0')}h  ${String(mins).padStart(2,'0')}m  ${String(secs).padStart(2,'0')}s`;
  }

  update();
  deadlineInterval = setInterval(update, 1000);
}

const savedDeadline = localStorage.getItem('luminesce_deadline');
if (savedDeadline && new Date(savedDeadline) > new Date()) {
  showDeadlineCountdown(savedDeadline);
} else {
  localStorage.removeItem('luminesce_deadline');
}

document.getElementById('btnDeadlineSubmit').addEventListener('click', () => {
  const val = document.getElementById('deadlineInput').value;
  if (!val) return;
  const iso = new Date(val).toISOString();
  localStorage.setItem('luminesce_deadline', iso);
  clearInterval(deadlineInterval);
  showDeadlineCountdown(iso);
});

document.getElementById('btnDeadlineClear').addEventListener('click', () => {
  clearInterval(deadlineInterval);
  localStorage.removeItem('luminesce_deadline');
  document.getElementById('deadlineInput').value = '';
  document.getElementById('deadlinePicker').hidden = false;
  document.getElementById('deadlineCountdown').hidden = true;
});

// ── Session Intention ─────────────────────────────────────────

function setIntentionState(state) {
  document.getElementById('intentionInput').hidden  = state !== 'input';
  document.getElementById('intentionLocked').hidden = state !== 'locked';
  document.getElementById('intentionReview').hidden = state !== 'review';
}

function showIntentionReview() {
  const text = document.getElementById('intentionText').value.trim();
  if (!text || document.getElementById('intentionLocked').hidden) return;
  document.getElementById('intentionReviewText').textContent = text;
  setIntentionState('review');
}

const savedIntention = localStorage.getItem('luminesce_intention');
if (savedIntention) document.getElementById('intentionText').value = savedIntention;

document.getElementById('btnIntentionSet').addEventListener('click', () => {
  const text = document.getElementById('intentionText').value.trim();
  if (!text) return;
  document.getElementById('intentionDisplay').textContent = text;
  localStorage.setItem('luminesce_intention', text);
  setIntentionState('locked');
});

document.getElementById('btnIntentionYes').addEventListener('click', () => {
  const section = document.getElementById('pomoIntention');
  section.classList.add('intention--achieved');
  setTimeout(() => {
    section.classList.remove('intention--achieved');
    document.getElementById('intentionText').value = '';
    localStorage.removeItem('luminesce_intention');
    setIntentionState('input');
  }, 900);
});

document.getElementById('btnIntentionNo').addEventListener('click', () => {
  setIntentionState('input');
});

// ── Distraction Log ───────────────────────────────────────────

let distractions = JSON.parse(localStorage.getItem('luminesce_distractions') || '[]');

function saveDistractions() {
  localStorage.setItem('luminesce_distractions', JSON.stringify(distractions));
}

function renderDistractions() {
  const list = document.getElementById('distractionLogList');
  list.innerHTML = '';
  distractions.forEach(entry => {
    const li = document.createElement('li');
    li.className = 'distraction-log-item';
    li.appendChild(document.createTextNode(entry.text));
    list.appendChild(li);
  });
}

document.getElementById('distractionLogForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('distractionLogInput');
  const text  = input.value.trim();
  if (!text) return;
  distractions.push({ id: Date.now(), text });
  saveDistractions();
  renderDistractions();
  input.value = '';
  input.focus();
});

document.getElementById('btnDistractionLogClear').addEventListener('click', () => {
  distractions = [];
  saveDistractions();
  renderDistractions();
});

renderDistractions();
