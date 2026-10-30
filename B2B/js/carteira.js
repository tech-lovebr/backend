/* ==========================================================================
   LOVE B2B — Carteira (Saldo / Faturamento) em Financeiro.
   Era o card do Dashboard; mudou para Financeiro igualzinho.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  if (!document.querySelector('.wallet-card')) return;
  await window.b2bAuthReady;
  await renderMetricsOverview();
  initWalletTabs();
  initWalletPeriodo();
  initWalletEyeToggle();
});

let walletBalanceVisible = true;
let walletFinData = {};

/* -------------------- Período do Faturamento --------------------
   Botão no canto do card Saldo/Faturamento: atalhos (1, 7, 15 e 30 dias) e
   calendário de dois meses para um período personalizado. O faturamento
   soma os créditos do período; a comparação é com o período anterior de
   mesmo tamanho. Padrão: últimos 30 dias (até hoje). */
let walletTransacoes = [];
const DIA_MS = 24 * 60 * 60 * 1000;
const inicioDoDia = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
let walletPeriodo = (() => { const fim = inicioDoDia(new Date()); return { inicio: new Date(fim.getTime() - 29 * DIA_MS), fim, dias: 30 }; })();

function faturamentoNoPeriodo() {
  const ini = walletPeriodo.inicio.getTime();
  const fim = walletPeriodo.fim.getTime() + DIA_MS; // fim do dia
  const tam = fim - ini;
  const soma = (a, b) => walletTransacoes
    .filter(t => t.type === 'credit')
    .filter(t => { const x = new Date(t.created_at).getTime(); return x >= a && x < b; })
    .reduce((s, t) => s + Number(t.amount), 0);
  return { atual: soma(ini, fim), anterior: soma(ini - tam, ini) };
}

function rotuloDoPeriodo(p) {
  if (p.dias === 1) return 'Hoje';
  if (p.dias) return `Últimos ${p.dias} dias`;
  const f = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return p.inicio.getTime() === p.fim.getTime() ? f(p.inicio) : `${f(p.inicio)} – ${f(p.fim)}`;
}

function aplicarPeriodoNoFaturamento() {
  const fat = faturamentoNoPeriodo();
  walletFinData.faturamentoEsteMes = fat.atual;
  walletFinData.faturamentoMesPassado = fat.anterior;
  const el = document.getElementById('wallet-faturamento-value');
  if (el) el.dataset.value = fat.atual || 0;
  setText('wallet-periodo-rotulo', rotuloDoPeriodo(walletPeriodo));
  renderWalletAmounts();
}

function initWalletPeriodo() {
  const btn = document.getElementById('wallet-periodo-btn');
  const menu = document.getElementById('wallet-periodo-menu');
  const cal = document.getElementById('wallet-periodo-cal');
  if (!btn || !menu || !cal) return;
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  let rascunho = null;      // { inicio, fim, dias }
  let escolhendoFim = false;
  let mesBase = null;       // 1º dia do mês da esquerda

  const mesmoDia = (a, b) => a && b && a.getTime() === b.getTime();
  const desenharMes = (ano, mes) => {
    const primeiro = new Date(ano, mes, 1);
    const inicioGrade = new Date(ano, mes, 1 - primeiro.getDay());
    const hoje = inicioDoDia(new Date());
    let html = `<div class="wp-mes"><p class="wp-mes-titulo">${MESES[mes]} ${ano}</p><div class="wp-grade">${SEMANA.map(s => `<span class="wp-sem">${s}</span>`).join('')}`;
    for (let i = 0; i < 42; i++) {
      const d = new Date(inicioGrade.getFullYear(), inicioGrade.getMonth(), inicioGrade.getDate() + i);
      if (i >= 35 && d.getMonth() !== mes) break;
      const fora = d.getMonth() !== mes;
      const ini = rascunho && mesmoDia(d, rascunho.inicio);
      const fim = rascunho && mesmoDia(d, rascunho.fim);
      const dentro = rascunho && rascunho.fim && d > rascunho.inicio && d < rascunho.fim;
      const classes = ['wp-dia', fora ? 'is-fora' : '', dentro ? 'is-dentro' : '', (ini || fim) ? 'is-ponta' : '', mesmoDia(d, hoje) ? 'is-hoje' : '', d > hoje ? 'is-futuro' : ''].filter(Boolean).join(' ');
      html += `<button type="button" class="${classes}" data-dia="${d.getTime()}"${d > hoje ? ' disabled' : ''}>${d.getDate()}</button>`;
    }
    return html + '</div></div>';
  };
  const desenhar = () => {
    const esq = mesBase;
    const dir = new Date(esq.getFullYear(), esq.getMonth() + 1, 1);
    cal.innerHTML = `
      <button type="button" class="wp-nav wp-nav-ant" data-nav="-1" aria-label="Mês anterior"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="m15 18-6-6 6-6"/></svg></button>
      <button type="button" class="wp-nav wp-nav-prox" data-nav="1" aria-label="Próximo mês"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="m9 6 6 6-6 6"/></svg></button>
      ${desenharMes(esq.getFullYear(), esq.getMonth())}${desenharMes(dir.getFullYear(), dir.getMonth())}`;
    menu.querySelectorAll('[data-periodo-dias]').forEach(b => b.classList.toggle('is-ativo', !!rascunho && rascunho.dias === Number(b.dataset.periodoDias)));
  };
  const abrir = () => {
    rascunho = { ...walletPeriodo };
    escolhendoFim = false;
    const hoje = inicioDoDia(new Date());
    mesBase = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1); // mês passado + este mês
    desenhar();
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
  };
  const fechar = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };

  btn.addEventListener('click', (e) => { e.stopPropagation(); if (menu.hidden) abrir(); else fechar(); });
  menu.addEventListener('click', (e) => {
    e.stopPropagation();
    const nav = e.target.closest('[data-nav]');
    if (nav) { mesBase = new Date(mesBase.getFullYear(), mesBase.getMonth() + Number(nav.dataset.nav), 1); desenhar(); return; }
    const atalho = e.target.closest('[data-periodo-dias]');
    if (atalho) {
      const dias = Number(atalho.dataset.periodoDias);
      const fim = inicioDoDia(new Date());
      rascunho = { inicio: new Date(fim.getTime() - (dias - 1) * DIA_MS), fim, dias };
      escolhendoFim = false;
      desenhar();
      return;
    }
    const dia = e.target.closest('[data-dia]');
    if (dia && !dia.disabled) {
      const d = new Date(Number(dia.dataset.dia));
      if (!escolhendoFim || !rascunho || d < rascunho.inicio) {
        rascunho = { inicio: d, fim: d, dias: null };
        escolhendoFim = true;
      } else {
        rascunho = { inicio: rascunho.inicio, fim: d, dias: null };
        escolhendoFim = false;
      }
      desenhar();
    }
  });
  document.getElementById('wallet-periodo-cancelar')?.addEventListener('click', fechar);
  document.getElementById('wallet-periodo-aplicar')?.addEventListener('click', () => {
    if (rascunho) walletPeriodo = { ...rascunho, fim: rascunho.fim || rascunho.inicio };
    fechar();
    aplicarPeriodoNoFaturamento();
    // Mostra o Faturamento (é ele que muda com o período).
    document.querySelector('#wallet-tabs [data-wallet-tab="faturamento"]')?.click();
  });
  document.addEventListener('click', (e) => { if (!menu.hidden && !e.target.closest('#wallet-periodo')) fechar(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) fechar(); });
  setText('wallet-periodo-rotulo', rotuloDoPeriodo(walletPeriodo));
}

async function renderMetricsOverview() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  let transactions = [];
  let pendingLinksTotal = 0;

  if (session) {
    const [txRes, linksRes] = await Promise.all([
      supabaseClient.from('wallet_transactions').select('type, amount, created_at').eq('fornecedor_id', empresaId(session)),
      supabaseClient.from('payment_links').select('amount, status').eq('fornecedor_id', empresaId(session)).eq('status', 'pendente')
    ]);
    transactions = txRes.data || [];
    pendingLinksTotal = (linksRes.data || []).reduce((sum, l) => sum + Number(l.amount), 0);
  }

  const saqueDisponivel = transactions.reduce((sum, t) => sum + (t.type === 'credit' ? Number(t.amount) : -Number(t.amount)), 0);

  const faturamentoPorMes = (monthsAgo) => {
    const now = new Date();
    const targetMonth = now.getMonth() - monthsAgo;
    const targetYear = now.getFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    return transactions
      .filter(t => t.type === 'credit')
      .filter(t => { const d = new Date(t.created_at); return d.getMonth() === normalizedMonth && d.getFullYear() === targetYear; })
      .reduce((sum, t) => sum + Number(t.amount), 0);
  };

  walletTransacoes = transactions;
  const fat = faturamentoNoPeriodo();
  const fin = {
    saqueDisponivel,
    faturamentoEsteMes: fat.atual,
    faturamentoMesPassado: fat.anterior,
    valorEmAberto: pendingLinksTotal
  };
  walletFinData = fin;

  const saldoEl = document.getElementById('wallet-saldo-value');
  const faturamentoEl = document.getElementById('wallet-faturamento-value');

  if (saldoEl) saldoEl.dataset.value = fin.saqueDisponivel || 0;
  if (faturamentoEl) faturamentoEl.dataset.value = fin.faturamentoEsteMes || 0;

  renderWalletAmounts();
}

function renderWalletAmounts() {
  ['wallet-saldo-value', 'wallet-faturamento-value'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = walletBalanceVisible
      ? formatCurrencySuperscript(Number(el.dataset.value || 0))
      : 'R$ ****';
  });

  document.querySelectorAll('.wallet-eye-btn').forEach(btn => {
    btn.classList.toggle('is-hidden', !walletBalanceVisible);
  });

  setText('wallet-saldo-pendente', walletBalanceVisible ? formatCurrency(walletFinData.valorEmAberto || 0) : '****');
  setText('wallet-faturamento-anterior', walletBalanceVisible ? formatCurrency(walletFinData.faturamentoMesPassado || 0) : '****');

  const deltaEl = document.getElementById('wallet-faturamento-delta');
  if (deltaEl) {
    if (!walletBalanceVisible) {
      deltaEl.textContent = '';
      deltaEl.className = '';
    } else {
      const anterior = walletFinData.faturamentoMesPassado || 0;
      const atual = walletFinData.faturamentoEsteMes || 0;
      if (anterior > 0) {
        const pct = ((atual - anterior) / anterior) * 100;
        const up = pct >= 0;
        deltaEl.textContent = `(${up ? '+' : ''}${pct.toFixed(1)}%)`;
        deltaEl.className = `metric-delta ${up ? 'up' : 'down'}`;
      } else {
        deltaEl.textContent = '';
        deltaEl.className = '';
      }
    }
  }
}

function initWalletTabs() {
  const wrap = document.getElementById('wallet-tabs');
  if (!wrap) return;
  wrap.querySelectorAll('[data-wallet-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('[data-wallet-tab]').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('[data-wallet-panel]').forEach(panel => {
        panel.hidden = panel.dataset.walletPanel !== btn.dataset.walletTab;
      });
    });
  });
}

function initWalletEyeToggle() {
  document.querySelectorAll('.wallet-eye-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      walletBalanceVisible = !walletBalanceVisible;
      renderWalletAmounts();
    });
  });
}

