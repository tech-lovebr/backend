/* ==========================================================================
   LOVE B2B — Funções (equipe e permissões)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  renderTeam();
  initMemberDrawer();
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
      <td><span class="text-sm text-zinc-700">${m.role}</span></td>
      <td><span class="modules-summary">${m.modules.length} de ${Object.keys(B2B_DATA.modules).length} áreas</span></td>
      <td><span class="text-sm text-zinc-700">${statusLabel(m.status)}</span></td>
      <td>
        ${m.owner ? '' : `
          <div class="flex items-center justify-end">
            <button type="button" class="btn-secondary text-xs py-1.5 px-2.5" data-edit-member="${m.id}">Editar</button>
          </div>`}
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-edit-member]').forEach(btn => {
    btn.addEventListener('click', () => openMemberDrawer(btn.dataset.editMember));
  });
}

/* -------------------- Drawer: novo / editar colaborador -------------------- */

function initMemberDrawer() {
  renderPermissionGrid();

  const addBtn = document.getElementById('member-add-btn');
  const drawer = document.getElementById('member-drawer');
  const backdrop = document.getElementById('member-drawer-backdrop');
  const closeBtn = document.getElementById('member-drawer-close');
  const cancelBtn = document.getElementById('member-drawer-cancel');
  const form = document.getElementById('member-form');
  const roleSelect = document.getElementById('member-role');

  const open = () => { drawer.classList.add('show'); backdrop.classList.add('show'); };
  const close = () => {
    drawer.classList.remove('show');
    backdrop.classList.remove('show');
    form.reset();
    delete form.dataset.editId;
    applyRoleTemplate(roleSelect.value);
  };

  if (addBtn) addBtn.addEventListener('click', () => {
    form.reset();
    delete form.dataset.editId;
    document.getElementById('member-drawer-title').textContent = 'Novo colaborador';
    applyRoleTemplate(roleSelect.value);
    open();
  });
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (cancelBtn) cancelBtn.addEventListener('click', close);
  if (backdrop) backdrop.addEventListener('click', close);

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
      showToast('Colaborador atualizado.');
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

function openMemberDrawer(id) {
  const m = B2B_DATA.team.find(x => x.id === id);
  if (!m) return;
  document.getElementById('member-drawer-title').textContent = 'Editar colaborador';
  document.getElementById('member-name').value = m.name;
  document.getElementById('member-email').value = m.email;
  document.getElementById('member-role').value = m.role;
  setText('member-role-desc', (B2B_DATA.roleTemplates[m.role] || {}).desc || '');

  const moduleSet = new Set(m.modules);
  document.querySelectorAll('#member-permissions input').forEach(cb => { cb.checked = moduleSet.has(cb.value); });

  const form = document.getElementById('member-form');
  form.dataset.editId = m.id;
  document.getElementById('member-drawer').classList.add('show');
  document.getElementById('member-drawer-backdrop').classList.add('show');
}
