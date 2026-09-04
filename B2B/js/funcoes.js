/* ==========================================================================
   LOVE B2B — Funções (equipe e permissões)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  renderTeam();
  initMemberModal();
});

function renderTeam() {
  const tbody = document.getElementById('team-table-body');
  if (!tbody) return;

  tbody.innerHTML = B2B_DATA.team.map(m => `
    <tr>
      <td>
        <div class="member-row">
          ${m.avatar
            ? `<img src="${m.avatar}" alt="${m.name}" class="member-avatar">`
            : `<div class="member-avatar b2b-avatar" style="display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:.75rem;">${initials(m.name)}</div>`}
          <div class="min-w-0">
            <p class="text-sm font-semibold text-zinc-900 truncate">${m.name} ${m.owner ? '<span class="owner-tag">· Você</span>' : ''}</p>
            <p class="text-xs text-zinc-500 truncate">${m.email}</p>
          </div>
        </div>
      </td>
      <td><span class="role-badge">${m.role}</span></td>
      <td><span class="modules-summary">${m.modules.length} de ${Object.keys(B2B_DATA.modules).length} áreas</span></td>
      <td><span class="status-badge status-${m.status}">${statusLabel(m.status)}</span></td>
      <td>
        ${m.owner ? '' : `
          <div class="flex items-center justify-end gap-2">
            <button type="button" class="btn-secondary text-xs py-1.5 px-2.5" data-edit-member="${m.id}">Editar</button>
            <button type="button" class="btn-secondary text-xs py-1.5 px-2.5" data-remove-member="${m.id}" aria-label="Remover acesso">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M6 7h12M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7m2 0-.6 12.1a2 2 0 0 1-2 1.9H8.1a2 2 0 0 1-2-1.9L5.5 7" /></svg>
            </button>
          </div>`}
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-edit-member]').forEach(btn => {
    btn.addEventListener('click', () => openMemberModal(btn.dataset.editMember));
  });

  tbody.querySelectorAll('[data-remove-member]').forEach(btn => {
    btn.addEventListener('click', () => {
      B2B_DATA.team = B2B_DATA.team.filter(m => m.id !== btn.dataset.removeMember);
      renderTeam();
      showToast('Acesso removido.');
    });
  });
}

/* -------------------- Modal: convidar / editar -------------------- */

function initMemberModal() {
  renderPermissionGrid();

  const addBtn = document.getElementById('member-add-btn');
  const modal = document.getElementById('member-modal');
  const closeBtn = document.getElementById('member-modal-close');
  const cancelBtn = document.getElementById('member-modal-cancel');
  const form = document.getElementById('member-form');
  const roleSelect = document.getElementById('member-role');

  const close = () => {
    modal.classList.remove('show');
    form.reset();
    delete form.dataset.editId;
    applyRoleTemplate(roleSelect.value);
  };

  if (addBtn) addBtn.addEventListener('click', () => {
    document.getElementById('member-modal-title').textContent = 'Convidar pessoa';
    applyRoleTemplate(roleSelect.value);
    modal.classList.add('show');
  });
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (cancelBtn) cancelBtn.addEventListener('click', close);
  if (modal) modal.addEventListener('click', e => { if (e.target === modal) close(); });

  roleSelect.addEventListener('change', () => applyRoleTemplate(roleSelect.value));

  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('member-name').value.trim();
    const email = document.getElementById('member-email').value.trim();
    const role = roleSelect.value;
    const modules = Array.from(document.querySelectorAll('#member-permissions input:checked')).map(i => i.value);

    if (!name || !email) {
      showToast('Preencha nome e e-mail para continuar.', true);
      return;
    }

    if (form.dataset.editId) {
      const member = B2B_DATA.team.find(m => m.id === form.dataset.editId);
      Object.assign(member, { name, email, role, modules });
      showToast('Permissões atualizadas.');
    } else {
      B2B_DATA.team.push({
        id: 'u' + Date.now(),
        name, email, role, modules,
        status: 'pendente',
        owner: false,
        avatar: null
      });
      showToast(`Convite enviado para ${email}.`);
    }

    renderTeam();
    close();
  });
}

function renderPermissionGrid() {
  const wrap = document.getElementById('member-permissions');
  if (!wrap) return;
  wrap.innerHTML = Object.entries(B2B_DATA.modules).map(([key, label]) => `
    <label class="permission-check">
      <input type="checkbox" value="${key}">
      ${label}
    </label>
  `).join('');
}

function applyRoleTemplate(roleName) {
  const template = B2B_DATA.roleTemplates[roleName];
  setText('member-role-desc', template ? template.desc : '');
  const checkboxes = document.querySelectorAll('#member-permissions input');
  const moduleSet = new Set(template ? template.modules : []);
  checkboxes.forEach(cb => { cb.checked = moduleSet.has(cb.value); });
}

function openMemberModal(id) {
  const m = B2B_DATA.team.find(x => x.id === id);
  if (!m) return;
  document.getElementById('member-modal-title').textContent = 'Editar permissões';
  document.getElementById('member-name').value = m.name;
  document.getElementById('member-email').value = m.email;
  document.getElementById('member-role').value = m.role;
  setText('member-role-desc', (B2B_DATA.roleTemplates[m.role] || {}).desc || '');

  const moduleSet = new Set(m.modules);
  document.querySelectorAll('#member-permissions input').forEach(cb => { cb.checked = moduleSet.has(cb.value); });

  const form = document.getElementById('member-form');
  form.dataset.editId = m.id;
  document.getElementById('member-modal').classList.add('show');
}
