/* ============================================================
   study-buddy.js — AI chat page with Groq + knowledge panels
   ============================================================ */

// ── Supabase auth gate ────────────────────────────────────────

const sb = supabase.createClient(
  'https://rdnswueidjqnxgkhvrjf.supabase.co',
  'sb_publishable_EWpwtIRhvsIQMbNaiKIrPg_vLbgOMNp'
);

(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }
})();

// ── Background ────────────────────────────────────────────────

startBackground();

// ── Exit ──────────────────────────────────────────────────────

document.getElementById('btnExit').addEventListener('click', () => {
  window.location.href = 'menu.html';
});

// ── Edit panel state ──────────────────────────────────────────

let _editPanel = null;

// ── File attachment state ─────────────────────────────────────

let _attachedFile = null; // { type: 'image'|'text', name, data, mimeType }

function setAttachedFile(file) {
  _attachedFile = file;
  document.getElementById('sbFileChipName').textContent = file.name;
  document.getElementById('sbFileChip').hidden = false;
}

function clearAttachedFile() {
  _attachedFile = null;
  document.getElementById('sbFileChip').hidden = true;
  document.getElementById('sbFileInput').value = '';
}

document.getElementById('sbAttach').addEventListener('click', () => {
  document.getElementById('sbFileInput').click();
});

document.getElementById('sbFileChipClose').addEventListener('click', clearAttachedFile);

document.getElementById('sbFileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  if (file.type.startsWith('image/')) {
    reader.onload = (ev) => setAttachedFile({ type: 'image', name: file.name, data: ev.target.result, mimeType: file.type });
    reader.readAsDataURL(file);
  } else {
    reader.onload = (ev) => setAttachedFile({ type: 'text', name: file.name, data: ev.target.result });
    reader.readAsText(file);
  }
});

function setEditPanel(panel) {
  _editPanel = panel;
  const chip  = document.getElementById('sbEditChip');
  const name  = document.getElementById('sbEditChipName');
  const icon  = panel.type === 'flashcard' ? '🃏' : '📝';
  name.textContent = `${icon} ${panel.name}`;
  chip.hidden = false;
  const inputEl = document.getElementById('sbInput');
  inputEl.placeholder = 'Tell Study Buddy how to edit this panel…';
  inputEl.focus();
}

function clearEditPanel() {
  _editPanel = null;
  document.getElementById('sbEditChip').hidden = true;
  document.getElementById('sbInput').placeholder = 'Ask Study Buddy anything… (Shift+Enter for new line)';
}

document.getElementById('sbEditChipClose').addEventListener('click', clearEditPanel);

// ── Usage tracking ────────────────────────────────────────────

const GROQ_MSG_LIMIT = 6000;
const GROQ_TOK_LIMIT = 500000;

function getUsageData() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = JSON.parse(localStorage.getItem('luminesce_groq_usage') || '{}');
    if (raw.date === today) return raw;
  } catch { /* invalid JSON */ }
  return { date: new Date().toISOString().slice(0, 10), messages: 0, approxTokens: 0 };
}

function recordUsage(inputText, responseText) {
  const data = getUsageData();
  data.messages += 1;
  data.approxTokens += Math.round((inputText.length + responseText.length) / 4);
  localStorage.setItem('luminesce_groq_usage', JSON.stringify(data));
  if (!document.getElementById('usagePanel').hidden) renderUsagePanel();
}

function renderUsagePanel() {
  const data = getUsageData();

  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const msLeft = midnight - now;
  const hLeft  = Math.floor(msLeft / 3600000);
  const mLeft  = Math.floor((msLeft % 3600000) / 60000);
  document.getElementById('usageResets').textContent = `Resets in ${hLeft}h ${mLeft}m`;

  const msgPct = Math.min(100, (data.messages / GROQ_MSG_LIMIT) * 100);
  const tokPct = Math.min(100, (data.approxTokens / GROQ_TOK_LIMIT) * 100);

  document.getElementById('usageMsgCount').textContent = data.messages;
  document.getElementById('usageTokCount').textContent =
    data.approxTokens >= 1000
      ? `~${(data.approxTokens / 1000).toFixed(1)}K`
      : `~${data.approxTokens}`;
  document.getElementById('usageMsgBar').style.width = msgPct + '%';
  document.getElementById('usageTokBar').style.width = tokPct + '%';
}

document.getElementById('btnUsage').addEventListener('click', () => {
  const panel = document.getElementById('usagePanel');
  const open  = panel.hidden;
  panel.hidden = !open;
  document.getElementById('btnUsage').classList.toggle('sb-btn--active', open);
  if (open) renderUsagePanel();
});

// ── Knowledge Finder panel ────────────────────────────────────

window.KF_EDIT_MODE = true;

// Edit button in KF panel triggers the drag-drop same flow
window.onKnowledgePanelEdit = (panel) => {
  setEditPanel(panel);
  document.getElementById('kfPanel').hidden = true;
  document.getElementById('btnKF').classList.remove('sb-btn--active');
};

document.getElementById('btnKF').addEventListener('click', () => {
  const panel = document.getElementById('kfPanel');
  const btn   = document.getElementById('btnKF');
  const open  = panel.hidden;

  panel.hidden = !open;
  btn.classList.toggle('sb-btn--active', open);

  if (open) renderKnowledgeFinder(document.getElementById('kfList'));
});

// ── Drag-and-drop: panel card → chat input ────────────────────

const inputBarEl = document.getElementById('sbInputBar');

inputBarEl.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  inputBarEl.classList.add('drag-over');
});

inputBarEl.addEventListener('dragleave', (e) => {
  if (!inputBarEl.contains(e.relatedTarget)) {
    inputBarEl.classList.remove('drag-over');
  }
});

// Also accept drops anywhere on the messages area for convenience
document.getElementById('sbMessages').addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  inputBarEl.classList.add('drag-over');
});

document.getElementById('sbMessages').addEventListener('dragleave', (e) => {
  if (!document.querySelector('.sb-chat-wrap').contains(e.relatedTarget)) {
    inputBarEl.classList.remove('drag-over');
  }
});

function handlePanelDrop(e) {
  e.preventDefault();
  inputBarEl.classList.remove('drag-over');
  try {
    const panel = JSON.parse(e.dataTransfer.getData('application/json'));
    if (panel && panel.id) setEditPanel(panel);
  } catch { /* not a panel drag */ }
}

inputBarEl.addEventListener('drop', handlePanelDrop);
document.getElementById('sbMessages').addEventListener('drop', handlePanelDrop);

// ── Groq system prompt ────────────────────────────────────────

const SYSTEM_PROMPT = `You are Study Buddy, a warm and encouraging AI study assistant inside the Luminesce Study app. You help students understand difficult topics, stay motivated, and build great study materials.

When a student asks you to create flashcards, vocab cards, or study cards, respond with a knowledge panel in this exact format:

[KNOWLEDGE_PANEL]
{
  "name": "descriptive name for the set",
  "type": "flashcard",
  "questions": [
    {"front": "term or question", "back": "definition or answer"}
  ]
}
[/KNOWLEDGE_PANEL]

When a student asks you to create a quiz or multiple-choice questions, use:

[KNOWLEDGE_PANEL]
{
  "name": "descriptive quiz name",
  "type": "test",
  "questions": [
    {
      "question": "question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "unit": "Unit 4.1 — Topic Name"
    }
  ]
}
[/KNOWLEDGE_PANEL]

Rules:
- "correct" is the zero-based index of the correct answer
- Use 4 options for regular questions; use exactly 2 options ["True", "False"] for true/false questions
- Always include a "unit" field on every test question — use the real curriculum unit number and topic name if known (e.g. "Unit 3.2 — Cell Division", "Chapter 7 — The French Revolution"). If the unit is unknown, make a reasonable short label like "Topic: Photosynthesis"
- Aim for 8–12 items in flashcard sets, 6–8 in quizzes
- You may write a brief intro sentence before the panel block and a closing line after it
- When editing an existing panel, output the full improved version in the same format

Keep responses concise, warm, and encouraging. If you don't know something, say so honestly.`;

// ── Conversation history ──────────────────────────────────────

let conversationHistory = [];
let isStreaming = false;

// ── Render helpers ────────────────────────────────────────────

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderMarkdown(text) {
  if (!text) return '';
  let s = escHtml(text);
  s = s.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([\s\S]*?)\*/g,     '<em>$1</em>');
  s = s.replace(/`([^`\n]+)`/g,        '<code>$1</code>');
  const parts = s.split(/\n\n+/);
  return parts.map(p => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('');
}

function cleanForDisplay(rawText) {
  let s = rawText.replace(/\[KNOWLEDGE_PANEL\][\s\S]*?\[\/KNOWLEDGE_PANEL\]/g, '');
  s = s.replace(/\[KNOWLEDGE_PANEL\][\s\S]*/g, '');
  return s.trim();
}

// ── Append / update messages ──────────────────────────────────

function appendMessage(role, text) {
  const msgsEl = document.getElementById('sbMessages');
  const msg    = document.createElement('div');
  msg.className = `msg msg--${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = role === 'ai' ? '✦' : 'You';

  const inner  = document.createElement('div');
  inner.className = 'msg-inner';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = renderMarkdown(text);

  inner.appendChild(bubble);
  msg.appendChild(avatar);
  msg.appendChild(inner);
  msgsEl.appendChild(msg);
  msgsEl.scrollTop = msgsEl.scrollHeight;
  return msg;
}

function updateBubble(msgEl, rawText, typing) {
  const bubble = msgEl.querySelector('.msg-bubble');
  const display = cleanForDisplay(rawText);
  bubble.innerHTML = renderMarkdown(display);
  if (typing) {
    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    bubble.appendChild(cursor);
  }
  document.getElementById('sbMessages').scrollTop = document.getElementById('sbMessages').scrollHeight;
}

// ── Extract & save/update knowledge panels ────────────────────

async function extractAndSavePanels(fullText, msgEl, editingPanel) {
  const regex = /\[KNOWLEDGE_PANEL\]([\s\S]*?)\[\/KNOWLEDGE_PANEL\]/g;
  let match;
  while ((match = regex.exec(fullText)) !== null) {
    let panelData;
    try {
      panelData = JSON.parse(match[1].trim());
    } catch {
      continue;
    }

    let saved;
    if (editingPanel) {
      saved = await updateKnowledgePanel(editingPanel.id, panelData);
    } else {
      saved = await saveKnowledgePanel(panelData);
    }

    const inner = msgEl.querySelector('.msg-inner');
    const badge = document.createElement('div');
    badge.className = 'msg-panel-saved';
    badge.textContent = saved
      ? (editingPanel ? `✓ "${panelData.name}" updated in Knowledge Finder` : `✓ "${panelData.name}" saved to Knowledge Finder`)
      : `⚠ Could not save "${panelData.name}"`;
    inner.appendChild(badge);
  }

  const kfPanel = document.getElementById('kfPanel');
  if (!kfPanel.hidden) renderKnowledgeFinder(document.getElementById('kfList'));
}

// ── Groq streaming request ────────────────────────────────────

async function sendToGroq(userDisplayText, apiUserText, editingPanel, attachment) {
  if (isStreaming) return;

  if (typeof GROQ_API_KEY === 'undefined' || GROQ_API_KEY === 'your-groq-api-key-here') {
    appendMessage('ai', '⚠ No Groq API key found. Please create a **config.js** file with your key — see **config.example.js** for the format.');
    return;
  }

  isStreaming = true;
  setSendDisabled(true);

  // Show user message, with filename appended if file attached
  const displayText = attachment
    ? (userDisplayText + `\n\n📎 *${attachment.name}*`)
    : userDisplayText;
  appendMessage('user', displayText);

  // Build API messages and pick model
  let model = 'llama-3.3-70b-versatile';
  let apiMessages;

  if (attachment?.type === 'image') {
    model = 'llama-3.2-11b-vision-preview';
    // Vision message — send alongside prior history
    const imageMsg = {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: attachment.data } },
        { type: 'text', text: apiUserText }
      ]
    };
    apiMessages = [{ role: 'system', content: SYSTEM_PROMPT }, ...conversationHistory, imageMsg];
    // Add a text-only summary to history for follow-up context
    conversationHistory.push({ role: 'user', content: `[Attached image: ${attachment.name}] ${apiUserText}` });
  } else if (attachment?.type === 'text') {
    const combined = `[Attached file: ${attachment.name}]\n\n${attachment.data}\n\n---\n\n${apiUserText}`;
    conversationHistory.push({ role: 'user', content: combined });
    apiMessages = [{ role: 'system', content: SYSTEM_PROMPT }, ...conversationHistory];
  } else {
    conversationHistory.push({ role: 'user', content: apiUserText });
    apiMessages = [{ role: 'system', content: SYSTEM_PROMPT }, ...conversationHistory];
  }

  const aiMsgEl = appendMessage('ai', '');
  updateBubble(aiMsgEl, '', true);

  let fullResponse = '';

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages:    apiMessages,
        stream:      true,
        max_tokens:  2048,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${response.status}`);
    }

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') continue;
        try {
          const json  = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content || '';
          fullResponse += delta;
          updateBubble(aiMsgEl, fullResponse, true);
        } catch { /* partial chunk */ }
      }
    }

    updateBubble(aiMsgEl, fullResponse, false);
    recordUsage(apiUserText, fullResponse);
    conversationHistory.push({ role: 'assistant', content: fullResponse });

    if (conversationHistory.length > 24) {
      conversationHistory = conversationHistory.slice(conversationHistory.length - 24);
    }

    await extractAndSavePanels(fullResponse, aiMsgEl, editingPanel);

  } catch (err) {
    updateBubble(aiMsgEl, `❌ Something went wrong: ${err.message}`, false);
  }

  isStreaming = false;
  setSendDisabled(false);
  document.getElementById('sbInput').focus();
}

// ── Input helpers ─────────────────────────────────────────────

function setSendDisabled(disabled) {
  document.getElementById('sbSend').disabled = disabled;
}

function autoResizeInput(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}

// ── Input event handlers ──────────────────────────────────────

const inputEl = document.getElementById('sbInput');

inputEl.addEventListener('input', () => autoResizeInput(inputEl));

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

document.getElementById('sbSend').addEventListener('click', handleSend);

function handleSend() {
  const text = inputEl.value.trim();
  if ((!text && !_attachedFile) || isStreaming) return;

  const editingPanel = _editPanel;
  const attachment   = _attachedFile;
  const userText     = text || `Please analyse this file and help me study it.`;
  let apiText        = userText;

  if (editingPanel) {
    apiText = `Please edit this knowledge panel as follows: ${userText}\n\nCurrent panel:\n[KNOWLEDGE_PANEL]\n${JSON.stringify(editingPanel, null, 2)}\n[/KNOWLEDGE_PANEL]`;
    clearEditPanel();
  }

  if (attachment) clearAttachedFile();

  inputEl.value = '';
  inputEl.style.height = 'auto';

  sendToGroq(userText, apiText, editingPanel, attachment);
}

// ── Welcome message ───────────────────────────────────────────

(function showWelcome() {
  const welcome = appendMessage('ai', '');
  welcome.querySelector('.msg-bubble').innerHTML = renderMarkdown(
    `Hey there! I'm your Study Buddy 👋\n\nI can help you **understand any topic**, **make flashcards**, or **quiz you** on your material. Just tell me what you're studying and I'll get to work.\n\nFor example, try:\n- *"Make 10 flashcards on the French Revolution"*\n- *"Quiz me on photosynthesis"*\n- *"Explain quantum entanglement simply"*\n\n📎 You can also **attach an image or text file** of your notes — I'll turn it into a flashcard set or quiz of your choice.\n\nTo edit a saved panel, **drag it from the Knowledge Finder into the chat** and tell me what to change.`
  );
  document.getElementById('sbMessages').scrollTop = 0;
})();
