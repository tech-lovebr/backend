/* ==========================================================================
   LOVE ADMIN — Funções
   Quem tem acesso ao painel e com qual permissão.
   ========================================================================== */

const PAPEIS = { superadmin: 'Super admin', admin: 'Administrador' };

let ADMINS = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  const tbody = document.getElementById('tbody');
  renderLoading(tbody, 5);

  const { data, error } = await safeSelect('admins', '*');
  if (error) return renderError(tbody, 5, error);

  ADMINS = data;
  render();
});

function render() {
  const tbody = document.getElementById('tbody');
  const lista = ADMINS.slice().sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

  if (!lista.length) {
    renderEmpty(tbody, 5, 'Nenhum administrador', 'Nenhuma conta está cadastrada na tabela admins.');
    return;
  }

  tbody.innerHTML = lista.map(a => `
    <tr data-id="${a.id}">
      <td class="cell-strong">${dash(a.name)}</td>
      <td class="cell-muted">${dash(a.email)}</td>
      <td>${badge(PAPEIS[a.role] || a.role, a.role === 'superadmin' ? 'badge-info' : '')}</td>
      <td>${badge(a.active ? 'Ativo' : 'Inativo', a.active ? 'badge-success' : 'badge-danger')}</td>
      <td class="cell-muted">${escapeHtml(formatDate(a.created_at))}</td>
    </tr>`).join('');

  tbody.querySelectorAll('tr[data-id]').forEach(tr => {
    tr.addEventListener('click', () => abrirDetalhe(tr.dataset.id));
  });
}

function abrirDetalhe(id) {
  const a = ADMINS.find(x => x.id === id);
  if (!a) return;

  const ehVoce = a.id === window.adminUser.id;

  Drawer.open({
    title: a.name || 'Administrador',
    subtitle: a.email || '',
    body: `
      <form id="form-admin">
        <label class="field">
          <span class="field-label">Nome</span>
          <input class="field-input" name="name" type="text" value="${escapeHtml(a.name || '')}">
        </label>

        <div class="field-row">
          <label class="field">
            <span class="field-label">Função</span>
            <select class="field-select" name="role">
              <option value="admin" ${a.role === 'admin' ? 'selected' : ''}>Administrador</option>
              <option value="superadmin" ${a.role === 'superadmin' ? 'selected' : ''}>Super admin</option>
            </select>
          </label>
          <label class="field">
            <span class="field-label">Status</span>
            <select class="field-select" name="active" ${ehVoce ? 'disabled' : ''}>
              <option value="true" ${a.active ? 'selected' : ''}>Ativo</option>
              <option value="false" ${a.active ? '' : 'selected'}>Inativo</option>
            </select>
          </label>
        </div>

        ${ehVoce ? `
          <p class="cell-muted" style="font-size:.75rem;line-height:1.6">
            Esta é a sua própria conta — o status fica travado para você não se
            trancar para fora do painel.
          </p>` : `
          <p class="cell-muted" style="font-size:.75rem;line-height:1.6">
            Marcar como inativo tira o acesso na hora: o banco deixa de responder
            a esta conta e ela cai na porta do painel.
          </p>`}

        <p class="cell-muted" style="font-size:.75rem;margin-top:1rem">
          Conta criada em ${escapeHtml(formatDateTime(a.created_at))} · ID ${escapeHtml(a.id)}
        </p>
      </form>`,
    footer: `
      <button type="button" class="btn btn-ghost" id="btn-cancelar">Fechar</button>
      <button type="button" class="btn btn-primary" id="btn-salvar">Salvar alterações</button>`
  });

  document.getElementById('btn-cancelar').addEventListener('click', () => Drawer.close());
  document.getElementById('btn-salvar').addEventListener('click', () => salvar(id, ehVoce));
}

async function salvar(id, ehVoce) {
  const form = document.getElementById('form-admin');
  const payload = {
    name: form.name.value.trim(),
    role: form.role.value
  };

  // O select fica desabilitado na própria conta, então não vem no formulário.
  if (!ehVoce) payload.active = form.active.value === 'true';

  if (!payload.name) {
    toast('O nome não pode ficar vazio.');
    return;
  }

  Drawer.setFooterBusy(true);
  const { error } = await supabaseClient.from('admins').update(payload).eq('id', id);
  Drawer.setFooterBusy(false);

  if (error) {
    toast(`Não foi possível salvar: ${error.message}`);
    return;
  }

  Object.assign(ADMINS.find(a => a.id === id), payload);
  render();
  Drawer.close();
  toast('Administrador atualizado.');
}
