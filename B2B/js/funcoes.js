/* ==========================================================================
   LOVE B2B — Funções (equipe e permissões)
   ========================================================================== */

let equipeTabelaEstado = null;

function equipeFiltrada() {
  const est = equipeTabelaEstado || { busca: '', filtros: {} };
  return B2B_DATA.team.filter(m =>
    (!est.filtros.funcao || m.role === est.filtros.funcao) &&
    (!est.filtros.status || m.status === est.filtros.status) &&
    tabelaBateBusca(est, [m.name, m.email, m.role]));
}

document.addEventListener('DOMContentLoaded', async () => {
  // A equipe (o responsável principal) vem do cadastro: espera o login.
  await window.b2bAuthReady;
  // Barra da tabela: busca, Filtrar por (função e status) e Exportar.
  equipeTabelaEstado = montarBarraTabela(document.getElementById('team-table-card'), {
    placeholder: 'Pesquisar colaborador ou e-mail...',
    celular: { nome: 1, info: 3, singular: 'colaborador', plural: 'colaboradores' },
    filtros: [
      { chave: 'funcao', rotulo: 'Função', opcoes: () => [...new Set(B2B_DATA.team.map(m => m.role).filter(Boolean))].sort().map(v => [v, v]) },
      { chave: 'status', rotulo: 'Status', opcoes: () => [...new Set(B2B_DATA.team.map(m => m.status).filter(Boolean))].map(v => [v, statusLabel(v)]) }
    ],
    exportar: () => tabelaExportarCSV('equipe', [
      { titulo: 'Colaborador', valor: m => m.name },
      { titulo: 'E-mail', valor: m => m.email },
      { titulo: 'Função', valor: m => m.role },
      { titulo: 'Acesso', valor: m => `${m.modules.length} de ${Object.keys(B2B_DATA.modules).length} áreas` },
      { titulo: 'Status', valor: m => statusLabel(m.status) }
    ], equipeFiltrada()),
    aoMudar: () => renderTeam()
  });
  renderTeam();
  initMemberDrawer();
  window.b2bPageReady?.();
});

let equipePaginacao = null;
function renderTeam() {
  const tbody = document.getElementById('team-table-body');
  if (!tbody) return;

  const todos = equipeFiltrada();
  if (!equipePaginacao) equipePaginacao = montarPaginacaoTabela(document.getElementById('team-table-card'), () => renderTeam());
  const lista = paginarLinhas(equipePaginacao, todos, JSON.stringify(equipeTabelaEstado ? [equipeTabelaEstado.busca, equipeTabelaEstado.filtros] : []));
  tbody.innerHTML = lista.length ? lista.map(m => `
    <tr>
      <td class="col-principal">${escapeHtml(m.name)} ${m.owner ? '<span class="owner-tag">· Você</span>' : ''}</td>
      <td>${tabelaEmailHtml(m.email)}</td>
      <td>${escapeHtml(m.role)}</td>
      <td><span class="modules-summary">${m.modules.length} de ${Object.keys(B2B_DATA.modules).length} áreas</span></td>
      <td>${statusLabel(m.status)}</td>
      ${m.owner ? '<td class="tabela-col-acoes"></td>' : tabelaVerMaisHtml('data-edit-member', m.id)}
    </tr>
  `).join('') : '<tr><td colspan="6" class="tabela-vazia-cheia">Nenhum colaborador encontrado.</td></tr>';

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
