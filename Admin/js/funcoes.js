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

  addHeaderAction('Adicionar colaborador', abrirFormularioNovo, {
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" /><path d="M16 19h6" /><path d="M19 16v6" /><path d="M6 21v-2a4 4 0 0 1 4 -4h4" /></svg>'
  });
});

/* ------------------------------------------------- Adicionar colaborador */

/**
 * O painel não cria a conta de acesso: isso exige a chave mestra do Supabase,
 * que nunca pode ficar no navegador. O fluxo é criar o usuário no Supabase e
 * trazer o UUID para cá, que é o que libera o acesso ao painel.
 */
function abrirFormularioNovo() {
  Drawer.open({
    title: 'Adicionar colaborador',
    subtitle: 'Dar acesso ao painel administrativo',
    body: `
      <ol class="passos">
        <li>
          <span class="passo-num">1</span>
          <div>
            <p class="passo-titulo">Crie o usuário no Supabase</p>
            <p class="passo-texto">
              Em <strong>Authentication → Users → Add user</strong>, informe e-mail e senha
              e marque <em>Auto Confirm User</em>. A senha é definida lá — o painel
              nunca a armazena nem a manipula.
            </p>
          </div>
        </li>
        <li>
          <span class="passo-num">2</span>
          <div>
            <p class="passo-titulo">Copie o User UID</p>
            <p class="passo-texto">Abra o usuário recém-criado e copie o identificador do topo.</p>
          </div>
        </li>
        <li>
          <span class="passo-num">3</span>
          <div>
            <p class="passo-titulo">Preencha abaixo</p>
            <p class="passo-texto">É este passo que libera o acesso ao painel.</p>
          </div>
        </li>
      </ol>

      <form id="form-novo-admin">
        <label class="field">
          <span class="field-label">User UID (do Supabase)</span>
          <input class="field-input" name="id" type="text" placeholder="00000000-0000-0000-0000-000000000000">
        </label>
        <div class="field-row">
          <label class="field">
            <span class="field-label">Nome</span>
            <input class="field-input" name="name" type="text">
          </label>
          <label class="field">
            <span class="field-label">E-mail</span>
            <input class="field-input" name="email" type="email">
          </label>
        </div>
        <label class="field">
          <span class="field-label">Função</span>
          <select class="field-select" name="role">
            <option value="admin">Administrador</option>
            <option value="superadmin">Super admin</option>
          </select>
        </label>
      </form>`,
    footer: `
      <button type="button" class="btn btn-ghost" id="btn-cancelar">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btn-adicionar">Liberar acesso</button>`
  });

  document.getElementById('btn-cancelar').addEventListener('click', () => Drawer.close());
  document.getElementById('btn-adicionar').addEventListener('click', adicionar);
}

async function adicionar() {
  const form = document.getElementById('form-novo-admin');
  const d = Object.fromEntries(new FormData(form).entries());

  const id = d.id.trim();
  const nome = d.name.trim();
  const email = d.email.trim();

  if (!id || !nome || !email) {
    toast('Preencha o UID, o nome e o e-mail.');
    return;
  }

  const formatoUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!formatoUuid.test(id) && !window.LOVE_DEMO?.ativo()) {
    toast('O User UID não parece um identificador válido do Supabase.');
    return;
  }

  if (ADMINS.some(a => a.id === id)) {
    toast('Esta conta já tem acesso ao painel.');
    return;
  }

  Drawer.setFooterBusy(true);
  const { error } = await supabaseClient.from('admins')
    .insert({ id, name: nome, email, role: d.role, active: true });
  Drawer.setFooterBusy(false);

  if (error) {
    const semUsuario = /foreign key|violates/i.test(error.message || '');
    toast(semUsuario
      ? 'Nenhum usuário do Supabase com esse UID. Confira o passo 1.'
      : `Não foi possível adicionar: ${error.message}`);
    return;
  }

  Drawer.close();
  toast('Colaborador adicionado.');
  window.location.reload();
}

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
