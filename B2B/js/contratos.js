/* ==========================================================================
   LOVE B2B — Pagamentos (Financeiro + Receber), dados reais via Supabase
   ========================================================================== */

let bPaymentLinks = [];
let bContracts = [];
let financeContratosEstado = null;
let paymentLinksEstado = null;
let bWalletTransactions = [];

document.addEventListener('DOMContentLoaded', async () => {
  await window.b2bAuthReady;
  await loadContratosData();
  initPaymentsViewTabs();
  renderFinanceStats();
  // Barras das tabelas (busca, Filtrar por, Exportar) — padrão do Admin.
  financeContratosEstado = montarBarraTabela(document.getElementById('finance-contratos-card'), {
    placeholder: 'Buscar cliente...',
    filtros: [{ chave: 'status', rotulo: 'Quitação', opcoes: () => Object.entries(CONTRATO_STATUS_INFO).map(([k, v]) => [k, v.label]) }],
    exportar: () => tabelaExportarCSV('gestao-de-pagamentos', [
      { titulo: 'Cliente', valor: r => r.client_name },
      { titulo: 'Valor total', valor: r => r.valor_total },
      { titulo: 'Pago', valor: r => r.valor_pago },
      { titulo: 'Parcelas', valor: r => `${r.parcelas_pagas}/${r.parcelas_total}` },
      { titulo: 'Próxima parcela', valor: r => r.proxima_parcela || '' },
      { titulo: 'Quitação', valor: r => (CONTRATO_STATUS_INFO[r.status] || CONTRATO_STATUS_INFO.em_dia).label }
    ], contratosAbertosFiltrados()),
    aoMudar: () => renderContratosAbertos()
  });
  paymentLinksEstado = montarBarraTabela(document.getElementById('payment-links-card'), {
    placeholder: 'Buscar por valor ou data...',
    filtros: [{ chave: 'situacao', rotulo: 'Situação', opcoes: () => [['pago', 'Pago'], ['pendente', 'Aguardando pagamento']] }],
    exportar: () => tabelaExportarCSV('links-de-cobranca', [
      { titulo: 'Criado em', valor: l => formatLinkDate(l.created_at) },
      { titulo: 'Valor', valor: l => l.amount },
      { titulo: 'Parcelas', valor: l => l.installments },
      { titulo: 'Situação', valor: l => (l.status === 'pago' ? 'Pago' : 'Aguardando pagamento') },
      { titulo: 'Link', valor: l => buildPaymentLinkUrl(l.id) }
    ], paymentLinksFiltrados()),
    aoMudar: () => renderPaymentLinksList()
  });
  renderContratosAbertos();
  renderPaymentLinksList();
  initPaymentLinkModal();
  initWithdrawalModal();
  initChargeDrawer();
  window.b2bPageReady?.();
});

async function loadContratosData() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  const [linksRes, contractsRes, txRes] = await Promise.all([
    supabaseClient.from('payment_links').select('*').eq('fornecedor_id', empresaId(session)).order('created_at', { ascending: false }),
    supabaseClient.from('contracts').select('*, contract_guests(*)').eq('fornecedor_id', empresaId(session)).order('created_at', { ascending: false }),
    supabaseClient.from('wallet_transactions').select('*').eq('fornecedor_id', empresaId(session)).order('created_at', { ascending: false })
  ]);

  bPaymentLinks = linksRes.data || [];
  bContracts = contractsRes.data || [];
  bWalletTransactions = txRes.data || [];
}

/* -------------------- Abas: Financeiro / Receber -------------------- */

function initPaymentsViewTabs() {
  const wrap = document.getElementById('payments-view-tabs');
  if (!wrap) return;

  wrap.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('[data-view-panel]').forEach(panel => {
        panel.style.display = panel.dataset.viewPanel === btn.dataset.view ? '' : 'none';
      });
      if (btn.dataset.view === 'financeiro') renderFinanceStats();
    });
  });

  const requestedTab = new URLSearchParams(location.search).get('tab');
  const requestedBtn = requestedTab && wrap.querySelector(`[data-view="${requestedTab}"]`);
  if (requestedBtn) requestedBtn.click();
}

/* -------------------- Carteira: cálculos a partir das transações reais -------------------- */

function computeSaldoDisponivel() {
  return bWalletTransactions.reduce((sum, t) => sum + (t.type === 'credit' ? Number(t.amount) : -Number(t.amount)), 0);
}

function computeSaldoAReceber() {
  return bPaymentLinks.filter(l => l.status === 'pago').reduce((sum, l) => sum + Number(l.amount), 0);
}

function computeValorEmAberto() {
  return bPaymentLinks.filter(l => l.status === 'pendente').reduce((sum, l) => sum + Number(l.amount), 0);
}

function computeFaturamentoDoMes(monthsAgo) {
  const now = new Date();
  const targetMonth = now.getMonth() - monthsAgo;
  const targetYear = now.getFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;

  return bWalletTransactions
    .filter(t => t.type === 'credit')
    .filter(t => {
      const d = new Date(t.created_at);
      return d.getMonth() === normalizedMonth && d.getFullYear() === targetYear;
    })
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

function buildPaymentLinkUrl(id) {
  return new URL(`site-preview?page=checkout&link=${id}`, location.href).toString();
}

function formatLinkDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// `vencimento` é uma coluna `date` (sem horário) — formatar com `new Date()`
// direto interpretaria como UTC e, em fusos atrás de UTC, mostraria um dia
// a menos. Monta a data local a partir dos componentes para evitar isso.
function formatDateOnly(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/* -------------------- Aba Financeiro -------------------- */

/* Topo do Financeiro no modelo da Carteira Digital (love.com.br):
   saldo disponível para saque + Solicitar saque, saldo pendente, "Esconder
   valores" e os atalhos para o histórico de saques e o extrato. */
let finEsconder = false;
try { finEsconder = localStorage.getItem('b2b-fin-esconder') === '1'; } catch (e) { /* sem armazenamento */ }
const finValor = v => (finEsconder ? 'R$ ••••' : formatCurrency(v));

function renderFinanceStats() {
  const disp = document.getElementById('fin-saldo-disponivel');
  if (!disp) return;
  const disponivel = computeSaldoDisponivel();
  disp.textContent = finValor(disponivel);
  disp.classList.toggle('is-escondido', finEsconder);
  const pend = document.getElementById('fin-saldo-pendente');
  pend.textContent = finValor(computeSaldoAReceber());
  pend.classList.toggle('is-escondido', finEsconder);
  const esconder = document.querySelector('#fin-esconder span');
  if (esconder) esconder.textContent = finEsconder ? 'Mostrar valores' : 'Esconder valores';

  const temConta = !!(typeof B2B_DATA !== 'undefined' && B2B_DATA.professional.pixKey);
  document.getElementById('fin-dica-conta').hidden = temConta;
  const sacar = document.getElementById('request-withdrawal-btn');
  sacar.disabled = !(disponivel > 0 && temConta);
  if (!sacar.dataset.ligado) {
    sacar.dataset.ligado = '1';
    sacar.addEventListener('click', openWithdrawalModal);
    document.getElementById('fin-esconder')?.addEventListener('click', () => {
      finEsconder = !finEsconder;
      try { localStorage.setItem('b2b-fin-esconder', finEsconder ? '1' : '0'); } catch (e) { /* sem armazenamento */ }
      renderFinanceStats();
    });
    document.querySelectorAll('[data-fin-ver]').forEach(b => b.addEventListener('click', () => {
      mostrarListaFinanceira(b.dataset.finVer);
      document.getElementById('finance-lista-titulo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    document.querySelectorAll('[data-fin-aba]').forEach(b => b.addEventListener('click', () => {
      document.querySelector(`#payments-view-tabs [data-view="${b.dataset.finAba}"]`)?.click();
    }));
  }

  // Extrato / Saques / Notas fiscais: botões com ícone ao lado do título.
  const botoes = document.getElementById('finance-lista-botoes');
  if (botoes) {
    botoes.innerHTML = FINANCE_LISTAS.map(l => `
      <button type="button" class="fin-lista-btn${l.chave === financeListaAtual ? ' is-ativo' : ''}" data-finance-lista="${l.chave}" aria-pressed="${l.chave === financeListaAtual}">
        <span class="fin-lista-icone">${l.icone}</span>${l.nome}
      </button>`).join('');
    botoes.querySelectorAll('[data-finance-lista]').forEach(btn => btn.addEventListener('click', () => mostrarListaFinanceira(btn.dataset.financeLista)));
  }
  renderListaFinanceira();
}

/* -------------------- Acesso rápido: Extrato / Saques / Notas fiscais --------------------
   No lugar do antigo "Valor em aberto". Clicar troca a lista de baixo (sem
   drawer): Extrato (recebimentos e saques, padrão), Saques (só as saídas)
   e Minhas notas fiscais (as emitidas). */
const FINANCE_LISTAS = [
  { chave: 'extrato', nome: 'Extrato', titulo: 'Extrato completo',
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" stroke-width="2.6"/></svg>' },
  { chave: 'saques', nome: 'Saques', titulo: 'Histórico de saques',
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6.5 9.5v.01M17.5 14.5v.01" stroke-width="2.4"/></svg>' },
  { chave: 'notas', nome: 'Notas fiscais', titulo: 'Minhas notas fiscais',
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5"/><path d="M12 11v6M14 12.5c-.4-.6-1.1-.9-2-.9-1.1 0-1.9.6-1.9 1.4 0 1.9 4 .9 4 2.8 0 .8-.9 1.4-2.1 1.4-.9 0-1.7-.4-2-1"/></svg>' }
];
let financeListaAtual = 'extrato';
let bNotasFiscais = [];
let notasCarregadas = false;

const dataHoraCurta = iso => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

function mostrarListaFinanceira(chave) {
  financeListaAtual = chave;
  ajustarFiltrosDaLista();
  if (financeListaEstado) {
    financeListaEstado.busca = '';
    const busca = document.querySelector('#finance-lista-card .tabela-busca input');
    if (busca) busca.value = '';
  }
  document.querySelectorAll('[data-finance-lista]').forEach(b => { b.classList.toggle('is-ativo', b.dataset.financeLista === chave); b.setAttribute('aria-pressed', String(b.dataset.financeLista === chave)); });
  renderListaFinanceira();
}

async function carregarNotasFiscais() {
  if (notasCarregadas) return;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;
  const { data } = await supabaseClient.from('notas_fiscais').select('*').eq('fornecedor_id', empresaId(session)).order('created_at', { ascending: false });
  bNotasFiscais = data || [];
  notasCarregadas = true;
}

/* Barra da lista (busca, Filtrar por, Exportar) — mesmo padrão de Leads.
   Os filtros mudam conforme a lista aberta (Extrato, Saques, Notas). */
let financeListaEstado = null;
const financeListaFiltros = [];
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const chaveDoMes = iso => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const rotuloDoMes = chave => { const [a, m] = chave.split('-').map(Number); return `${MESES_CURTOS[m - 1]}/${a}`; };
const numeroCurto = id => String(id || '').replace(/-/g, '').slice(0, 8).toUpperCase();
const opcoesDeMes = itens => [...new Set(itens.map(i => chaveDoMes(i.created_at)))].sort().reverse().map(k => [k, rotuloDoMes(k)]);

function linhasDaListaFinanceira() {
  if (financeListaAtual === 'extrato') {
    return bWalletTransactions.map(t => {
      const entrada = t.type === 'credit';
      return {
        numero: numeroCurto(t.id), data: dataHoraCurta(t.created_at), mes: chaveDoMes(t.created_at), quando: t.created_at,
        descricao: t.description || (entrada ? 'Recebimento' : 'Saque'), tipo: entrada ? 'entrada' : 'saida',
        valor: Number(t.amount) || 0
      };
    });
  }
  if (financeListaAtual === 'saques') {
    return bWalletTransactions.filter(t => t.type === 'debit').map(t => ({
      numero: numeroCurto(t.id), data: dataHoraCurta(t.created_at), mes: chaveDoMes(t.created_at), quando: t.created_at,
      descricao: t.description || 'Saque', valor: Number(t.amount) || 0, situacao: 'Concluído'
    }));
  }
  return bNotasFiscais.map(n => ({
    numero: n.number || '', cliente: n.client || '', valor: Number(n.value || 0),
    data: dataHoraCurta(n.created_at), mes: chaveDoMes(n.created_at), quando: n.created_at,
    situacao: n.status === 'emitida' ? 'Emitida' : (n.status || '')
  }));
}

function linhasFinanceirasFiltradas() {
  const est = financeListaEstado || { busca: '', filtros: {} };
  return linhasDaListaFinanceira().filter(r =>
    finNoPeriodo(r.quando) &&
    (!est.filtros.tipo || r.tipo === est.filtros.tipo) &&
    (!est.filtros.mes || r.mes === est.filtros.mes) &&
    (!est.filtros.situacao || r.situacao === est.filtros.situacao) &&
    tabelaBateBusca(est, [r.numero, r.descricao, r.cliente, r.data, r.valor, formatCurrency(r.valor)]));
}

function ajustarFiltrosDaLista() {
  financeListaFiltros.length = 0;
  if (financeListaAtual === 'extrato') {
    financeListaFiltros.push(
      { chave: 'tipo', rotulo: 'Tipo', opcoes: () => [['entrada', 'Entrada'], ['saida', 'Saída']] },
      { chave: 'mes', rotulo: 'Mês', opcoes: () => opcoesDeMes(bWalletTransactions) });
  } else if (financeListaAtual === 'saques') {
    financeListaFiltros.push({ chave: 'mes', rotulo: 'Mês', opcoes: () => opcoesDeMes(bWalletTransactions.filter(t => t.type === 'debit')) });
  } else {
    financeListaFiltros.push(
      { chave: 'situacao', rotulo: 'Situação', opcoes: () => [...new Set(bNotasFiscais.map(n => (n.status === 'emitida' ? 'Emitida' : n.status)).filter(Boolean))].map(s => [s, s]) },
      { chave: 'mes', rotulo: 'Mês', opcoes: () => opcoesDeMes(bNotasFiscais) });
  }
  if (financeListaEstado) {
    financeListaEstado.filtros = {};
    const card = document.getElementById('finance-lista-card');
    const contador = card && card.querySelector('.tabela-filtro-contador');
    if (contador) contador.hidden = true;
    card?.querySelector('[data-tabela-filtrar]')?.classList.remove('is-ativo');
    const placeholder = financeListaAtual === 'notas' ? 'Buscar nº da nota ou cliente...' : 'Buscar nº, descrição ou valor...';
    const busca = card && card.querySelector('.tabela-busca input');
    if (busca) busca.placeholder = placeholder;
  }
}

function initBarraListaFinanceira() {
  const card = document.getElementById('finance-lista-card');
  if (!card || financeListaEstado) return;
  ajustarFiltrosDaLista();
  financeListaEstado = montarBarraTabela(card, {
    placeholder: 'Buscar descrição ou valor...',
    filtros: [],
    exportar: () => {
      const rows = linhasFinanceirasFiltradas();
      if (financeListaAtual === 'notas') {
        tabelaExportarCSV('notas-fiscais', [
          { titulo: 'Número', valor: r => r.numero }, { titulo: 'Cliente', valor: r => r.cliente },
          { titulo: 'Valor', valor: r => r.valor }, { titulo: 'Emitida em', valor: r => r.data }, { titulo: 'Situação', valor: r => r.situacao }
        ], rows);
      } else if (financeListaAtual === 'saques') {
        tabelaExportarCSV('saques', [
          { titulo: 'Nº', valor: r => r.numero }, { titulo: 'Data', valor: r => r.data }, { titulo: 'Descrição', valor: r => r.descricao },
          { titulo: 'Valor', valor: r => r.valor }, { titulo: 'Situação', valor: r => r.situacao }
        ], rows);
      } else {
        tabelaExportarCSV('extrato', [
          { titulo: 'Nº', valor: r => r.numero }, { titulo: 'Data', valor: r => r.data }, { titulo: 'Descrição', valor: r => r.descricao },
          { titulo: 'Tipo', valor: r => (r.tipo === 'entrada' ? 'Entrada' : 'Saída') },
          { titulo: 'Valor', valor: r => (r.tipo === 'entrada' ? r.valor : -r.valor) }
        ], rows);
      }
    },
    aoMudar: () => renderListaFinanceira()
  });
  montarPeriodoFinanceiro(card.querySelector('.tabela-barra-acoes'));
}

/* -------------------- Período do extrato --------------------
   Igual ao filtro de período do Dashboard do Admin: botão com o período
   ("Todo o período", "Este mês"…) e, ao clicar, atalhos à esquerda e um
   calendário (um dia ou um intervalo) com "Aplicar". */
const finPeriodo = { de: null, ate: null };
function finNoPeriodo(data) {
  if (!finPeriodo.de && !finPeriodo.ate) return true;
  if (!data) return false;
  const t = new Date(data).getTime();
  return (!finPeriodo.de || t >= finPeriodo.de.getTime()) && (!finPeriodo.ate || t <= finPeriodo.ate.getTime());
}
function finRotuloDoPeriodo() {
  const { de, ate } = finPeriodo;
  const dia = d => d.toLocaleDateString('pt-BR');
  if (!de && !ate) return 'Todo o período';
  const hoje = new Date();
  if (de && ate && de.getDate() === 1 && de.getMonth() === hoje.getMonth() && de.getFullYear() === hoje.getFullYear() && dia(ate) === dia(hoje)) return 'Este mês';
  if (de && ate && dia(de) === dia(ate) && dia(de) === dia(hoje)) return 'Hoje';
  if (de && ate && dia(de) === dia(ate)) return dia(de);
  if (de && ate) return `${dia(de)} – ${dia(ate)}`;
  return de ? `A partir de ${dia(de)}` : `Até ${dia(ate)}`;
}
function montarPeriodoFinanceiro(host) {
  if (!host || host.querySelector('.per-wrap')) return;
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const ATALHOS = [['hoje', 'Hoje'], ['7', 'Últimos 7 dias'], ['30', 'Últimos 30 dias'], ['mes', 'Este mês'], ['tudo', 'Todo o período']];
  const wrap = document.createElement('div');
  wrap.className = 'per-wrap';
  wrap.innerHTML = `
    <button type="button" class="tabela-barra-btn per-btn" aria-expanded="false">
      <svg class="per-btn-cal" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg>
      <span class="per-rotulo">${finRotuloDoPeriodo()}</span>
      <svg class="per-seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6l6 -6"/></svg>
    </button>
    <div class="per-menu" hidden>
      <div class="per-atalhos">${ATALHOS.map(([v, r]) => `<button type="button" class="per-atalho" data-per-atalho="${v}">${r}</button>`).join('')}</div>
      <div class="per-corpo">
        <div class="per-topo">
          <button type="button" class="per-nav" data-per-mes="-1" aria-label="Mês anterior"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6l6 6"/></svg></button>
          <span class="per-mes"></span>
          <button type="button" class="per-nav" data-per-mes="1" aria-label="Próximo mês"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6l-6 6"/></svg></button>
        </div>
        <div class="per-semana">${SEMANA.map(d => `<span>${d}</span>`).join('')}</div>
        <div class="per-dias"></div>
        <p class="per-dica">Clique num dia, ou em dois para um intervalo.</p>
        <button type="button" class="per-aplicar">Aplicar</button>
      </div>
    </div>`;
  host.prepend(wrap);
  const botao = wrap.querySelector('.per-btn');
  const menu = wrap.querySelector('.per-menu');
  const dias = wrap.querySelector('.per-dias');
  const dica = wrap.querySelector('.per-dica');
  const inicioDoDia = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const fimDoDia = d => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  const hoje = inicioDoDia(new Date());
  const fmt = d => d.toLocaleDateString('pt-BR');
  let selDe = null; let selAte = null;
  let mesVisto = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const desenhar = () => {
    wrap.querySelector('.per-mes').textContent = `${MESES[mesVisto.getMonth()]} ${mesVisto.getFullYear()}`;
    const primeiro = new Date(mesVisto.getFullYear(), mesVisto.getMonth(), 1);
    const total = new Date(mesVisto.getFullYear(), mesVisto.getMonth() + 1, 0).getDate();
    let html = '<span></span>'.repeat(primeiro.getDay());
    for (let n = 1; n <= total; n++) {
      const t = new Date(mesVisto.getFullYear(), mesVisto.getMonth(), n).getTime();
      const c = ['per-dia'];
      if (t === hoje.getTime()) c.push('is-hoje');
      if (selDe && t === selDe.getTime()) c.push('is-inicio');
      if (selAte && t === selAte.getTime()) c.push('is-fim');
      if (selDe && selAte && t > selDe.getTime() && t < selAte.getTime()) c.push('is-meio');
      html += `<button type="button" class="${c.join(' ')}" data-per-dia="${t}" ${t > hoje.getTime() ? 'disabled' : ''}>${n}</button>`;
    }
    dias.innerHTML = html;
    wrap.querySelector('[data-per-mes="1"]').disabled = new Date(mesVisto.getFullYear(), mesVisto.getMonth() + 1, 1) > hoje;
    dica.textContent = !selDe ? 'Clique num dia, ou em dois para um intervalo.'
      : selAte && selAte.getTime() !== selDe.getTime() ? `${fmt(selDe)} – ${fmt(selAte)}`
      : `${fmt(selDe)} · clique em outro dia para um intervalo`;
  };
  const fechar = () => { menu.hidden = true; botao.setAttribute('aria-expanded', 'false'); };
  const aplicar = (de, ate) => {
    finPeriodo.de = de && inicioDoDia(de);
    finPeriodo.ate = ate && fimDoDia(ate);
    wrap.querySelector('.per-rotulo').textContent = finRotuloDoPeriodo();
    botao.classList.toggle('is-ativo', !!(finPeriodo.de || finPeriodo.ate));
    fechar();
    renderListaFinanceira();
  };
  botao.addEventListener('click', e => {
    e.stopPropagation();
    const abrir = menu.hidden;
    if (abrir) {
      selDe = finPeriodo.de && inicioDoDia(finPeriodo.de);
      selAte = finPeriodo.ate && inicioDoDia(finPeriodo.ate);
      const ref = selAte || hoje;
      mesVisto = new Date(ref.getFullYear(), ref.getMonth(), 1);
      desenhar();
    }
    menu.hidden = !abrir;
    botao.setAttribute('aria-expanded', String(abrir));
  });
  menu.addEventListener('click', e => e.stopPropagation());
  document.addEventListener('click', fechar);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });
  wrap.querySelectorAll('[data-per-mes]').forEach(b => b.addEventListener('click', () => {
    mesVisto = new Date(mesVisto.getFullYear(), mesVisto.getMonth() + Number(b.dataset.perMes), 1);
    desenhar();
  }));
  dias.addEventListener('click', e => {
    const alvo = e.target.closest('[data-per-dia]');
    if (!alvo) return;
    const d = new Date(Number(alvo.dataset.perDia));
    if (!selDe || (selAte && selAte.getTime() !== selDe.getTime())) { selDe = d; selAte = d; }
    else if (d < selDe) { selAte = selDe; selDe = d; }
    else selAte = d;
    desenhar();
  });
  wrap.querySelector('.per-aplicar').addEventListener('click', () => {
    if (!selDe) { dica.textContent = 'Escolha um dia no calendário.'; return; }
    aplicar(selDe, selAte || selDe);
  });
  wrap.querySelectorAll('[data-per-atalho]').forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.perAtalho;
    const menos = n => new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - n);
    if (v === 'hoje') aplicar(hoje, hoje);
    else if (v === '7') aplicar(menos(6), hoje);
    else if (v === '30') aplicar(menos(29), hoje);
    else if (v === 'mes') aplicar(new Date(hoje.getFullYear(), hoje.getMonth(), 1), hoje);
    else aplicar(null, null);
  }));
}

async function renderListaFinanceira() {
  const head = document.getElementById('finance-lista-head');
  const body = document.getElementById('finance-lista-body');
  const vazia = document.getElementById('finance-lista-vazia');
  if (!head || !body) return;
  initBarraListaFinanceira();
  const lista = FINANCE_LISTAS.find(l => l.chave === financeListaAtual) || FINANCE_LISTAS[0];
  setText('finance-lista-titulo', lista.titulo);
  if (lista.chave === 'notas') { await carregarNotasFiscais(); if (financeListaAtual !== 'notas') return; }
  const rows = linhasFinanceirasFiltradas();
  const filtrando = !!(financeListaEstado && (financeListaEstado.busca || Object.values(financeListaEstado.filtros).some(Boolean)));
  let colunas = [];
  let linhas = [];
  let textoVazio = '';
  if (lista.chave === 'extrato') {
    colunas = ['Data', 'Descrição', 'Tipo', 'Valor'];
    linhas = rows.map(r => `<tr><td>${r.data}</td><td>${escapeHtml(r.descricao)}</td><td>${r.tipo === 'entrada' ? 'Entrada' : 'Saída'}</td><td class="finance-valor ${r.tipo === 'entrada' ? 'is-entrada' : 'is-saida'}">${r.tipo === 'entrada' ? '+' : '−'} ${formatCurrency(r.valor)}</td></tr>`);
    textoVazio = 'Nenhuma movimentação ainda.';
  } else if (lista.chave === 'saques') {
    colunas = ['Data', 'Descrição', 'Valor', 'Situação'];
    linhas = rows.map(r => `<tr><td>${r.data}</td><td>${escapeHtml(r.descricao)}</td><td class="finance-valor">${formatCurrency(r.valor)}</td><td>${escapeHtml(r.situacao)}</td></tr>`);
    textoVazio = 'Você ainda não fez nenhum saque.';
  } else {
    colunas = ['Número', 'Cliente', 'Valor', 'Emitida em', 'Situação'];
    linhas = rows.map(r => `<tr><td>${escapeHtml(r.numero || '—')}</td><td>${escapeHtml(r.cliente || '—')}</td><td class="finance-valor">${formatCurrency(r.valor)}</td><td>${r.data}</td><td>${escapeHtml(r.situacao || '—')}</td></tr>`);
    textoVazio = 'Nenhuma nota fiscal emitida ainda.';
  }
  if (filtrando) textoVazio = 'Nada encontrado com essa busca ou filtro.';
  head.innerHTML = `<tr>${colunas.map(c => `<th${c === 'Valor' ? ' class="cart-num"' : ''}>${c}</th>`).join('')}</tr>`;
  body.innerHTML = linhas.join('');
  if (vazia) { vazia.textContent = textoVazio; vazia.style.display = linhas.length ? 'none' : ''; }
}

/* -------------------- Modal: sacar Pix -------------------- */

let withdrawalKeyInfo = null;

function isFirstWithdrawalSetup() {
  return !B2B_DATA.professional.pixKey;
}

function goToWithdrawalStep(step) {
  document.querySelectorAll('[data-withdrawal-step]').forEach(panel => {
    panel.hidden = panel.dataset.withdrawalStep !== step;
  });
  const titles = {
    key: isFirstWithdrawalSetup() ? 'Faça seu primeiro Pix' : 'Sacar Pix',
    bank: 'Insira os dados de quem vai receber seu Pix',
    confirm: 'Confira a conta',
    amount: 'Insira o valor'
  };
  setText('withdrawal-modal-title', titles[step] || 'Sacar Pix');

  const card = document.getElementById('withdrawal-modal-card');
  if (card) card.style.maxWidth = step === 'bank' ? '540px' : '420px';
}

function renderWithdrawalConfirmStep() {
  if (!withdrawalKeyInfo) return;
  setText('withdrawal-confirm-name', withdrawalKeyInfo.name || '—');
  setText('withdrawal-confirm-key', withdrawalKeyInfo.key || '—');
  setText('withdrawal-confirm-doc-label', withdrawalKeyInfo.docLabel || 'CPF');
  setText('withdrawal-confirm-doc', withdrawalKeyInfo.doc || '—');
  setText('withdrawal-confirm-bank', withdrawalKeyInfo.bank || '—');
}

function renderWithdrawalAmountStep() {
  if (!withdrawalKeyInfo) return;
  setText('withdrawal-amount-avatar', initials(withdrawalKeyInfo.name || '—'));
  setText('withdrawal-amount-name', withdrawalKeyInfo.name || '—');
  setText('withdrawal-amount-key', `Chave Pix: ${withdrawalKeyInfo.key || '—'}`);
  setText('withdrawal-saldo-value', formatCurrency(computeSaldoDisponivel()));
  const amountInput = document.getElementById('withdrawal-amount');
  if (amountInput) amountInput.value = '';
}

function openWithdrawalModal() {
  const modal = document.getElementById('withdrawal-modal');
  if (!modal) return;

  document.getElementById('withdrawal-pix-key-input').value = '';
  ['withdrawal-bank-name', 'withdrawal-bank-agencia', 'withdrawal-bank-conta', 'withdrawal-bank-fullname', 'withdrawal-bank-doc']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  if (isFirstWithdrawalSetup()) {
    withdrawalKeyInfo = null;
    // CNPJ já salvo no perfil: entra como sugestão de chave Pix (dá para trocar).
    const prof = B2B_DATA.professional;
    const cnpj = prof.documentType !== 'cpf' ? String(prof.documentNumber || '').trim() : '';
    const keyInput = document.getElementById('withdrawal-pix-key-input');
    let dica = document.getElementById('withdrawal-pix-sugestao');
    if (cnpj && keyInput) {
      keyInput.value = cnpj;
      if (!dica) {
        dica = document.createElement('p');
        dica.id = 'withdrawal-pix-sugestao';
        dica.className = 'withdrawal-pix-sugestao';
        keyInput.insertAdjacentElement('afterend', dica);
      }
      dica.textContent = 'Sugerimos o CNPJ da sua empresa. Se a sua chave Pix for outra, é só trocar.';
      dica.hidden = false;
    } else if (dica) {
      dica.hidden = true;
    }
    goToWithdrawalStep('key');
  } else {
    const p = B2B_DATA.professional;
    withdrawalKeyInfo = {
      key: p.pixKey,
      name: p.name,
      doc: p.documentNumber,
      docLabel: p.documentType === 'cpf' ? 'CPF' : 'CNPJ',
      bank: '—'
    };
    renderWithdrawalAmountStep();
    goToWithdrawalStep('amount');
  }

  modal.classList.add('show');
}

function initWithdrawalModal() {
  const modal = document.getElementById('withdrawal-modal');
  if (!modal) return;

  const closeBtn = document.getElementById('withdrawal-modal-close');
  const close = () => modal.classList.remove('show');
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  /* Etapa 1: chave Pix */
  const keyInput = document.getElementById('withdrawal-pix-key-input');

  document.getElementById('withdrawal-use-bank-btn').addEventListener('click', () => {
    goToWithdrawalStep('bank');
  });

  document.getElementById('withdrawal-key-continue-btn').addEventListener('click', () => {
    const key = keyInput.value.trim();
    if (!key) {
      showToast('Insira sua chave Pix para continuar.', true);
      return;
    }
    const p = B2B_DATA.professional;
    withdrawalKeyInfo = {
      key,
      name: p.name,
      doc: p.documentNumber,
      docLabel: p.documentType === 'cpf' ? 'CPF' : 'CNPJ',
      bank: '—'
    };
    renderWithdrawalConfirmStep();
    goToWithdrawalStep('confirm');
  });

  /* Etapa 2: agência e conta */
  const bankName = document.getElementById('withdrawal-bank-name');
  const bankAgencia = document.getElementById('withdrawal-bank-agencia');
  const bankConta = document.getElementById('withdrawal-bank-conta');
  const bankFullname = document.getElementById('withdrawal-bank-fullname');
  const bankDocType = document.getElementById('withdrawal-bank-doc-type');
  const bankDoc = document.getElementById('withdrawal-bank-doc');

  document.getElementById('withdrawal-bank-continue-btn').addEventListener('click', () => {
    if (!bankName.value.trim() || !bankAgencia.value.trim() || !bankConta.value.trim() || !bankFullname.value.trim() || !bankDoc.value.trim()) {
      showToast('Preencha todos os dados bancários para continuar.', true);
      return;
    }
    withdrawalKeyInfo = {
      key: `Agência ${bankAgencia.value.trim()} • Conta ${bankConta.value.trim()}`,
      name: bankFullname.value.trim(),
      doc: bankDoc.value.trim(),
      docLabel: bankDocType.value === 'cnpj' ? 'CNPJ' : 'CPF',
      bank: bankName.value.trim()
    };
    renderWithdrawalConfirmStep();
    goToWithdrawalStep('confirm');
  });

  /* Etapa 3: confirmar conta */
  document.getElementById('withdrawal-confirm-change-btn').addEventListener('click', () => {
    goToWithdrawalStep('key');
  });

  document.getElementById('withdrawal-confirm-continue-btn').addEventListener('click', async () => {
    if (!withdrawalKeyInfo) return;
    const p = B2B_DATA.professional;
    p.pixKeyType = 'aleatoria';
    p.pixKey = withdrawalKeyInfo.key;

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
      await supabaseClient.from('fornecedores').update({ pix_key: p.pixKey, pix_key_type: p.pixKeyType }).eq('id', empresaId(session));
    }

    renderWithdrawalAmountStep();
    goToWithdrawalStep('amount');
  });

  /* Etapa 4: valor do saque */
  const amountInput = document.getElementById('withdrawal-amount');
  wireCurrencyMaskInput(amountInput);

  document.getElementById('withdrawal-amount-message-btn').addEventListener('click', () => {
    showToast('Em breve você poderá adicionar uma mensagem ao Pix.');
  });

  document.getElementById('withdrawal-amount-submit-btn').addEventListener('click', async () => {
    const amount = currencyMaskValue(amountInput);
    const saldoDisponivel = computeSaldoDisponivel();

    if (!amount || amount <= 0) {
      showToast('Informe a quantia que deseja sacar.', true);
      return;
    }
    if (amount > saldoDisponivel) {
      showToast('A quantia é maior que o saldo disponível para saque.', true);
      return;
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    const { error } = await supabaseClient.from('wallet_transactions').insert({
      fornecedor_id: empresaId(session),
      type: 'debit',
      amount,
      description: 'Saque via Pix'
    });

    if (error) {
      showToast('Não foi possível processar o saque.', true);
      return;
    }

    await loadContratosData();
    renderFinanceStats();
    close();
    showToast('Solicitação de saque enviada. O valor cai na sua conta em até 1 dia útil.');
  });
}

function formatShortDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

const CONTRATO_STATUS_INFO = {
  quitado: { label: 'Finalizado', color: 'status-neutral-dark' },
  em_dia: { label: 'Em dia', color: 'status-inativo' },
  atrasado: { label: 'Atrasado', color: 'status-recusado' }
};

function contratosAbertosFiltrados() {
  const est = financeContratosEstado || { busca: '', filtros: {} };
  return (bContracts || []).filter(r =>
    (!est.filtros.status || r.status === est.filtros.status) &&
    tabelaBateBusca(est, [r.client_name]));
}

function paymentLinksFiltrados() {
  const est = paymentLinksEstado || { busca: '', filtros: {} };
  return bPaymentLinks.filter(l =>
    (!est.filtros.situacao || (est.filtros.situacao === 'pago' ? l.status === 'pago' : l.status !== 'pago')) &&
    tabelaBateBusca(est, [formatLinkDate(l.created_at), formatCurrency(l.amount), l.amount]));
}

function renderContratosAbertos() {
  const body = document.getElementById('finance-contratos-body');
  if (!body) return;
  const rows = contratosAbertosFiltrados();
  body.innerHTML = rows.length
    ? rows.map(row => {
      const info = CONTRATO_STATUS_INFO[row.status] || CONTRATO_STATUS_INFO.em_dia;
      const pct = row.valor_total ? Math.min(100, Math.round((row.valor_pago / row.valor_total) * 100)) : 0;
      return `
      <tr>
        <td class="col-principal">${escapeHtml(row.client_name)}</td>
        <td>${formatCurrency(row.valor_total)}</td>
        <td>
          ${formatCurrency(row.valor_pago)} de ${formatCurrency(row.valor_total)}
          <div class="payment-progress"><div class="payment-progress-fill" style="width:${pct}%"></div></div>
        </td>
        <td>${row.parcelas_pagas}/${row.parcelas_total}</td>
        <td>${row.proxima_parcela ? formatShortDate(row.proxima_parcela) : '—'}</td>
        <td><span class="status-text ${info.color}">${info.label}</span></td>
      </tr>
    `;
    }).join('')
    : `<tr><td colspan="6" class="text-center text-sm text-zinc-500" style="padding:1.5rem 0;">Nenhum contrato em aberto no momento.</td></tr>`;
}

/* -------------------- Aba Receber -------------------- */

function renderPaymentLinksList() {
  const body = document.getElementById('payment-links-body');
  const empty = document.getElementById('payment-links-empty');
  if (!body) return;
  const links = paymentLinksFiltrados().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (!links.length) {
    body.innerHTML = '';
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';

  body.innerHTML = links.map(link => `
    <tr class="payment-link-row">
      <td>${formatLinkDate(link.created_at)}</td>
      <td class="col-principal">${formatCurrency(link.amount)}</td>
      <td>${link.installments}x${link.installments === 1 ? ' (à vista)' : ''}</td>
      <td><span class="status-badge status-badge-plain ${link.status === 'pago' ? 'status-ativo' : 'status-enviado'}">${link.status === 'pago' ? 'Pago' : 'Aguardando pagamento'}</span></td>
      <td>
        ${link.status === 'pago'
          ? `<span class="payment-link-row-paid">Link pago</span>`
          : `<button type="button" class="payment-link-row-copy" data-copy-link="${link.id}">Copiar link</button>`}
      </td>
      ${tabelaVerMaisHtml('data-link-row', link.id)}
    </tr>
  `).join('');

  body.querySelectorAll('[data-copy-link]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const url = buildPaymentLinkUrl(btn.dataset.copyLink);
      copyTextToClipboard(url);
      showToast('Link copiado!');
    });
  });

  // Só o "ver mais" abre os dados da cobrança.
  body.querySelectorAll('[data-link-row]').forEach(btn => {
    btn.addEventListener('click', () => openChargeDrawer(btn.dataset.linkRow));
  });
}

/* -------------------- Drawer: Dados da cobrança -------------------- */

const PAYMENT_METHOD_LABELS = { boleto: 'Boleto', pix: 'Pix', cartao: 'Cartão' };

function initChargeDrawer() {
  const backdrop = document.getElementById('charge-drawer-backdrop');
  const drawer = document.getElementById('charge-drawer');
  const closeBtn = document.getElementById('charge-drawer-close');
  if (!drawer) return;

  const close = () => { drawer.classList.remove('show'); backdrop.classList.remove('show'); };
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);

  document.getElementById('charge-drawer-copy').addEventListener('click', () => {
    const link = bPaymentLinks.find(l => l.id === drawer.dataset.linkId);
    if (!link) return;
    copyTextToClipboard(buildPaymentLinkUrl(link.id));
    showToast('Link copiado!');
  });
}

function openChargeDrawer(linkId) {
  const link = bPaymentLinks.find(l => l.id === linkId);
  if (!link) return;

  const drawer = document.getElementById('charge-drawer');
  const backdrop = document.getElementById('charge-drawer-backdrop');
  drawer.dataset.linkId = linkId;

  const situacaoEl = document.getElementById('charge-drawer-situacao');
  situacaoEl.textContent = link.status === 'pago' ? 'Pago' : 'Aguardando pagamento';
  situacaoEl.className = `charge-drawer-value status-text ${link.status === 'pago' ? 'status-ativo' : 'status-pendente'}`;

  document.getElementById('charge-drawer-valor').textContent = formatCurrency(link.amount);
  document.getElementById('charge-drawer-criado').textContent = formatLinkDate(link.created_at);
  document.getElementById('charge-drawer-vencimento').textContent = link.vencimento ? formatDateOnly(link.vencimento) : '—';
  document.getElementById('charge-drawer-parcelas').textContent = `${link.installments}x${link.installments === 1 ? ' (à vista)' : ''}`;

  const methods = link.payment_methods || {};
  const formas = Object.keys(methods).filter(k => methods[k]).map(k => PAYMENT_METHOD_LABELS[k] || k);
  document.getElementById('charge-drawer-formas').textContent = formas.length ? formas.join(', ') : '—';

  document.getElementById('charge-drawer-taxa').textContent = link.pass_fee_to_client ? 'Sim' : 'Não';
  document.getElementById('charge-drawer-link').textContent = buildPaymentLinkUrl(link.id);

  drawer.classList.add('show');
  backdrop.classList.add('show');
}

function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopyText(text));
  } else {
    fallbackCopyText(text);
  }
}

function fallbackCopyText(text) {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  try { document.execCommand('copy'); } catch (e) { /* ignora */ }
  document.body.removeChild(el);
}

/* -------------------- Modal: gerar link de pagamento -------------------- */

const PAYMENT_LINK_SUBMIT_BTN_HTML = '<button type="submit" class="btn-primary justify-center w-full py-3 mt-2" id="payment-link-submit-btn">Criar Link de Cobrança</button>';

function initPaymentLinkModal() {
  const modal = document.getElementById('payment-link-modal');
  const openBtn = document.getElementById('generate-payment-link-btn');
  const closeBtn = document.getElementById('payment-link-modal-close');
  const form = document.getElementById('payment-link-form');
  const fieldsWrap = document.getElementById('payment-link-fields');
  const actionRow = document.getElementById('payment-link-action-row');
  const amountInput = document.getElementById('payment-link-amount');
  const installmentsSelect = document.getElementById('payment-link-installments');
  const feeToggle = document.getElementById('payment-link-fee-toggle');
  if (!modal || !form) return;

  installmentsSelect.innerHTML = Array.from({ length: 12 }, (_, i) => i + 1)
    .map(n => `<option value="${n}">${n}x${n === 1 ? ' (à vista)' : ''}</option>`)
    .join('');

  wireCurrencyMaskInput(amountInput);

  let passFeeToClient = false;

  feeToggle.querySelectorAll('[data-pass-fee]').forEach(btn => {
    btn.addEventListener('click', () => {
      feeToggle.querySelectorAll('[data-pass-fee]').forEach(b => b.classList.toggle('active', b === btn));
      passFeeToClient = btn.dataset.passFee === 'sim';
    });
  });

  const resetModal = () => {
    form.reset();
    fieldsWrap.style.display = '';
    actionRow.innerHTML = PAYMENT_LINK_SUBMIT_BTN_HTML;
    feeToggle.querySelectorAll('[data-pass-fee]').forEach(b => b.classList.toggle('active', b.dataset.passFee === 'nao'));
    passFeeToClient = false;
    installmentsSelect.value = '1';
    form.querySelectorAll('[data-payment-method]').forEach(cb => { cb.checked = true; });
  };

  const open = () => { resetModal(); modal.classList.add('show'); };
  const close = () => modal.classList.remove('show');

  if (openBtn) openBtn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = currencyMaskValue(amountInput);
    if (amount <= 0) return;

    const paymentMethods = {
      boleto: form.querySelector('[data-payment-method="boleto"]').checked,
      pix: form.querySelector('[data-payment-method="pix"]').checked,
      cartao: form.querySelector('[data-payment-method="cartao"]').checked
    };
    const installments = Number(installmentsSelect.value) || 1;
    const vencimento = document.getElementById('payment-link-vencimento').value || null;

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    const { data: created, error } = await supabaseClient
      .from('payment_links')
      .insert({
        fornecedor_id: empresaId(session),
        amount,
        installments,
        pass_fee_to_client: passFeeToClient,
        payment_methods: paymentMethods,
        status: 'pendente',
        vencimento
      })
      .select('id')
      .single();

    if (error) {
      showToast('Não foi possível criar o link de pagamento.', true);
      return;
    }

    await loadContratosData();
    renderPaymentLinksList();

    const url = buildPaymentLinkUrl(created.id);
    fieldsWrap.style.display = 'none';
    actionRow.innerHTML = `
      <div class="payment-link-result-box">
        <span class="payment-link-result-url">${escapeHtml(url)}</span>
        <button type="button" class="payment-link-result-send" id="payment-link-result-send" title="Copiar link" aria-label="Copiar link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17"><rect x="8" y="8" width="12" height="12" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>
        </button>
      </div>
    `;
    document.getElementById('payment-link-result-send').addEventListener('click', () => {
      copyTextToClipboard(url);
      showToast('Link copiado!');
    });
  });
}

/* -------------------- Contas bancárias (chave Pix dos saques) -------------------- */
document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('fin-conta-form');
  if (!form) return;
  await window.b2bAuthReady;
  const p = B2B_DATA.professional;
  const tipo = document.getElementById('fin-pix-tipo');
  const chave = document.getElementById('fin-pix-chave');
  const aceite = document.getElementById('fin-pix-aceite');
  tipo.value = p.pixKeyType || 'cpf';
  chave.value = p.pixKey || '';
  aceite.checked = !!p.pixKey;
  if (typeof wirePixKeyMaskInput === 'function') wirePixKeyMaskInput(chave, () => tipo.value);
  const msg = (t, erro) => { const el = document.getElementById('fin-conta-msg'); el.textContent = t || ''; el.hidden = !t; el.classList.toggle('is-erro', !!erro); };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const valor = chave.value.trim();
    if (!valor) return msg('Preencha a sua chave Pix.', true);
    if (!aceite.checked) return msg('Marque a confirmação para salvar.', true);
    const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
    const { error } = await supabaseClient.from('fornecedores').update({ pix_key: valor, pix_key_type: tipo.value }).eq('id', empresaId(session));
    if (error) return msg('Não foi possível salvar agora. Tente de novo.', true);
    p.pixKey = valor;
    p.pixKeyType = tipo.value;
    msg('Conta salva. Os saques vão para esta chave Pix.');
    renderFinanceStats();
  });
});
