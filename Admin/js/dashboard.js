/* ==========================================================================
   LOVE ADMIN — Dashboard (visão geral das duas plataformas)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  renderKpiSkeleton();

  const [
    fornecedores, clientes, eventos, convidados,
    presentes, carteiraFornecedor, carteiraCliente, tickets
  ] = await Promise.all([
    safeSelect('fornecedores', 'id, company_name, email, plan, created_at'),
    safeSelect('clientes', 'id, couple_name, email, created_at'),
    safeSelect('eventos', 'id, tipo, titulo, status'),
    safeSelect('convidados', 'id, status'),
    safeSelect('presentes', 'id, valor, status'),
    safeSelect('wallet_transactions', 'id, type, amount'),
    safeSelect('cliente_wallet_transactions', 'id, type, amount'),
    safeSelect('tickets', 'id, protocolo, assunto, origem, status, created_at')
  ]);

  renderKpis({
    fornecedores: fornecedores.data,
    clientes: clientes.data,
    eventos: eventos.data,
    convidados: convidados.data,
    presentes: presentes.data,
    carteiraFornecedor: carteiraFornecedor.data,
    carteiraCliente: carteiraCliente.data,
    tickets: tickets.data
  });

  renderContasRecentes(fornecedores.data, clientes.data);
  renderTicketsRecentes(tickets.data, tickets.error);
  renderCategorias(eventos.data, eventos.error);
});

function renderKpiSkeleton() {
  document.getElementById('kpi-grid').innerHTML = Array.from({ length: 8 }, () =>
    `<div class="kpi"><div class="kpi-icon"></div><div class="skeleton" style="width:60%"></div><div class="skeleton" style="width:40%;height:24px;margin-top:.5rem"></div></div>`
  ).join('');
}

function kpiCard({ label, value, sub, iconPath }) {
  return `
    <div class="kpi">
      <div class="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">${iconPath}</svg></div>
      <p class="kpi-label">${escapeHtml(label)}</p>
      <p class="kpi-value">${escapeHtml(value)}</p>
      <p class="kpi-sub">${escapeHtml(sub)}</p>
    </div>`;
}

const KPI_ICONS = {
  store: '<path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5h-3V21M4.5 10.5V21h15V10.5M3.75 9.75 5.25 4.5h13.5l1.5 5.25"/>',
  users: '<path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Z"/>',
  calendar: '<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25A2.25 2.25 0 0 1 18.75 21H5.25A2.25 2.25 0 0 1 3 18.75Z"/>',
  gift: '<path stroke-linecap="round" stroke-linejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12M8.25 21V7.5m7.5 13.5V7.5m-12 0h16.5v3.75H3.75V7.5Z"/>',
  wallet: '<path stroke-linecap="round" stroke-linejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6"/>',
  chat: '<path stroke-linecap="round" stroke-linejoin="round" d="M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"/>',
  check: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>'
};

function renderKpis(d) {
  const confirmados = d.convidados.filter(g => g.status === 'confirmado').length;
  const presentesRecebidos = d.presentes.filter(p => p.status === 'recebido');
  const arrecadado = presentesRecebidos.reduce((s, p) => s + (Number(p.valor) || 0), 0);
  const volumeB2B = d.carteiraFornecedor
    .filter(t => t.type === 'credit')
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const saldoClientes = walletBalance(d.carteiraCliente);
  const abertos = d.tickets.filter(t => t.status === 'aberto' || t.status === 'em_andamento').length;

  document.getElementById('kpi-grid').innerHTML = [
    kpiCard({ label: 'Fornecedores', value: formatNumber(d.fornecedores.length), sub: 'Contas B2B criadas', iconPath: KPI_ICONS.store }),
    kpiCard({ label: 'Clientes', value: formatNumber(d.clientes.length), sub: 'Contas na plataforma', iconPath: KPI_ICONS.users }),
    kpiCard({ label: 'Eventos criados', value: formatNumber(d.eventos.length), sub: `${d.eventos.filter(e => e.status === 'ativo').length} ativos`, iconPath: KPI_ICONS.calendar }),
    kpiCard({ label: 'Convidados', value: formatNumber(d.convidados.length), sub: `${formatNumber(confirmados)} confirmados`, iconPath: KPI_ICONS.check }),
    kpiCard({ label: 'Presentes recebidos', value: formatNumber(presentesRecebidos.length), sub: `${formatCurrency(arrecadado)} arrecadados`, iconPath: KPI_ICONS.gift }),
    kpiCard({ label: 'Volume B2B', value: formatCurrency(volumeB2B), sub: 'Entradas na carteira dos fornecedores', iconPath: KPI_ICONS.wallet }),
    kpiCard({ label: 'Saldo dos clientes', value: formatCurrency(saldoClientes), sub: 'Disponível para saque', iconPath: KPI_ICONS.wallet }),
    kpiCard({ label: 'Chamados abertos', value: formatNumber(abertos), sub: `${d.tickets.length} no total`, iconPath: KPI_ICONS.chat })
  ].join('');
}

function renderContasRecentes(fornecedores, clientes) {
  const tbody = document.getElementById('tbody-contas');

  const linhas = [
    ...fornecedores.map(f => ({ nome: f.company_name, tipo: 'Fornecedor', email: f.email, created_at: f.created_at })),
    ...clientes.map(c => ({ nome: c.couple_name, tipo: 'Cliente', email: c.email, created_at: c.created_at }))
  ]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 8);

  if (!linhas.length) {
    renderEmpty(tbody, 4, 'Nenhuma conta ainda', 'Assim que alguém se cadastrar no site ou no B2B, aparece aqui.');
    return;
  }

  tbody.innerHTML = linhas.map(l => `
    <tr class="no-hover">
      <td class="cell-strong">${dash(l.nome)}</td>
      <td>${badge(l.tipo, l.tipo === 'Fornecedor' ? 'badge-info' : 'badge-success')}</td>
      <td class="cell-muted">${dash(l.email)}</td>
      <td class="cell-muted">${escapeHtml(formatRelative(l.created_at))}</td>
    </tr>`).join('');
}

function renderTicketsRecentes(tickets, error) {
  const tbody = document.getElementById('tbody-tickets');

  if (error) return renderError(tbody, 4, error);

  if (!tickets.length) {
    renderEmpty(tbody, 4, 'Nenhum chamado', 'O canal de atendimento ainda não recebeu mensagens.');
    return;
  }

  tbody.innerHTML = tickets
    .slice()
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 8)
    .map(t => `
      <tr class="no-hover">
        <td class="cell-strong">${dash(t.protocolo)}</td>
        <td>${dash(t.assunto)}</td>
        <td class="cell-muted">${escapeHtml(ORIGEM_LABELS[t.origem] || t.origem || '—')}</td>
        <td>${badge(TICKET_STATUS_LABELS[t.status] || t.status, TICKET_STATUS_BADGE[t.status])}</td>
      </tr>`).join('');
}

function renderCategorias(eventos, error) {
  const host = document.getElementById('categorias-eventos');

  if (error) {
    host.innerHTML = `<div class="empty-state"><strong>Tabela ainda não existe no banco</strong><p>Rode supabase/migrations/004_admin.sql no SQL Editor do Supabase para criar as tabelas de eventos.</p></div>`;
    return;
  }

  if (!eventos.length) {
    host.innerHTML = `<div class="empty-state"><strong>Nenhum evento criado</strong><p>As comemorações aparecem aqui assim que os clientes começarem a criá-las na plataforma.</p></div>`;
    return;
  }

  const porTipo = groupBy(eventos, 'tipo');
  const total = eventos.length;

  host.innerHTML = `<div style="display:flex;flex-direction:column;gap:.875rem">${
    [...porTipo.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([tipo, lista]) => {
        const pct = Math.round((lista.length / total) * 100);
        return `
          <div>
            <div style="display:flex;justify-content:space-between;font-size:.8125rem;margin-bottom:.375rem">
              <span style="font-weight:600">${escapeHtml(EVENT_TYPE_LABELS[tipo] || tipo)}</span>
              <span class="cell-muted">${formatNumber(lista.length)} · ${pct}%</span>
            </div>
            <div style="height:8px;background:var(--bg-muted);border-radius:999px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:var(--primary-color);border-radius:999px"></div>
            </div>
          </div>`;
      }).join('')
  }</div>`;
}
