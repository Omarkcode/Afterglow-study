/* ============================================================
   knowledge.js — shared Knowledge Finder + Panel Player
   Loaded by classic.html, pomodoro.html, and study-buddy.html
   ============================================================ */

const _kbSb = supabase.createClient(
  'https://rdnswueidjqnxgkhvrjf.supabase.co',
  'sb_publishable_EWpwtIRhvsIQMbNaiKIrPg_vLbgOMNp'
);

// Set to true by study-buddy.js to show "Edit with AI" buttons
window.KF_EDIT_MODE = false;

// Called by study-buddy.js when user wants to edit a panel
window.onKnowledgePanelEdit = null;

// ── Inject player overlay into the page ──────────────────────

(function injectPlayerOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'kp-overlay';
  overlay.id = 'kpOverlay';
  overlay.hidden = true;
  overlay.innerHTML = `<div class="kp-modal" id="kpModal"></div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePlayer();
  });
})();

// ── Knowledge Finder ──────────────────────────────────────────

async function loadKnowledgePanels() {
  const { data: { user } } = await _kbSb.auth.getUser();
  if (!user) return [];
  const { data, error } = await _kbSb
    .from('knowledge_panels')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) { console.error('Knowledge panels load error:', error); return []; }
  return data || [];
}

async function renderKnowledgeFinder(listEl) {
  listEl.innerHTML = '<div class="kf-empty">Loading…</div>';
  const panels = await loadKnowledgePanels();

  if (panels.length === 0) {
    listEl.innerHTML = '<div class="kf-empty">No knowledge panels yet.<br>Ask Study Buddy to create one!</div>';
    return;
  }

  listEl.innerHTML = '';
  panels.forEach(panel => {
    const count = panel.questions?.length || 0;
    const icon  = panel.type === 'flashcard' ? '🃏' : '📝';
    const label = panel.type === 'flashcard' ? `${count} card${count !== 1 ? 's' : ''}` : `${count} question${count !== 1 ? 's' : ''}`;

    const card = document.createElement('div');
    card.className = 'kf-card';
    card.draggable = true;
    card.innerHTML = `
      <div class="kf-card-top">
        <span class="kf-card-icon">${icon}</span>
        <span class="kf-card-name">${escKf(panel.name)}</span>
      </div>
      <div class="kf-card-meta">${label}${window.KF_EDIT_MODE ? ' · drag to chat to edit' : ''}</div>
      <div class="kf-card-btns">
        <button class="kf-btn kf-btn--play" data-id="${panel.id}">▶ Play</button>
        ${window.KF_EDIT_MODE ? `<button class="kf-btn kf-btn--edit" data-id="${panel.id}">✦ Edit</button>` : ''}
      </div>
    `;

    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('application/json', JSON.stringify(panel));
      e.dataTransfer.effectAllowed = 'copy';
      card.style.opacity = '0.45';
    });
    card.addEventListener('dragend', () => { card.style.opacity = ''; });

    card.querySelector('.kf-btn--play').addEventListener('click', () => openPlayer(panel));
    if (window.KF_EDIT_MODE) {
      card.querySelector('.kf-btn--edit').addEventListener('click', () => {
        if (typeof window.onKnowledgePanelEdit === 'function') window.onKnowledgePanelEdit(panel);
      });
    }

    listEl.appendChild(card);
  });
}

function escKf(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Panel Player ──────────────────────────────────────────────

let _currentPanel   = null;
let _currentIdx     = 0;
let _flipped        = false;
let _answers        = [];

function openPlayer(panel) {
  _currentPanel = panel;
  _currentIdx   = 0;
  _flipped      = false;
  _answers      = new Array(panel.questions.length).fill(null);

  if (panel.type === 'flashcard') renderFlashcard();
  else renderTest();

  document.getElementById('kpOverlay').hidden = false;
}

function closePlayer() {
  document.getElementById('kpOverlay').hidden = true;
  document.getElementById('kpModal').innerHTML = '';
}

// ── Flashcard player ──────────────────────────────────────────

function renderFlashcard() {
  const panel = _currentPanel;
  const q     = panel.questions[_currentIdx];
  const total = panel.questions.length;
  const modal = document.getElementById('kpModal');

  modal.innerHTML = `
    <div class="kp-modal-header">
      <span class="kp-modal-title">${escKf(panel.name)}</span>
      <span class="kp-modal-progress">${_currentIdx + 1} / ${total}</span>
      <button class="kp-close" id="kpCloseBtn">✕</button>
    </div>
    <div class="kp-body">
      <div class="flashcard" id="flashcard">
        <div class="flashcard-inner" id="flashcardInner">
          <div class="flashcard-face flashcard-face--front">
            <div class="flashcard-label">Front</div>
            <div class="flashcard-text">${escKf(q.front)}</div>
            <div class="flashcard-hint">Click to flip</div>
          </div>
          <div class="flashcard-face flashcard-face--back">
            <div class="flashcard-label">Back</div>
            <div class="flashcard-text">${escKf(q.back)}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="kp-footer">
      <button class="t-action t-action--ghost" id="kpPrev" ${_currentIdx === 0 ? 'disabled style="opacity:0.3"' : ''}>← Prev</button>
      <button class="t-action" id="kpNext">${_currentIdx === total - 1 ? 'Done' : 'Next →'}</button>
    </div>
  `;

  document.getElementById('kpCloseBtn').addEventListener('click', closePlayer);
  document.getElementById('flashcard').addEventListener('click', () => {
    _flipped = !_flipped;
    document.getElementById('flashcardInner').classList.toggle('flipped', _flipped);
  });
  document.getElementById('kpPrev').addEventListener('click', () => {
    _currentIdx--;
    _flipped = false;
    renderFlashcard();
  });
  document.getElementById('kpNext').addEventListener('click', () => {
    if (_currentIdx < total - 1) {
      _currentIdx++;
      _flipped = false;
      renderFlashcard();
    } else {
      closePlayer();
    }
  });
}

// ── Test player ───────────────────────────────────────────────

function renderTest() {
  const panel    = _currentPanel;
  const q        = panel.questions[_currentIdx];
  const total    = panel.questions.length;
  const modal    = document.getElementById('kpModal');
  const selected = _answers[_currentIdx];

  modal.innerHTML = `
    <div class="kp-modal-header">
      <span class="kp-modal-title">${escKf(panel.name)}</span>
      <span class="kp-modal-progress">Question ${_currentIdx + 1} of ${total}</span>
      <button class="kp-close" id="kpCloseBtn">✕</button>
    </div>
    <div class="kp-body">
      <div class="test-question">${escKf(q.question)}</div>
      <div class="test-options" id="testOptions">
        ${q.options.map((opt, i) => `
          <button class="test-option ${selected === i ? 'selected' : ''}" data-idx="${i}">
            ${escKf(opt)}
          </button>
        `).join('')}
      </div>
    </div>
    <div class="kp-footer">
      <button class="t-action t-action--ghost" id="kpPrev" ${_currentIdx === 0 ? 'disabled style="opacity:0.3"' : ''}>← Prev</button>
      <button class="t-action" id="kpNext" ${selected === null ? 'disabled style="opacity:0.4"' : ''}>${_currentIdx === total - 1 ? 'Finish' : 'Next →'}</button>
    </div>
  `;

  document.getElementById('kpCloseBtn').addEventListener('click', closePlayer);

  document.querySelectorAll('.test-option').forEach(btn => {
    btn.addEventListener('click', () => {
      _answers[_currentIdx] = parseInt(btn.dataset.idx);
      renderTest();
    });
  });

  document.getElementById('kpPrev').addEventListener('click', () => {
    _currentIdx--;
    renderTest();
  });

  document.getElementById('kpNext').addEventListener('click', () => {
    if (_currentIdx < total - 1) {
      _currentIdx++;
      renderTest();
    } else {
      renderResults();
    }
  });
}

// ── Results screen ────────────────────────────────────────────

function renderResults() {
  const panel   = _currentPanel;
  const total   = panel.questions.length;
  const correct = panel.questions.filter((q, i) => _answers[i] === q.correct).length;
  const pct     = Math.round((correct / total) * 100);
  const missed  = panel.questions.filter((q, i) => _answers[i] !== q.correct);
  const modal   = document.getElementById('kpModal');

  const missedHtml = missed.length === 0
    ? `<div class="results-perfect">🌟 Perfect score — outstanding work!</div>`
    : `<div class="results-missed">
        <div class="results-missed-title">Review these</div>
        ${missed.map(q => `
          <div class="results-missed-item">
            <div class="results-missed-question">${escKf(q.question)}</div>
            ${q.unit ? `<div class="results-missed-unit">📖 Study: ${escKf(q.unit)}</div>` : ''}
          </div>
        `).join('')}
      </div>`;

  modal.innerHTML = `
    <div class="kp-modal-header">
      <span class="kp-modal-title">Results</span>
      <button class="kp-close" id="kpCloseBtn">✕</button>
    </div>
    <div class="kp-body">
      <div class="kp-results">
        <div class="results-score">${correct}/${total}</div>
        <div class="results-label">${pct}% correct</div>
        <div class="results-bar-wrap">
          <div class="results-bar-fill" style="width: ${pct}%"></div>
        </div>
        ${missedHtml}
      </div>
    </div>
    <div class="kp-footer">
      <button class="t-action t-action--ghost" id="kpRetry">Try Again</button>
      <button class="t-action" id="kpCloseResults">Done</button>
    </div>
  `;

  document.getElementById('kpCloseBtn').addEventListener('click', closePlayer);
  document.getElementById('kpCloseResults').addEventListener('click', closePlayer);
  document.getElementById('kpRetry').addEventListener('click', () => {
    _currentIdx = 0;
    _answers    = new Array(panel.questions.length).fill(null);
    renderTest();
  });
}

// ── Save / update panels (called from study-buddy.js) ─────────

async function saveKnowledgePanel(panelData) {
  const { data: { user } } = await _kbSb.auth.getUser();
  if (!user) return null;
  const { data, error } = await _kbSb.from('knowledge_panels').insert({
    user_id:   user.id,
    name:      panelData.name,
    type:      panelData.type,
    questions: panelData.questions,
  }).select().single();
  if (error) { console.error('Save panel error:', error); return null; }
  return data;
}

async function updateKnowledgePanel(id, panelData) {
  const { data: { user } } = await _kbSb.auth.getUser();
  if (!user) return null;
  const { data, error } = await _kbSb
    .from('knowledge_panels')
    .update({ name: panelData.name, type: panelData.type, questions: panelData.questions })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();
  if (error) { console.error('Update panel error:', error); return null; }
  return data;
}
