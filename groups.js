/* ============================================================
   groups.js — Study Groups page
   ============================================================ */

const sb = supabase.createClient(
  'https://rdnswueidjqnxgkhvrjf.supabase.co',
  'sb_publishable_EWpwtIRhvsIQMbNaiKIrPg_vLbgOMNp'
);

// ── State ─────────────────────────────────────────────────────

let currentUser       = null;
let myGroups          = [];
let selectedGroupId   = null;
let currentGroup      = null;
let selectedBranch    = null;
let pendingAttachment = null;
let branchChannel     = null;
let renderedMsgIds    = new Set();

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
  const byId = new Map();

  const { data: memberships, error: memErr } = await sb
    .from('group_members')
    .select('group_id, groups(*)')
    .eq('user_id', currentUser.id);
  console.log('[loadMyGroups] memberships:', memberships, 'error:', memErr);

  if (memberships?.length) {
    const fromJoin = memberships.map(m => m.groups).filter(Boolean);
    console.log('[loadMyGroups] fromJoin:', fromJoin);
    if (fromJoin.length) {
      fromJoin.forEach(g => byId.set(g.id, g));
    } else {
      const ids = memberships.map(m => m.group_id);
      console.log('[loadMyGroups] path2 ids:', ids);
      if (ids.length) {
        const { data: groups, error: grpErr } = await sb.from('groups').select('*').in('id', ids);
        console.log('[loadMyGroups] path2 groups:', groups, 'error:', grpErr);
        (groups || []).forEach(g => byId.set(g.id, g));
      }
    }
  }

  const { data: owned, error: ownErr } = await sb
    .from('groups')
    .select('*')
    .eq('created_by', currentUser.id);
  console.log('[loadMyGroups] owned:', owned, 'error:', ownErr);
  (owned || []).forEach(g => byId.set(g.id, g));

  return [...byId.values()].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
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
      <div class="grp-item-avatar">${g.icon ? escGrp(g.icon) : escGrp(g.name[0].toUpperCase())}</div>
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
  currentGroup    = group;
  renderSidebar();

  const detail = document.getElementById('grpDetail');
  detail.innerHTML = '<div class="grp-loading">Loading…</div>';

  const [{ data: members }, { data: branches }] = await Promise.all([
    sb.from('group_members').select('*').eq('group_id', group.id).order('joined_at'),
    sb.from('group_branches').select('*').eq('group_id', group.id).order('created_at')
  ]);

  renderDetail(group, members || [], branches || []);
}

function renderDetail(group, members, branches) {
  const isOwner = group.created_by === currentUser.id;
  const detail  = document.getElementById('grpDetail');

  detail.innerHTML = `
    <div class="grp-detail-head">
      <div class="grp-detail-top">
        <div class="grp-detail-name-row">
          ${group.icon ? `<span class="grp-detail-icon">${escGrp(group.icon)}</span>` : ''}
          <h2 class="grp-detail-name">${escGrp(group.name)}</h2>
          ${isOwner ? `<button class="grp-edit-group-btn" id="btnEditGroup" title="Edit group">✏</button>` : ''}
        </div>
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

    <div class="grp-detail-cols">

      <nav class="grp-branch-sidebar">
        <div class="grp-branch-sidebar-hdr">
          <span>Branches</span>
          <button class="grp-branch-add" id="btnAddBranch">+</button>
        </div>
        <div class="grp-branch-list" id="grpBranchList"></div>
      </nav>

      <div class="grp-chat-main" id="grpChatMain">
        <div class="grp-section">
          <div class="grp-section-hdr">
            <div class="grp-section-hdr-left">
              <span class="grp-section-title">Members</span>
              <span class="grp-section-count">${members.length}</span>
            </div>
          </div>
          <div class="grp-members-list" id="grpMembersList"></div>
        </div>

      </div>

    </div>
  `;

  // Render branches
  renderBranchList(branches);

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

  // Wire buttons
  document.getElementById('btnCopyCode').addEventListener('click', () => {
    navigator.clipboard.writeText(group.invite_code);
    showToast('Invite code copied!');
  });

  document.getElementById('btnLeaveOrDelete').addEventListener('click', () => {
    if (isOwner) confirmDeleteGroup(group);
    else         confirmLeaveGroup(group);
  });

  document.getElementById('btnAddBranch').addEventListener('click', () => {
    openCreateBranchModal(group);
  });

  if (isOwner) {
    document.getElementById('btnEditGroup').addEventListener('click', () => {
      openEditGroupModal(group, members);
    });
  }
}

// ── Edit group modal ──────────────────────────────────────────

function openEditGroupModal(group, members) {
  const memberRows = members
    .filter(m => m.user_id !== group.created_by)
    .map(m => `
      <div class="grp-member-edit-row" id="memberRow-${m.user_id}">
        <div class="grp-member-avatar" style="width:28px;height:28px;font-size:0.78rem">
          ${escGrp(m.display_name[0].toUpperCase())}
        </div>
        <span class="grp-member-name" style="flex:1;font-size:0.84rem">${escGrp(m.display_name)}</span>
        <button class="grp-btn grp-btn--danger grp-remove-member-btn"
                data-uid="${m.user_id}" style="padding:4px 10px;font-size:0.74rem">Remove</button>
      </div>
    `).join('');

  showModal(`
    <div class="grp-modal-title">Edit Group</div>
    <div class="grp-perm-row">
      <span class="grp-perm-label">Icon (emoji)</span>
      <input class="grp-modal-input" id="modalGroupIcon"
             value="${escGrp(group.icon || '')}" placeholder="e.g. 🌙" maxlength="4"
             style="width:80px;text-align:center;font-size:1.2rem">
    </div>
    <input class="grp-modal-input" id="modalGroupName"
           value="${escGrp(group.name)}" maxlength="40" placeholder="Group name…">
    ${memberRows.length ? `
      <div class="grp-modal-members-hdr">Members</div>
      <div class="grp-modal-members-list">${memberRows}</div>
    ` : ''}
    <div class="grp-modal-btns">
      <button class="grp-btn grp-btn--ghost"   id="btnModalCancel">Cancel</button>
      <button class="grp-btn grp-btn--primary"  id="btnModalOk">Save</button>
    </div>
  `);

  document.getElementById('btnModalCancel').addEventListener('click', closeModal);

  document.querySelectorAll('.grp-remove-member-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const uid = btn.dataset.uid;
      if (!confirm('Remove this member from the group?')) return;
      btn.disabled = true; btn.textContent = '…';
      const { error } = await sb.from('group_members')
        .delete()
        .eq('group_id', group.id)
        .eq('user_id', uid);
      if (error) { showToast('Could not remove member.'); btn.disabled = false; btn.textContent = 'Remove'; return; }
      document.getElementById(`memberRow-${uid}`)?.remove();
      showToast('Member removed.');
    });
  });

  document.getElementById('btnModalOk').addEventListener('click', async () => {
    const name = document.getElementById('modalGroupName').value.trim();
    const icon = document.getElementById('modalGroupIcon').value.trim();
    if (!name) { document.getElementById('modalGroupName').focus(); return; }

    const btn = document.getElementById('btnModalOk');
    btn.disabled = true; btn.textContent = 'Saving…';

    const { error } = await sb.from('groups')
      .update({ name, icon: icon || null })
      .eq('id', group.id);

    if (error) { showToast('Could not save changes.'); closeModal(); return; }

    closeModal();
    await refresh();
    const g = myGroups.find(g => g.id === group.id);
    if (g) selectGroup(g);
    showToast('Group updated.');
  });
}

// ── Create branch modal ───────────────────────────────────────

function openCreateBranchModal(group) {
  showModal(`
    <div class="grp-modal-title">New Branch</div>
    <input class="grp-modal-input" id="modalBranchName"
           placeholder="Branch name…" maxlength="40">
    <input class="grp-modal-input" id="modalBranchCategory"
           placeholder="Category (optional)…" maxlength="30">
    <div class="grp-modal-btns">
      <button class="grp-btn grp-btn--ghost" id="btnModalCancel">Cancel</button>
      <button class="grp-btn grp-btn--primary" id="btnModalOk">Create</button>
    </div>
  `);

  const nameInput = document.getElementById('modalBranchName');
  nameInput.focus();

  document.getElementById('btnModalCancel').addEventListener('click', closeModal);
  document.getElementById('btnModalOk').addEventListener('click', () => doCreateBranch(group));
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  doCreateBranch(group);
    if (e.key === 'Escape') closeModal();
  });
}

async function doCreateBranch(group) {
  const name     = document.getElementById('modalBranchName').value.trim();
  const category = document.getElementById('modalBranchCategory').value.trim();
  if (!name) { document.getElementById('modalBranchName').focus(); return; }

  const btn = document.getElementById('btnModalOk');
  btn.disabled = true;
  btn.textContent = 'Creating…';

  const { error } = await sb.from('group_branches').insert({
    group_id:   group.id,
    name,
    category:   category || null,
    created_by: currentUser.id
  });

  if (error) {
    showToast('Could not create branch. Try again.');
    closeModal();
    return;
  }

  closeModal();
  await selectGroup(group);
  showToast(`# ${name} created!`);
}

// ── Edit branch modal ─────────────────────────────────────────

function openEditBranchModal(branch) {
  showModal(`
    <div class="grp-modal-title">Edit Branch</div>
    <input class="grp-modal-input" id="modalEditName"
           value="${escGrp(branch.name)}" maxlength="40">
    <input class="grp-modal-input" id="modalEditCategory"
           value="${escGrp(branch.category || '')}" placeholder="Category (optional)…" maxlength="30">
    <div class="grp-perm-row">
      <span class="grp-perm-label">Who can view?</span>
      <select class="grp-perm-select" id="modalCanView">
        <option value="all"   ${branch.can_view === 'all'   ? 'selected' : ''}>All members</option>
        <option value="owner" ${branch.can_view === 'owner' ? 'selected' : ''}>Owner only</option>
      </select>
    </div>
    <div class="grp-perm-row">
      <span class="grp-perm-label">Who can post?</span>
      <select class="grp-perm-select" id="modalCanPost">
        <option value="all"   ${branch.can_post === 'all'   ? 'selected' : ''}>All members</option>
        <option value="owner" ${branch.can_post === 'owner' ? 'selected' : ''}>Owner only</option>
      </select>
    </div>
    <div class="grp-modal-btns">
      <button class="grp-btn grp-btn--danger" id="btnDeleteBranch">Delete</button>
      <button class="grp-btn grp-btn--ghost"  id="btnModalCancel">Cancel</button>
      <button class="grp-btn grp-btn--primary" id="btnModalOk">Save</button>
    </div>
  `);

  document.getElementById('btnModalCancel').addEventListener('click', closeModal);

  document.getElementById('btnDeleteBranch').addEventListener('click', async () => {
    if (!confirm(`Delete "#${branch.name}"? All messages will be lost.`)) return;
    await sb.from('group_branches').delete().eq('id', branch.id);
    if (selectedBranch?.id === branch.id) {
      selectedBranch = null;
      document.getElementById('grpChatMain').innerHTML = '';
    }
    closeModal();
    await selectGroup(currentGroup);
    showToast(`# ${branch.name} deleted.`);
  });

  document.getElementById('btnModalOk').addEventListener('click', async () => {
    const name     = document.getElementById('modalEditName').value.trim();
    const category = document.getElementById('modalEditCategory').value.trim();
    const can_view = document.getElementById('modalCanView').value;
    const can_post = document.getElementById('modalCanPost').value;
    if (!name) { document.getElementById('modalEditName').focus(); return; }

    const btn = document.getElementById('btnModalOk');
    btn.disabled = true; btn.textContent = 'Saving…';

    const { error } = await sb.from('group_branches')
      .update({ name, category: category || null, can_view, can_post })
      .eq('id', branch.id);

    if (error) { showToast('Could not save changes.'); closeModal(); return; }

    closeModal();
    await selectGroup(currentGroup);
    showToast('Branch updated.');
  });
}

function renderBranchList(branches) {
  const list = document.getElementById('grpBranchList');
  if (!list) return;

  if (branches.length === 0) {
    list.innerHTML = '<div class="grp-branch-empty">No branches yet.</div>';
    return;
  }

  list.innerHTML = '';
  const isOwner  = currentGroup?.created_by === currentUser.id;
  const visible  = branches.filter(b => b.can_view === 'all' || isOwner);

  if (visible.length === 0) {
    list.innerHTML = '<div class="grp-branch-empty">No branches yet.</div>';
    return;
  }

  const categories = [...new Set(visible.map(b => b.category || ''))];
  categories.forEach(cat => {
    if (cat) {
      const catEl = document.createElement('div');
      catEl.className = 'grp-branch-category';
      catEl.textContent = cat;
      list.appendChild(catEl);
    }
    visible.filter(b => (b.category || '') === cat).forEach(b => {
      const item = document.createElement('div');
      item.className = 'grp-branch-item' + (selectedBranch?.id === b.id ? ' grp-branch-item--active' : '');
      item.innerHTML = `
        <span class="grp-branch-hash">#</span>
        <span class="grp-branch-name">${escGrp(b.name)}</span>
        ${isOwner ? `<button class="grp-branch-settings" title="Edit branch">⚙</button>` : ''}
      `;
      item.addEventListener('click', (e) => {
        if (e.target.closest('.grp-branch-settings')) return;
        selectedBranch = b;
        document.querySelectorAll('.grp-branch-item').forEach(el => el.classList.remove('grp-branch-item--active'));
        item.classList.add('grp-branch-item--active');
        showBranchChat(b);
      });
      if (isOwner) {
        item.querySelector('.grp-branch-settings').addEventListener('click', (e) => {
          e.stopPropagation();
          openEditBranchModal(b);
        });
      }
      list.appendChild(item);
    });
  });
}

// ── Branch chat view ──────────────────────────────────────────

async function showBranchChat(branch) {
  const main = document.getElementById('grpChatMain');
  if (!main) return;
  pendingAttachment = null;

  main.innerHTML = `
    <div class="grp-chat-header">
      <span class="grp-chat-header-hash">#</span>
      <span class="grp-chat-header-name">${escGrp(branch.name)}</span>
      ${branch.category ? `<span class="grp-chat-header-cat">${escGrp(branch.category)}</span>` : ''}
    </div>
    <div class="grp-messages" id="grpMessages">
      <div class="grp-messages-empty">Loading…</div>
    </div>
    <div class="grp-chat-input-wrap">
      <div class="grp-attachment-preview" id="grpAttachPreview" hidden></div>
      <div class="grp-chat-input-row">
        <button class="grp-attach-btn" id="btnAttachPanel" title="Attach a knowledge panel">📎</button>
        <input class="grp-chat-input" id="grpChatInput"
               placeholder="Message #${escGrp(branch.name)}…" autocomplete="off" />
        <button class="grp-send-btn" id="btnSendMsg">Send</button>
      </div>
    </div>
  `;

  const canPost = branch.can_post === 'all' || currentGroup?.created_by === currentUser.id;
  if (!canPost) {
    document.querySelector('.grp-chat-input-wrap').innerHTML =
      '<div class="grp-chat-readonly">This branch is read-only for members.</div>';
  } else {
    document.getElementById('btnAttachPanel').addEventListener('click', openAttachPanelPicker);
    document.getElementById('btnSendMsg').addEventListener('click', () => sendMessage(branch));
    document.getElementById('grpChatInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(branch);
      }
    });
  }

  const { data: messages, error } = await sb
    .from('branch_messages')
    .select('*')
    .eq('branch_id', branch.id)
    .order('sent_at');

  const msgArea = document.getElementById('grpMessages');
  if (!msgArea) return;

  if (error || !messages?.length) {
    msgArea.innerHTML = '<div class="grp-messages-empty">No messages yet — say hello!</div>';
    return;
  }

  msgArea.innerHTML = '';
  renderedMsgIds = new Set();
  messages.forEach(m => appendMessage(m));
  setTimeout(scrollToBottom, 0);

  subscribeToBranch(branch);
}

async function openAttachPanelPicker() {
  showModal(`
    <div class="grp-modal-title">Attach a Panel</div>
    <div class="grp-loading" style="padding:16px 0">Loading your panels…</div>
  `);

  const panels = await loadKnowledgePanels();

  if (panels.length === 0) {
    document.getElementById('grpModal').innerHTML = `
      <div class="grp-modal-title">Attach a Panel</div>
      <p class="grp-modal-desc">You don't have any knowledge panels yet.</p>
      <div class="grp-modal-btns">
        <button class="grp-btn grp-btn--ghost" id="btnModalCancel">Close</button>
      </div>
    `;
    document.getElementById('btnModalCancel').addEventListener('click', closeModal);
    return;
  }

  document.getElementById('grpModal').innerHTML = `
    <div class="grp-modal-title">Attach a Panel</div>
    <p class="grp-modal-desc">Pick a panel to attach to your message.</p>
    <div class="grp-share-list" id="grpAttachList"></div>
    <div class="grp-modal-btns">
      <button class="grp-btn grp-btn--ghost" id="btnModalCancel">Cancel</button>
    </div>
  `;
  document.getElementById('btnModalCancel').addEventListener('click', closeModal);

  const list = document.getElementById('grpAttachList');
  panels.forEach(p => {
    const icon  = p.type === 'flashcard' ? '🃏' : '📝';
    const count = p.questions?.length || 0;
    const row   = document.createElement('div');
    row.className = 'grp-share-row';
    row.innerHTML = `
      <span class="grp-share-icon">${icon}</span>
      <span class="grp-share-name">${escGrp(p.name)}</span>
      <span class="grp-share-count">${count} ${p.type === 'flashcard' ? 'cards' : 'qs'}</span>
      <button class="grp-btn grp-btn--amber grp-share-btn">Attach</button>
    `;
    row.querySelector('.grp-share-btn').addEventListener('click', () => {
      pendingAttachment = p;
      closeModal();
      renderAttachmentPreview(p);
    });
    list.appendChild(row);
  });
}

function renderAttachmentPreview(panel) {
  const preview = document.getElementById('grpAttachPreview');
  if (!preview) return;
  const icon  = panel.type === 'flashcard' ? '🃏' : '📝';
  const count = panel.questions?.length || 0;
  preview.hidden = false;
  preview.innerHTML = `
    <span class="grp-attach-chip">
      ${icon} ${escGrp(panel.name)}
      <span class="grp-attach-chip-count">${count} ${panel.type === 'flashcard' ? 'cards' : 'qs'}</span>
      <button class="grp-attach-chip-remove" id="btnRemoveAttach">✕</button>
    </span>
  `;
  document.getElementById('btnRemoveAttach').addEventListener('click', () => {
    pendingAttachment = null;
    preview.hidden = true;
    preview.innerHTML = '';
  });
}

async function sendMessage(branch) {
  const input   = document.getElementById('grpChatInput');
  const content = input?.value.trim();
  if (!content && !pendingAttachment) return;

  const displayName = currentUser.user_metadata?.username || currentUser.email.split('@')[0];

  const payload = {
    branch_id:    branch.id,
    group_id:     branch.group_id,
    user_id:      currentUser.id,
    display_name: displayName,
    content:      content || '',
    attachment:   pendingAttachment
      ? { name: pendingAttachment.name, type: pendingAttachment.type, questions: pendingAttachment.questions }
      : null
  };

  const { data: msg, error } = await sb.from('branch_messages').insert(payload).select().single();
  if (error) { showToast('Could not send message.'); return; }

  if (input) input.value = '';
  pendingAttachment = null;
  const preview = document.getElementById('grpAttachPreview');
  if (preview) { preview.hidden = true; preview.innerHTML = ''; }

  appendMessage(msg);
}

function appendMessage(msg) {
  const messages = document.getElementById('grpMessages');
  if (!messages) return;
  if (renderedMsgIds.has(msg.id)) return;
  renderedMsgIds.add(msg.id);

  const empty = messages.querySelector('.grp-messages-empty');
  if (empty) empty.remove();

  const isMe = msg.user_id === currentUser.id;
  const div  = document.createElement('div');
  div.className = 'grp-message' + (isMe ? ' grp-message--me' : '');
  div.innerHTML = `
    <div class="grp-message-meta">
      <span class="grp-message-author">${escGrp(msg.display_name)}</span>
      <span class="grp-message-time">${formatTime(msg.sent_at)}</span>
    </div>
    ${msg.content ? `<div class="grp-message-text">${escGrp(msg.content)}</div>` : ''}
    ${msg.attachment ? `
      <div class="grp-message-panel" data-panel='${JSON.stringify(msg.attachment)}'>
        <span>${msg.attachment.type === 'flashcard' ? '🃏' : '📝'}</span>
        <span class="grp-message-panel-name">${escGrp(msg.attachment.name)}</span>
        <span class="grp-message-panel-count">${msg.attachment.questions?.length || 0} ${msg.attachment.type === 'flashcard' ? 'cards' : 'qs'}</span>
        <button class="grp-btn grp-btn--amber grp-message-panel-play">▶ Play</button>
        <button class="grp-btn grp-btn--ghost grp-message-panel-save">Save</button>
      </div>` : ''}
  `;

  if (msg.attachment) {
    div.querySelector('.grp-message-panel-play').addEventListener('click', () => {
      openPlayer(msg.attachment);
    });

    div.querySelector('.grp-message-panel-save').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = 'Saving…';
      const { error } = await sb.from('knowledge_panels').insert({
        user_id:   currentUser.id,
        name:      msg.attachment.name,
        type:      msg.attachment.type,
        questions: msg.attachment.questions
      });
      if (error) {
        showToast('Could not save panel.');
        btn.disabled = false;
        btn.textContent = 'Save';
      } else {
        btn.textContent = 'Saved ✓';
        showToast(`"${msg.attachment.name}" saved to your library!`);
      }
    });
  }

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function scrollToBottom() {
  const messages = document.getElementById('grpMessages');
  if (messages) messages.scrollTop = messages.scrollHeight;
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function subscribeToBranch(branch) {
  if (branchChannel) {
    sb.removeChannel(branchChannel);
    branchChannel = null;
  }

  branchChannel = sb
    .channel(`branch-${branch.id}`)
    .on('postgres_changes', {
      event:  'INSERT',
      schema: 'public',
      table:  'branch_messages',
      filter: `branch_id=eq.${branch.id}`
    }, (payload) => {
      appendMessage(payload.new);
    })
    .subscribe();
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
      showToast('Error: ' + (error.message || error.code || 'unknown'));
      closeModal();
      return;
    }

    const { error: memberErr } = await sb.from('group_members').insert({
      group_id:     group.id,
      user_id:      currentUser.id,
      display_name: displayName,
      role:         'owner'
    });

    if (memberErr) {
      showToast('Group created but could not add you as owner. Try again.');
      closeModal();
      return;
    }

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
      showToast('Join error: ' + (joinErr.message || joinErr.code || 'unknown'));
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
