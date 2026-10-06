/* ==========================================================================
   LOVE ADMIN — Todas as contas

   Lê auth.users pela função admin_listar_contas() (SECURITY DEFINER), porque
   a tabela de autenticação não é exposta pela API. Mostra de onde cada conta
   veio e permite classificar as que chegaram sem origem — caso do login
   social, que não carrega o papel nos metadados.
   ========================================================================== */

const ORIGENS = {
  b2b: { rotulo: 'B2B', badge: 'badge-info' },
  anfitriao: { rotulo: 'Anfitrião', badge: 'badge-success' },
  sem_origem: { rotulo: 'Sem origem', badge: 'badge-danger' }
};

const PROVEDORES = { email: 'E-mail e senha', google: 'Google', apple: 'Apple', desconhecido: '—' };

let CONTAS = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  const tbody = document.getElementById('tbody');
  renderLoading(tbody, 7);

  const { data, error } = await supabaseClient.rpc('admin_listar_contas');

  if (error) {
    const faltaFuncao = /admin_listar_contas|does not exist|schema cache/i.test(error.message || '');
    renderEmpty(tbody, 7,
      faltaFuncao ? 'Função ainda não existe no banco' : 'Não foi possível carregar',
      faltaFuncao
        ? 'Rode supabase/migrations/015_contas_origem.sql no SQL Editor do Supabase.'
        : error.message);
    return;
  }

  CONTAS = data || [];
  renderKpis();
  render();

  document.getElementById('busca').addEventListener('input', render);
  document.getElementById('filtro-origem').addEventListener('change', render);

  addHeaderAction('Exportar', exportar);
  moverControlesParaHeader();
  aplicarBuscaDaUrl(document.getElementById('busca'));
});

function renderKpis() {
  const conta = (origem) => CONTAS.filter(c => c.origem === origem).length;
  const semOrigem = conta('sem_origem');

  const tile = (label, value, sub) => `
    <div class="kpi"><p class="kpi-label">${label}</p><p class="kpi-value">${value}</p><p class="kpi-sub">${sub}</p></div>`;

  document.getElementById('kpi-grid').innerHTML = [
    tile('Contas no Supabase', formatNumber(CONTAS.length), 'Tudo que existe em auth.users'),
    tile('B2B', formatNumber(conta('b2b')), 'Fornecedores'),
    tile('Anfitriões', formatNumber(conta('anfitriao')), 'Plataforma principal'),
    tile('Sem origem', formatNumber(semOrigem), semOrigem ? 'Precisam ser classificadas' : 'Nenhuma pendente')
  ].join('');
}

function filtrar() {
  const termo = document.getElementById('busca').value.trim().toLowerCase();
  const origem = document.getElementById('filtro-origem').value;

  return CONTAS.filter(c => {
    if (origem && c.origem !== origem) return false;
    if (!termo) return true;
    return [c.email, c.nome].some(v => String(v || '').toLowerCase().includes(termo));
  });
}

function render() {
  const tbody = document.getElementById('tbody');
  const lista = filtrar();

  if (!lista.length) {
    renderEmpty(tbody, 7, 'Nenhuma conta encontrada',
      CONTAS.length ? 'Ajuste a busca ou o filtro de origem.' : 'Nenhuma conta foi criada ainda.');
    return;
  }

  // As sem origem vêm primeiro: são as que exigem ação.
  const ordenada = [...lista].sort((a, b) => {
    if ((a.origem === 'sem_origem') !== (b.origem === 'sem_origem')) {
      return a.origem === 'sem_origem' ? -1 : 1;
    }
    return new Date(b.criado_em || 0) - new Date(a.criado_em || 0);
  });

  tbody.innerHTML = ordenada.map(c => `
    <tr data-id="${c.id}">
      <td class="cell-strong">${dash(c.nome)}</td>
      <td class="cell-muted">${dash(c.email)}</td>
      <td>${badge(ORIGENS[c.origem].rotulo, ORIGENS[c.origem].badge)}</td>
      <td class="cell-muted">${escapeHtml(PROVEDORES[c.provedor] || c.provedor)}</td>
      <td>${c.email_confirmado ? badge('sim', 'badge-success') : badge('não', 'badge-warning')}</td>
      <td class="cell-muted">${escapeHtml(c.ultimo_acesso ? formatRelative(c.ultimo_acesso) : 'nunca')}</td>
      <td class="cell-muted">${escapeHtml(formatDate(c.criado_em))}</td>
    </tr>`).join('');

  tbody.querySelectorAll('tr[data-id]').forEach(tr => {
    tr.addEventListener('click', () => abrirDetalhe(CONTAS.find(c => c.id === tr.dataset.id)));
  });
}

function abrirDetalhe(c) {
  if (!c) return;

  const semOrigem = c.origem === 'sem_origem';

  Drawer.open({
    title: c.nome || c.email || 'Conta',
    subtitle: c.email || '',
    body: `
      <div class="stat-row">
        <div class="stat-box"><p class="label">Origem</p><p class="value" style="font-size:.9375rem">${ORIGENS[c.origem].rotulo}</p></div>
        <div class="stat-box"><p class="label">Entrou por</p><p class="value" style="font-size:.9375rem">${escapeHtml(PROVEDORES[c.provedor] || c.provedor)}</p></div>
      </div>
      <div class="stat-row">
        <div class="stat-box"><p class="label">Criada em</p><p class="value" style="font-size:.9375rem">${escapeHtml(formatDate(c.criado_em))}</p></div>
        <div class="stat-box"><p class="label">Último acesso</p><p class="value" style="font-size:.9375rem">${escapeHtml(c.ultimo_acesso ? formatDate(c.ultimo_acesso) : 'nunca')}</p></div>
      </div>

      ${semOrigem ? `
        <p class="drawer-section-title">Classificar</p>
        <p class="cell-muted" style="font-size:.8125rem;line-height:1.7;margin:0 0 1rem">
          Esta conta chegou sem identificação de plataforma — é o que acontece no
          login social, que não envia o papel junto. Escolha onde ela entra:
          a conta passa a aparecer na lista correspondente e some daqui.
        </p>

        <label class="field">
          <span class="field-label">Nome</span>
          <input class="field-input" id="nome-conta" type="text" value="${escapeHtml(c.nome || '')}"
                 placeholder="${escapeHtml(c.email || '')}">
        </label>

        <div style="display:flex;gap:.625rem">
          <button type="button" class="btn btn-ghost" style="flex:1" data-destino="b2b">É um fornecedor (B2B)</button>
          <button type="button" class="btn btn-ghost" style="flex:1" data-destino="anfitriao">É um anfitrião</button>
        </div>` : `
        <p class="drawer-section-title">Classificação</p>
        <p class="cell-muted" style="font-size:.8125rem;line-height:1.7;margin:0">
          Já está em <strong>${ORIGENS[c.origem].rotulo}</strong>. Os dados completos
          ficam em ${c.origem === 'b2b' ? 'Contas → B2B' : 'Contas → Anfitriões'}.
        </p>`}

      <p class="cell-muted" style="font-size:.75rem;margin-top:1.5rem">ID ${escapeHtml(c.id)}</p>`,
    footer: `<button type="button" class="btn btn-ghost" id="btn-fechar">Fechar</button>`
  });

  document.getElementById('btn-fechar').addEventListener('click', () => Drawer.close());

  document.querySelectorAll('[data-destino]').forEach(btn => {
    btn.addEventListener('click', () => classificar(c, btn.dataset.destino));
  });
}

async function classificar(conta, destino) {
  const nome = (document.getElementById('nome-conta')?.value || '').trim();

  if (!nome) {
    toast('Informe o nome antes de classificar.');
    return;
  }

  Drawer.setFooterBusy(true);

  const alvo = destino === 'b2b'
    ? { tabela: 'fornecedores', linha: { id: conta.id, company_name: nome, email: conta.email } }
    : { tabela: 'clientes', linha: { id: conta.id, couple_name: nome, email: conta.email } };

  const { error } = await supabaseClient.from(alvo.tabela).insert(alvo.linha);

  if (!error) {
    // Sai da fila de pendências; se a tabela ainda não existir, não é problema.
    await supabaseClient.from('contas_sem_origem').delete().eq('id', conta.id);
  }

  Drawer.setFooterBusy(false);

  if (error) {
    toast(`Não foi possível classificar: ${error.message}`);
    return;
  }

  Drawer.close();
  toast(destino === 'b2b' ? 'Conta movida para B2B.' : 'Conta movida para Anfitriões.');
  window.location.reload();
}

function exportar() {
  const lista = filtrar();

  if (!lista.length) {
    toast('Nenhuma conta para exportar com os filtros atuais.');
    return;
  }

  exportarCSV('contas', [
    { titulo: 'Nome', valor: c => c.nome },
    { titulo: 'E-mail', valor: c => c.email },
    { titulo: 'Origem', valor: c => ORIGENS[c.origem].rotulo },
    { titulo: 'Entrou por', valor: c => PROVEDORES[c.provedor] || c.provedor },
    { titulo: 'E-mail confirmado', valor: c => (c.email_confirmado ? 'sim' : 'não') },
    { titulo: 'Último acesso', valor: c => (c.ultimo_acesso ? formatDate(c.ultimo_acesso) : 'nunca') },
    { titulo: 'Criada em', valor: c => formatDate(c.criado_em) }
  ], lista);
}
