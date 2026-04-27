/* ============================================================
   groups.js — Study Groups page
   ============================================================ */

const sb = supabase.createClient(
  'https://rdnswueidjqnxgkhvrjf.supabase.co',
  'sb_publishable_EWpwtIRhvsIQMbNaiKIrPg_vLbgOMNp'
);

// ── State ─────────────────────────────────────────────────────

let currentUser    = null;
let myGroups       = [];
let selectedGroupId = null;

// ── Init ──────────────────────────────────────────────────────

(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }

  currentUser = session.user;
  startBackground();

  await refresh();
  setTimeout(() => { document.getElementById('grpPage').style.opacity = '1'; }, 150);
})();

// ── Data ──────────────────────────────────────────────────────

async function refresh() {
  myGroups = await loadMyGroups();
  renderSidebar();

  if (selectedGroupId) {
    const g = myGroups.find(g => g.id === selectedGroupId);
    if (g) await selectGroup(g);
    else    { selectedGroupId = null; showDetailEmpty(); }
  } else {
    showDetailEmpty();
  }
}

async function loadMyGroups() {
  const { data: memberships } = await sb
    .from('group_members')
    .select('group_id')
    .eq('user_id', currentUser.id);

  if (!memberships?.length) return [];

  const ids = memberships.map(m => m.group_id);
  const { data: groups } = await sb
    .from('groups')
    .select('*')
    .in('id', ids)
    .order('created_at');

  return groups || [];
}

// ── Sidebar ───────────────────────────────────────────────────

function renderSidebar() {
  const wrap = document.getElementById('grpListWrap');

  if (myGroups.length === 0) {
    wrap.innerHTML = `
      <div class="grp-sidebar-empty">
        You're not in any groups yet.<br>Create one or join with an invite code.
      </div>`;
    return;
  }

  wrap.innerHTML = '';
  myGroups.forEach(g => {
    const item = document.createElement('div');
    item.className = 'grp-item' + (g.id === selectedGroupId ? ' grp-item--active' : '');
    item.innerHTML = `
      <div class="grp-item-avatar">${escGrp(g.name[0].toUpperCase())}</div>
      <div class="grp-item-info">
        <div class="grp-item-name">${escGrp(g.name)}</div>
        <div class="grp-item-sub">${g.created_by === currentUser.id ? 'Owner' : 'Member'}</div>
      </div>
    `;
    item.addEventListener('click', () => selectGroup(g));
    wrap.appendChild(item);
  });
}

// ── Group detail ──────────────────────────────────────────────

async function selectGroup(group) {
  selectedGroupId = group.id;
  renderSidebar();

  const detail = document.getElementById('grpDetail');
  detail.innerHTML = '<div class="grp-loading">Loading…</div>';

  const [{ data: members }, { data: panels }] = await Promise.all([
    sb.from('group_members').select('*').eq('group_id', group.id).order('joined_at'),
    sb.from('group_panels').select('*').eq('group_id', group.id).order('shared_at', { ascending: false })
  ]);

  renderDetail(group, members || [], panels || []);
}

function renderDetail(group, members, panels) {
  const isOwner = group.created_by === currentUser.id;
  const detail  = document.getElementById('grpDetail');

  detail.innerHTML = `
    <div class="grp-detail-head">
      <div class="grp-detail-top">
        <h2 class="grp-detail-name">${escGrp(group.name)}</h2>
        <button class="grp-btn ${isOwner ? 'grp-btn--danger' : 'grp-btn--ghost'}" id="btnLeaveOrDelete">
          ${isOwner ? 'Delete Group' : 'Leave Group'}
        </button>
      </div>
      <div class="grp-code-row">
        <span class="grp-code-label">Invite code</span>
        <code class="grp-code">${escGrp(group.invite_code)}</code>
        <button class="grp-code-copy" id="btnCopyCode">Copy</button>
      </div>
    </div>

    <div class="grp-section">
      <div class="grp-section-hdr">
        <div class="grp-section-hdr-left">
          <span class="grp-section-title">Members</span>
          <span class="grp-section-count">${members.length}</span>
        </div>
      </div>
      <div class="grp-members-list" id="grpMembersList"></div>
    </div>

    <div class="grp-section">
      <div class="grp-section-hdr">
        <div class="grp-section-hdr-left">
          <span class="grp-section-title">Shared Panels</span>
          <span class="grp-section-count">${panels.length}</span>
        </div>
        <button class="grp-btn grp-btn--amber" id="btnSharePanel">Share a Panel</button>
      </div>
      <div class="grp-panels-grid" id="grpPanelsGrid"></div>
    </div>
  `;

  // Render members
  const membersList = document.getElementById('grpMembersList');
  members.forEach(m => {
    const isGroupOwner = m.user_id === group.created_by;
    const isYou        = m.user_id === currentUser.id;
    const div = document.createElement('div');
    div.className = 'grp-member';
    div.innerHTML = `
      <div class="grp-member-avatar">${escGrp(m.display_name[0].toUpperCase())}</div>
      <div class="grp-member-name">${escGrp(m.display_name)}</div>
      ${isGroupOwner ? '<span class="grp-member-badge">Owner</span>' : ''}
      ${isYou        ? '<span class="grp-member-you">you</span>'     : ''}
    `;
    membersList.appendChild(div);
  });

  // Render panels
  const grid = document.getElementById('grpPanelsGrid');
  if (panels.length === 0) {
    grid.innerHTML = '<div class="grp-panels-empty">No panels shared yet — be the first!</div>';
  } else {
    panels.forEach(p => {
      const icon  = p.panel_type === 'flashcard' ? '🃏' : '📝';
      const count = p.panel_data?.questions?.length || 0;
      const label = p.panel_type === 'flashcard' ? `${count} cards` : `${count} questions`;
      const canDel = p.shared_by === currentUser.id || isOwner;

      const card = document.createElement('div');
      card.className = 'grp-panel-card';
      card.innerHTML = `
        <div class="grp-panel-icon">${icon}</div>
        <div class="grp-panel-name">${escGrp(p.panel_name)}</div>
        <div class="grp-panel-meta">by ${escGrp(p.shared_by_name)} · ${label}</div>
        <div class="grp-panel-btns">
          <button class="grp-panel-btn grp-panel-btn--play">▶ Play</button>
          ${canDel ? '<button class="grp-panel-btn grp-panel-btn--del">✕</button>' : ''}
        </div>
      `;

      card.querySelector('.grp-panel-btn--play').addEventListener('click', () => {
        openPlayer({
          name:      p.panel_name,
          type:      p.panel_type,
          questions: p.panel_data?.questions || []
        });
      });

      if (canDel) {
        card.querySelector('.grp-panel-btn--del').addEventListener('click', async () => {
          if (!confirm(`Remove "${p.panel_name}" from the group?`)) return;
          await sb.from('group_panels').delete().eq('id', p.id);
          showToast('Panel removed.');
          selectGroup(group);
        });
      }

      grid.appendChild(card);
    });
  }

  // Wire buttons
  document.getElementById('btnCopyCode').addEventListener('click', () => {
    navigator.clipboard.writeText(group.invite_code);
    showToast('Invite code copied!');
  });

  document.getElementById('btnLeaveOrDelete').addEventListener('click', () => {
    if (isOwner) confirmDeleteGroup(group);
    else         confirmLeaveGroup(group);
  });

  document.getElementById('btnSharePanel').addEventListener('click', () => {
    openShareModal(group);
  });
}

function showDetailEmpty() {
  const detail = document.getElementById('grpDetail');
  detail.innerHTML = `
    <div class="grp-detail-empty">
      <div class="grp-detail-empty-icon">👥</div>
      <p>Create a study group or join one with an invite code.<br>Share knowledge panels with your group and quiz each other.</p>
      <div class="grp-detail-empty-actions">
        <button class="grp-btn grp-btn--ghost" id="btnJoinEmpty">Join with a code</button>
        <button class="grp-btn grp-btn--primary" id="btnCreateEmpty">+ New Group</button>
      </div>
    </div>
  `;
  document.getElementById('btnJoinEmpty').addEventListener('click', openJoinModal);
  document.getElementById('btnCreateEmpty').addEventListener('click', openCreateModal);
}

// ── Create group modal ────────────────────────────────────────

function openCreateModal() {
  showModal(`
    <div class="grp-modal-title">New Study Group</div>
    <input class="grp-modal-input" id="modalGroupName" placeholder="Group name…" maxlength="40">
    <div class="grp-modal-btns">
      <button class="grp-btn grp-btn--ghost" id="btnModalCancel">Cancel</button>
      <button class="grp-btn grp-btn--primary" id="btnModalOk">Create</button>
    </div>
  `);

  const nameInput = document.getElementById('modalGroupName');
  nameInput.focus();

  document.getElementById('btnModalCancel').addEventListener('click', closeModal);
  document.getElementById('btnModalOk').addEventListener('click', doCreate);
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  doCreate();
    if (e.key === 'Escape') closeModal();
  });

  async function doCreate() {
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }

    const btn = document.getElementById('btnModalOk');
    btn.disabled = true;
    btn.textContent = 'Creating…';

    const displayName = currentUser.user_metadata?.username || currentUser.email.split('@')[0];
    const code = generateCode();

    const { data: group, error } = await sb
      .from('groups')
      .insert({ name, created_by: currentUser.id, invite_code: code })
      .select()
      .single();

    if (error) {
      showToast('Could not create group. Try again.');
      closeModal();
      return;
    }

    await sb.from('group_members').insert({
      group_id:     group.id,
      user_id:      currentUser.id,
      display_name: displayName,
      role:         'owner'
    });

    closeModal();
    await refresh();
    const g = myGroups.find(g => g.id === group.id);
    if (g) selectGroup(g);
    showToast(`"${name}" created!`);
  }
}

// ── Join group modal ──────────────────────────────────────────

function openJoinModal() {
  showModal(`
    <div class="grp-modal-title">Join a Group</div>
    <p class="grp-modal-desc">Enter the 6-character invite code shared by your group.</p>
    <input class="grp-modal-input grp-modal-input--code" id="modalCode"
           placeholder="ABC123" maxlength="6" autocomplete="off" spellcheck="false">
    <div class="grp-modal-btns">
      <button class="grp-btn grp-btn--ghost" id="btnModalCancel">Cancel</button>
      <button class="grp-btn grp-btn--primary" id="btnModalOk">Join</button>
    </div>
  `);

  const codeInput = document.getElementById('modalCode');
  codeInput.focus();
  codeInput.addEventListener('input', () => {
    codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });

  document.getElementById('btnModalCancel').addEventListener('click', closeModal);
  document.getElementById('btnModalOk').addEventListener('click', doJoin);
  codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  doJoin();
    if (e.key === 'Escape') closeModal();
  });

  async function doJoin() {
    const code = codeInput.value.trim().toUpperCase();
    if (code.length < 6) { showToast('Enter the full 6-character code.'); return; }

    const btn = document.getElementById('btnModalOk');
    btn.disabled = true;
    btn.textContent = 'Joining…';

    const { data: group, error } = await sb
      .from('groups')
      .select('*')
      .eq('invite_code', code)
      .single();

    if (error || !group) {
      showToast('No group found with that code.');
      btn.disabled = false;
      btn.textContent = 'Join';
      return;
    }

    if (myGroups.some(g => g.id === group.id)) {
      showToast("You're already in that group.");
      closeModal();
      return;
    }

    const displayName = currentUser.user_metadata?.username || currentUser.email.split('@')[0];

    const { error: joinErr } = await sb.from('group_members').insert({
      group_id:     group.id,
      user_id:      currentUser.id,
      display_name: displayName,
      role:         'member'
    });

    if (joinErr) {
      showToast('Could not join group. Try again.');
      closeModal();
      return;
    }

    closeModal();
    await refresh();
    const g = myGroups.find(g => g.id === group.id);
    if (g) selectGroup(g);
    showToast(`Joined "${group.name}"!`);
  }
}

// ── Share panel modal ─────────────────────────────────────────

async function openShareModal(group) {
  showModal(`
    <div class="grp-modal-title">Share a Panel</div>
    <div class="grp-loading" style="padding:20px 0">Loading your panels…</div>
  `);

  const panels = await loadKnowledgePanels();

  if (panels.length === 0) {
    document.getElementById('grpModal').innerHTML = `
      <div class="grp-modal-title">Share a Panel</div>
      <p class="grp-modal-desc">You don't have any knowledge panels yet. Head to Study Buddy and ask it to make some!</p>
      <div class="grp-modal-btns">
        <button class="grp-btn grp-btn--ghost" id="btnModalCancel">Close</button>
      </div>
    `;
    document.getElementById('btnModalCancel').addEventListener('click', closeModal);
    return;
  }

  const displayName = currentUser.user_metadata?.username || currentUser.email.split('@')[0];

  document.getElementById('grpModal').innerHTML = `
    <div class="grp-modal-title">Share a Panel</div>
    <p class="grp-modal-desc">Pick a panel to share with <strong>${escGrp(group.name)}</strong>.</p>
    <div class="grp-share-list" id="grpShareList"></div>
    <div class="grp-modal-btns">
      <button class="grp-btn grp-btn--ghost" id="btnModalCancel">Cancel</button>
    </div>
  `;
  document.getElementById('btnModalCancel').addEventListener('click', closeModal);

  const list = document.getElementById('grpShareList');
  panels.forEach(p => {
    const icon  = p.type === 'flashcard' ? '🃏' : '📝';
    const count = p.questions?.length || 0;
    const row   = document.createElement('div');
    row.className = 'grp-share-row';
    row.innerHTML = `
      <span class="grp-share-icon">${icon}</span>
      <span class="grp-share-name">${escGrp(p.name)}</span>
      <span class="grp-share-count">${count} ${p.type === 'flashcard' ? 'cards' : 'qs'}</span>
      <button class="grp-btn grp-btn--amber grp-share-btn">Share</button>
    `;
    row.querySelector('.grp-share-btn').addEventListener('click', async () => {
      const btn = row.querySelector('.grp-share-btn');
      btn.disabled = true;
      btn.textContent = '…';

      await sb.from('group_panels').insert({
        group_id:       group.id,
        panel_name:     p.name,
        panel_type:     p.type,
        panel_data:     { questions: p.questions },
        shared_by:      currentUser.id,
        shared_by_name: displayName
      });

      closeModal();
      selectGroup(group);
      showToast(`"${p.name}" shared!`);
    });
    list.appendChild(row);
  });
}

// ── Leave / Delete ────────────────────────────────────────────

async function confirmLeaveGroup(group) {
  if (!confirm(`Leave "${group.name}"?`)) return;
  await sb.from('group_members')
    .delete()
    .eq('group_id', group.id)
    .eq('user_id', currentUser.id);
  selectedGroupId = null;
  await refresh();
  showToast('You left the group.');
}

async function confirmDeleteGroup(group) {
  if (!confirm(`Delete "${group.name}"? This removes it for all members.`)) return;
  await sb.from('groups').delete().eq('id', group.id);
  selectedGroupId = null;
  await refresh();
  showToast('Group deleted.');
}

// ── Modal helpers ─────────────────────────────────────────────

function showModal(html) {
  const modal = document.getElementById('grpModal');
  modal.innerHTML = html;
  document.getElementById('grpModalBackdrop').hidden = false;
}

function closeModal() {
  document.getElementById('grpModalBackdrop').hidden = true;
  document.getElementById('grpModal').innerHTML = '';
}

document.getElementById('grpModalBackdrop').addEventListener('click', (e) => {
  if (e.target === document.getElementById('grpModalBackdrop')) closeModal();
});

// ── Invite code generator ─────────────────────────────────────

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ── Toast ─────────────────────────────────────────────────────

function showToast(msg) {
  const toast = document.getElementById('grpToast');
  toast.textContent = msg;
  toast.hidden = false;
  toast.classList.add('grp-toast--visible');
  setTimeout(() => {
    toast.classList.remove('grp-toast--visible');
    setTimeout(() => { toast.hidden = true; }, 300);
  }, 2800);
}

// ── Utils ─────────────────────────────────────────────────────

function escGrp(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Header buttons ────────────────────────────────────────────

document.getElementById('btnBack').addEventListener('click', () => {
  window.location.href = 'menu.html';
});
document.getElementById('btnCreateGroup').addEventListener('click', openCreateModal);
document.getElementById('btnJoinGroup').addEventListener('click', openJoinModal);
