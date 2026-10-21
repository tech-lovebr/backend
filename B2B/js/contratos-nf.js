/* ==========================================================================
   LOVE B2B — Vendas › Meus contratos › Nota fiscal por contrato
   ⋯ no fim da linha: "Emitir nota fiscal" ou, já emitida, "Ver nota fiscal"
   e "Gerar PDF (DANFE)". Contrato real grava em notas_fiscais com
   contract_id (migration 075); o contrato de exemplo (sandbox) guarda a nota
   só no navegador. Apagar CONTRATO_EXEMPLO quando os testes acabarem.
   ========================================================================== */

const CONTRATO_EXEMPLO = () => {
  const data = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  return {
    id: 'exemplo-sandbox',
    exemplo: true,
    client: 'Ana e Pedro (exemplo)',
    phone: '(11) 90000-0000',
    categoria: 'Buffet e Gastronomia',
    valorTotal: 18500,
    valorPago: 5550,
    parcelasPagas: 1,
    parcelasTotal: 3,
    status: 'em_dia',
    evento: { nome: 'Casamento Ana & Pedro', data, horario: '19:00', local: 'Espaço Jardim, São Paulo - SP', produto: 'Buffet completo' },
    convidados: [
      { id: 'exemplo-g1', nome: 'Mariana Costa', status: 'confirmado', mesa: '1', whatsapp: '(11) 90000-0001', comentarios: [] },
      { id: 'exemplo-g2', nome: 'João Lima', status: 'pendente', mesa: '', whatsapp: '', comentarios: [] }
    ]
  };
};

/* -------------------- Nota fiscal por contrato --------------------
   ⋯ no fim da linha: "Emitir nota fiscal" ou, já emitida, "Ver nota fiscal"
   e "Gerar PDF (DANFE)". Contrato real grava em notas_fiscais com
   contract_id (migration 075); o de exemplo guarda só no navegador. */
const NF_EXEMPLO_KEY = 'b2b-sandbox-notas';
let notasPorContrato = {};

function notasDoExemplo() {
  try { return JSON.parse(localStorage.getItem(NF_EXEMPLO_KEY) || '{}'); } catch (e) { return {}; }
}

async function carregarNotasDosContratos(session) {
  notasPorContrato = { ...notasDoExemplo() };
  const ids = bContratosAbertos.filter(c => !c.exemplo).map(c => c.id);
  if (!ids.length || !session) return;
  const { data, error } = await supabaseClient.from('notas_fiscais')
    .select('id, number, client, value, status, created_at, contract_id')
    .eq('fornecedor_id', empresaId(session)).in('contract_id', ids);
  if (error) return; // migration 075 ainda não rodada
  (data || []).forEach(n => { notasPorContrato[n.contract_id] = n; });
}

async function emitirNotaDoContrato(id) {
  const c = findContrato(id);
  if (!c) return;
  const numero = String(Date.now()).slice(-6);
  if (c.exemplo) {
    const notas = notasDoExemplo();
    notas[id] = { id: 'nf-' + numero, number: numero, client: c.client, value: c.valorTotal, status: 'emitida', created_at: new Date().toISOString(), contract_id: id, exemplo: true };
    localStorage.setItem(NF_EXEMPLO_KEY, JSON.stringify(notas));
    notasPorContrato[id] = notas[id];
  } else {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const { data, error } = await supabaseClient.from('notas_fiscais')
      .insert({ fornecedor_id: empresaId(session), contract_id: id, client: c.client, value: c.valorTotal, number: numero, status: 'emitida' })
      .select('id, number, client, value, status, created_at, contract_id').single();
    if (error || !data) { abrirNotaFiscal(id, 'Não foi possível emitir a nota agora. Tente de novo.'); return; }
    notasPorContrato[id] = data;
  }
  renderContratosClientes();
  abrirNotaFiscal(id);
}

const brl = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function abrirNotaFiscal(id, erro) {
  const c = findContrato(id);
  const n = notasPorContrato[id];
  const modal = document.getElementById('nf-modal');
  if (!modal || !c) return;
  const p = (typeof B2B_DATA !== 'undefined' && B2B_DATA.professional) || {};
  document.getElementById('nf-modal-corpo').innerHTML = erro
    ? `<p class="nf-erro">${escapeHtml(erro)}</p>`
    : `
      ${n && n.exemplo ? '<p class="nf-aviso">Nota de exemplo (sandbox), sem valor fiscal.</p>' : ''}
      <dl class="nf-dados">
        <div><dt>Número</dt><dd>${escapeHtml(n.number || '—')}</dd></div>
        <div><dt>Emitida em</dt><dd>${new Date(n.created_at).toLocaleDateString('pt-BR')}</dd></div>
        <div><dt>Emitente</dt><dd>${escapeHtml(p.company || '—')}</dd></div>
        <div><dt>Tomador</dt><dd>${escapeHtml(c.client)}</dd></div>
        <div><dt>Serviço</dt><dd>${escapeHtml(produtoDoContrato(c) || c.categoria || '—')}</dd></div>
        <div><dt>Valor</dt><dd>${brl(n.value)}</dd></div>
      </dl>
      <button type="button" class="btn-primary nf-pdf-btn" data-nf-pdf="${escapeHtml(id)}">Gerar PDF (DANFE)</button>`;
  modal.classList.add('show');
}

/* PDF (DANFE): abre o documento numa janela de impressão — "Salvar como PDF".
   É um espelho da nota para conferência; a nota oficial vem da prefeitura/SEFAZ. */
function gerarPdfDanfe(id) {
  const c = findContrato(id);
  const n = notasPorContrato[id];
  if (!c || !n) return;
  const p = (typeof B2B_DATA !== 'undefined' && B2B_DATA.professional) || {};
  const esc = escapeHtml;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>DANFE ${esc(n.number || '')}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:32px;font-size:12px}
  .box{border:1px solid #111;padding:10px 12px;margin-bottom:-1px}
  h1{font-size:16px;margin:0 0 4px} .row{display:flex;gap:24px;flex-wrap:wrap}
  .lbl{font-size:9px;text-transform:uppercase;color:#555;display:block} .val{font-size:13px;font-weight:bold}
  .aviso{margin-top:16px;font-size:11px;color:#a00}
  table{width:100%;border-collapse:collapse;margin-top:8px} td,th{border:1px solid #111;padding:6px;text-align:left}
</style></head><body>
<div class="box"><h1>DANFE — Documento Auxiliar da Nota Fiscal</h1><div class="row">
  <div><span class="lbl">Número</span><span class="val">${esc(n.number || '—')}</span></div>
  <div><span class="lbl">Emissão</span><span class="val">${new Date(n.created_at).toLocaleDateString('pt-BR')}</span></div>
  <div><span class="lbl">Situação</span><span class="val">${n.status === 'emitida' ? 'Emitida' : esc(n.status || '')}</span></div>
</div></div>
<div class="box"><span class="lbl">Emitente</span><span class="val">${esc(p.company || '—')}</span><br><span class="lbl">CNPJ/CPF</span>${esc(p.documentNumber || '—')}</div>
<div class="box"><span class="lbl">Tomador do serviço</span><span class="val">${esc(c.client)}</span></div>
<table><thead><tr><th>Descrição do serviço</th><th>Data do evento</th><th>Valor</th></tr></thead>
<tbody><tr><td>${esc(produtoDoContrato(c) || c.categoria || 'Serviço')} — ${esc((c.evento && c.evento.nome) || '')}</td><td>${esc(dataCurtaDoEvento(c.evento && c.evento.data))}</td><td>${brl(n.value)}</td></tr></tbody></table>
<p class="aviso">${n.exemplo ? 'Documento de exemplo (sandbox), sem valor fiscal.' : 'Espelho para conferência. A nota oficial é a emitida no portal da prefeitura/SEFAZ.'}</p>
<script>window.onload=function(){window.print();}</script>
</body></html>`);
  w.document.close();
}

function nfMenuHtml(c) {
  const n = notasPorContrato[c.id];
  return `
    <td class="tabela-col-acoes">
      <div class="contrato-menu-wrap">
        <button type="button" class="tabela-ver-mais" data-contrato-menu="${escapeHtml(c.id)}" title="Mais opções" aria-label="Mais opções">${typeof TABELA_ICONE_VER_MAIS !== 'undefined' ? TABELA_ICONE_VER_MAIS : '⋯'}</button>
        <div class="op-menu contrato-menu" data-contrato-menu-lista="${escapeHtml(c.id)}" hidden>
          <button type="button" data-contrato-acao="detalhes" data-id="${escapeHtml(c.id)}">Ver detalhes</button>
          ${n
            ? `<button type="button" data-contrato-acao="ver-nf" data-id="${escapeHtml(c.id)}">Ver nota fiscal</button>
               <button type="button" data-contrato-acao="pdf-nf" data-id="${escapeHtml(c.id)}">Gerar PDF (DANFE)</button>`
            : `<button type="button" data-contrato-acao="emitir-nf" data-id="${escapeHtml(c.id)}">Emitir nota fiscal</button>`}
        </div>
      </div>
    </td>`;
}

document.addEventListener('click', (e) => {
  const menuBtn = e.target.closest('[data-contrato-menu]');
  const acao = e.target.closest('[data-contrato-acao]');
  const listas = document.querySelectorAll('[data-contrato-menu-lista]');
  if (menuBtn) {
    e.stopPropagation();
    const lista = document.querySelector(`[data-contrato-menu-lista="${menuBtn.dataset.contratoMenu}"]`);
    const abrir = lista && lista.hidden;
    listas.forEach(l => { l.hidden = true; });
    if (lista) lista.hidden = !abrir;
    return;
  }
  if (acao) {
    e.stopPropagation();
    listas.forEach(l => { l.hidden = true; });
    const id = acao.dataset.id;
    if (acao.dataset.contratoAcao === 'detalhes') selectContrato(id);
    else if (acao.dataset.contratoAcao === 'emitir-nf') emitirNotaDoContrato(id);
    else if (acao.dataset.contratoAcao === 'ver-nf') abrirNotaFiscal(id);
    else if (acao.dataset.contratoAcao === 'pdf-nf') gerarPdfDanfe(id);
    return;
  }
  const pdf = e.target.closest('[data-nf-pdf]');
  if (pdf) { gerarPdfDanfe(pdf.dataset.nfPdf); return; }
  if (e.target.closest('[data-nf-fechar]') || e.target.id === 'nf-modal') { document.getElementById('nf-modal')?.classList.remove('show'); return; }
  listas.forEach(l => { l.hidden = true; });
}, true);
