/* ==========================================================================
   LOVE ADMIN — Operacional › Gateways
   Gateways de pagamento: qual é o principal, quais estão em contingência,
   se estão configurados e respondendo, as contas digitais abertas para os
   anfitriões e as taxas que o gateway cobrou da Love mês a mês.
   Dados do servidor: api/gateways.js (nunca mostra chave, só se existe).
   ========================================================================== */

const API_GATEWAYS = 'https://love.com.br/api/gateways';

const PAPEL = {
  principal: ['Principal', 'badge-success'],
  contingencia: ['Contingência', 'badge-info'],
  desligado: ['Desligado', '']
};
const CONEXAO = {
  ok: ['Conectado', 'badge-success'],
  erro: ['Erro', 'badge-warning'],
  nao_conectado: ['Não conectado', '']
};
const STATUS_CONTA = {
  criando: 'Criando', documentos: 'Aguardando documentos', em_analise: 'Em análise',
  aprovada: 'Aprovada', recusada: 'Recusada', erro: 'Com erro'
};
const TIPO_TAXA = {
  PAYMENT_FEE: 'Taxa de cobrança',
  TRANSFER_FEE: 'Taxa de transferência',
  NOTIFICATION_FEE: 'Taxa de notificação',
  ANTICIPATION_FEE: 'Taxa de antecipação',
  PIX_TRANSACTION_DEBIT_FEE: 'Taxa de Pix',
  BILL_PAYMENT_FEE: 'Taxa de pagamento de conta',
  OUTRA_TAXA: 'Outra taxa'
};
const nomeDaTaxa = tipo => TIPO_TAXA[tipo] || String(tipo).toLowerCase().replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());

let DADOS = null;
let CONTAS = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;
  addHeaderAction('Atualizar', () => carregar(), {
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" /><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" /></svg>'
  });
  await carregar();
});

async function carregar() {
  const kpis = document.getElementById('kpi-grid');
  const corpo = document.getElementById('gateways-corpo');
  kpis.innerHTML = '<div class="kpi"><p class="kpi-label">Carregando…</p></div>';
  corpo.innerHTML = '';
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const [r, contas] = await Promise.all([
      fetch(API_GATEWAYS, { headers: { Authorization: `Bearer ${session?.access_token || ''}` }, cache: 'no-store' }),
      safeSelect('contas_recebimento', 'status, created_at')
    ]);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
    DADOS = j;
    CONTAS = contas.error ? [] : (contas.data || []);
    render();
  } catch (e) {
    kpis.innerHTML = '';
    corpo.innerHTML = `
      <section class="card"><div class="card-body"><div class="empty-state">
        <strong>Não foi possível ler os gateways</strong>
        <p>${escapeHtml(String(e.message || e))}</p>
      </div></div></section>`;
  }
}

const reais = v => formatCurrency(Number(v) || 0);
const nomeDoMesCurto = mes => {
  const [a, m] = mes.split('-').map(Number);
  const nome = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${a}`;
};

function render() {
  const { gateways, meses } = DADOS;
  const principal = gateways.find(g => g.papel === 'principal');
  const contingencia = gateways.filter(g => g.papel === 'contingencia');
  const mesAtual = meses[meses.length - 1];
  const asaas = gateways.find(g => g.id === 'asaas');
  const taxas = asaas && asaas.taxas && !asaas.taxas.erro ? asaas.taxas : null;
  const sandbox = asaas && asaas.ambiente === 'sandbox';
  const doMes = taxas ? taxas.meses[mesAtual] || 0 : null;
  const aprovadas = CONTAS.filter(c => c.status === 'aprovada').length;

  const tile = (rotulo, valor, sub) => `
    <div class="kpi"><p class="kpi-label">${escapeHtml(rotulo)}</p><p class="kpi-value">${valor}</p><p class="kpi-sub">${sub}</p></div>`;
  document.getElementById('kpi-grid').innerHTML = [
    tile('Gateway principal', escapeHtml(principal ? principal.nome : 'Nenhum'), principal ? escapeHtml(principal.ambiente === 'sandbox' ? 'Sandbox (teste)' : 'Produção') : 'Nenhum ligado'),
    tile('Em contingência', contingencia.length ? escapeHtml(contingencia.map(g => g.nome).join(', ')) : 'Nenhum', contingencia.length ? 'Assumem se o principal falhar' : 'Só o principal está integrado'),
    tile('Contas digitais', formatNumber(CONTAS.length), `${formatNumber(aprovadas)} aprovada${aprovadas === 1 ? '' : 's'}`),
    tile('Taxas no mês', doMes == null ? '—' : reais(doMes), sandbox ? 'Sandbox: valores de teste' : 'Cobradas da conta da Love')
  ].join('');

  const linhas = gateways
    .sort((a, b) => (a.ordem < 0 ? 99 : a.ordem) - (b.ordem < 0 ? 99 : b.ordem))
    .map(g => {
      const [papel, classePapel] = PAPEL[g.papel] || PAPEL.desligado;
      const [conexao, classeConexao] = CONEXAO[g.conexao] || CONEXAO.nao_conectado;
      const c = g.configuracao || {};
      const falta = [!c.chave && 'chave da API', !c.webhook && 'token do webhook', !c.cifra && 'chave de cifra'].filter(Boolean);
      return `
        <tr class="no-hover">
          <td class="cell-strong">${escapeHtml(g.nome)}</td>
          <td>${badge(papel, classePapel)}</td>
          <td>${g.ambiente ? escapeHtml(g.ambiente === 'sandbox' ? 'Sandbox' : 'Produção') : '<span class="cell-muted">—</span>'}</td>
          <td><span title="${escapeHtml(g.erro || '')}">${badge(conexao, classeConexao)}</span></td>
          <td>${g.saldo == null ? '<span class="cell-muted">—</span>' : `<span class="valor-dinheiro">${reais(g.saldo)}</span>`}</td>
          <td>${falta.length ? `<span class="cell-muted">Falta ${escapeHtml(falta.join(', '))}</span>` : 'Completa'}</td>
        </tr>`;
    }).join('');

  const avisoContingencia = contingencia.length ? '' : `
    <p class="gateways-nota">Nenhum gateway de contingência ligado. Hoje só o Asaas está integrado; um gateway novo entra como adaptador em <code class="dados-id">api/_gateway-&lt;nome&gt;.js</code> e é ligado em <code class="dados-id">GATEWAYS_ATIVOS</code> na Vercel (o primeiro da lista é o principal).</p>`;

  const contasPorStatus = Object.entries(CONTAS.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {}))
    .sort((a, b) => b[1] - a[1])
    .map(([s, n]) => `<tr class="no-hover"><td>${escapeHtml(STATUS_CONTA[s] || s)}</td><td class="col-numero">${formatNumber(n)}</td></tr>`).join('');

  let blocoTaxas;
  if (!asaas || asaas.conexao === 'nao_conectado') {
    blocoTaxas = '<p class="gateways-nota">Asaas sem chave da API configurada na Vercel (ASAAS_API_KEY).</p>';
  } else if (!taxas) {
    blocoTaxas = `<p class="gateways-nota">Não foi possível ler o extrato do Asaas${asaas.taxas?.erro ? `: ${escapeHtml(asaas.taxas.erro)}` : ''}.</p>`;
  } else {
    const comValor = meses.slice().reverse().filter(m => taxas.meses[m] > 0);
    const tiposDoMes = Object.entries(taxas.por_tipo[mesAtual] || {}).sort((a, b) => b[1] - a[1]);
    blocoTaxas = `
      ${sandbox ? '<p class="gateways-nota">Sandbox: as taxas abaixo são de teste e não entram em Custos.</p>' : ''}
      ${taxas.truncado ? '<p class="gateways-nota">O extrato tem mais lançamentos do que dá para ler de uma vez; os meses mais antigos podem estar incompletos.</p>' : ''}
      <div class="table-wrap"><table class="data"><thead><tr><th>Mês</th><th>Taxas cobradas</th></tr></thead><tbody>
        ${comValor.length
          ? comValor.map(m => `<tr class="no-hover"><td>${escapeHtml(nomeDoMesCurto(m))}</td><td class="valor-dinheiro">${reais(taxas.meses[m])}</td></tr>`).join('')
          : '<tr class="no-hover"><td colspan="2" class="cell-muted">Nenhuma taxa cobrada nos últimos 12 meses.</td></tr>'}
      </tbody></table></div>
      ${tiposDoMes.length ? `
        <div class="table-wrap"><table class="data"><thead><tr><th>Neste mês, por tipo</th><th>Valor</th></tr></thead><tbody>
          ${tiposDoMes.map(([tipo, v]) => `<tr class="no-hover"><td>${escapeHtml(nomeDaTaxa(tipo))}</td><td class="valor-dinheiro">${reais(v)}</td></tr>`).join('')}
        </tbody></table></div>` : ''}`;
  }

  document.getElementById('gateways-corpo').innerHTML = `
    <section class="card table-card gateways-bloco">
      <div class="card-head"><h2>Gateways</h2><p>O principal recebe os pagamentos; os de contingência assumem se ele falhar.</p></div>
      <div class="table-wrap"><table class="data">
        <thead><tr><th>Gateway</th><th>Papel</th><th>Ambiente</th><th>Conexão</th><th>Saldo da Love</th><th>Configuração</th></tr></thead>
        <tbody>${linhas || '<tr class="no-hover"><td colspan="6" class="cell-muted">Nenhum gateway integrado.</td></tr>'}</tbody>
      </table></div>
      ${avisoContingencia}
    </section>

    <section class="card table-card gateways-bloco">
      <div class="card-head"><h2>Custos do Asaas</h2><p>Taxas que o Asaas lançou no extrato da conta da Love (cobranças, Pix, transferências, abertura de contas). Sem mensalidade fixa lançada no extrato, nada aparece como custo mensal.</p></div>
      ${blocoTaxas}
    </section>

    <section class="card table-card gateways-bloco">
      <div class="card-head"><h2>Contas digitais dos anfitriões</h2><p>Subcontas abertas no Asaas para receber os presentes.</p></div>
      <div class="table-wrap"><table class="data"><thead><tr><th>Situação</th><th class="col-numero">Contas</th></tr></thead><tbody>
        ${contasPorStatus || '<tr class="no-hover"><td colspan="2" class="cell-muted">Nenhuma conta digital aberta ainda.</td></tr>'}
      </tbody></table></div>
    </section>`;
}
