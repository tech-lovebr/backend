/* ==========================================================================
   LOVE B2B — Clientes › página do cliente (no lugar da gaveta).
   Clicar no nome do cliente abre, na própria página, tudo sobre ele e os
   serviços que contratou (modelo "Contract details" do Upwork):
   - Esquerda: serviço contratado (descrição do pedido e o que está incluso),
     resumo (valor, pago, falta pagar, data, local…), pagamentos, entregas e
     o progresso do serviço (texto + fotos, que o anfitrião também vê).
   - Direita: o cliente (contato e "Abrir conversa"), o pagamento e o evento.
   Contrato = proposta aceita (migrations 074/079) + parcelas, entregas e
   atualizações (migration 096). ?cliente=<lead> mantém a página no F5.
   ========================================================================== */

let cliLead = null;
let cliContratos = [];
let cliContratoAtivo = null;
let cliConversaId = null;
let cliClienteInfo = null;

const cliBRL = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const cliData = iso => {
  if (!iso) return '—';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(iso + 'T00:00:00') : new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '') : '—';
};
const cliIcone = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const CLI_CONVIDADOS = { 'ate-50': 'Até 50', '50-100': '50 a 100', '100-200': '100 a 200', '200-mais': '200+' };
const CLI_PERIODOS = { diurno: 'Diurno', noturno: 'Noturno', dia_inteiro: 'Dia inteiro' };
const CLI_CELEBRACOES = { casamento: 'Casamento', aniversario: 'Aniversário', bodas: 'Bodas', noivado: 'Noivado', formatura: 'Formatura', corporativo: 'Evento corporativo' };

/* -------------------- Dados -------------------- */

async function cliCarregar(lead) {
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  const empresa = empresaId(session);
  cliContratos = [];
  cliConversaId = null;
  cliClienteInfo = null;
  if (!lead.cliente_id) return;

  const [cliRes, propRes, convRes] = await Promise.all([
    supabaseClient.from('clientes').select('id, full_name, first_name, last_name, couple_name, email, phone, city, avatar_url, created_at').eq('id', lead.cliente_id).maybeSingle(),
    supabaseClient.from('propostas_pedido')
      .select('id, valor, inclui, mensagem, status, produto_id, conversation_id, created_at, updated_at, pedido:pedidos_orcamento(id, titulo, categoria, descricao, tipo_celebracao, data_evento, data_flexivel, cidade, bairro, uf, convidados, periodo, horas_servico, cliente_id)')
      .eq('fornecedor_id', empresa).eq('status', 'aceita').order('updated_at', { ascending: false }),
    supabaseClient.from('conversations').select('id').eq('fornecedor_id', empresa).eq('cliente_id', lead.cliente_id).maybeSingle()
  ]);
  cliClienteInfo = cliRes.data || null;
  cliConversaId = (convRes.data && convRes.data.id) || null;
  const propostas = (propRes.data || []).filter(pr => pr.pedido && pr.pedido.cliente_id === lead.cliente_id);
  if (!propostas.length) return;

  const ids = propostas.map(p => p.id);
  const produtosIds = [...new Set(propostas.map(p => p.produto_id).filter(Boolean))];
  const [parc, entr, atu, prods] = await Promise.all([
    supabaseClient.from('contrato_parcelas').select('*').in('proposta_id', ids).order('ordem'),
    supabaseClient.from('contrato_entregas').select('*').in('proposta_id', ids).order('ordem'),
    supabaseClient.from('contrato_atualizacoes').select('*').in('proposta_id', ids).order('created_at', { ascending: false }),
    produtosIds.length ? supabaseClient.from('products').select('id, name').in('id', produtosIds) : Promise.resolve({ data: [] })
  ]);
  const nomeProduto = Object.fromEntries((prods.data || []).map(p => [p.id, p.name]));
  cliContratos = propostas.map(p => ({
    ...p,
    produtoNome: nomeProduto[p.produto_id] || '',
    parcelas: (parc.data || []).filter(x => x.proposta_id === p.id),
    entregas: (entr.data || []).filter(x => x.proposta_id === p.id),
    atualizacoes: (atu.data || []).filter(x => x.proposta_id === p.id)
  }));
  if (!cliConversaId) cliConversaId = (propostas.find(p => p.conversation_id) || {}).conversation_id || null;
}

function cliTotais(c) {
  const total = c.parcelas.length ? c.parcelas.reduce((s, x) => s + Number(x.valor || 0), 0) : Number(c.valor || 0);
  const pago = c.parcelas.filter(x => x.status === 'paga').reduce((s, x) => s + Number(x.valor || 0), 0);
  return { total, pago, falta: Math.max(0, total - pago) };
}

/* -------------------- Desenho -------------------- */

function cliNome() {
  const c = cliClienteInfo;
  return (c && String(c.full_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || c.couple_name || '').trim()) || cliLead.name || 'Cliente';
}

function cliRender() {
  const corpo = document.getElementById('cli-corpo');
  const lead = cliLead;
  const c = cliContratoAtivo;
  const info = cliClienteInfo || {};
  const nome = cliNome();
  const iniciais = nome.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0].toUpperCase()).join('');
  const conversaUrl = cliConversaId ? `chat?conversa=${encodeURIComponent(cliConversaId)}` : 'chat';

  const lateralCliente = `
    <div class="op-analise-card cli-card-cliente">
      <div class="op-analise-pessoa">
        <span class="op-analise-avatar">${info.avatar_url ? `<img src="${escapeHtml(info.avatar_url)}" alt="">` : escapeHtml(iniciais || 'C')}</span>
        <b>${escapeHtml(nome)}</b>
      </div>
      <ul class="op-analise-fatos">
        ${(info.email || lead.email) ? `<li>${cliIcone('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>')}${escapeHtml(info.email || lead.email)}</li>` : ''}
        ${(info.phone || lead.whatsapp) ? `<li>${cliIcone('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>')}${escapeHtml(info.phone || lead.whatsapp)}</li>` : ''}
        ${(info.city || lead.cidade) ? `<li>${cliIcone('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>')}${escapeHtml([info.city || lead.cidade, lead.estado].filter(Boolean).join(' - '))}</li>` : ''}
        ${info.created_at ? `<li>${cliIcone('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>')}Na Love desde ${escapeHtml(new Date(info.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))}</li>` : ''}
      </ul>
      <div class="cli-acoes">
        <a href="${conversaUrl}" class="btn-primary cli-btn">Abrir conversa</a>
        <button type="button" class="btn-secondary cli-btn" data-cli-editar>Editar dados</button>
      </div>
    </div>`;

  if (!c) {
    corpo.innerHTML = `
      <div class="op-analise">
        <div class="op-analise-principal">
          <section class="op-analise-sec cli-primeira">
            <h4 class="op-analise-sub">Serviços contratados</h4>
            <p class="op-analise-desc cli-vazio">${escapeHtml(nome)} ainda não contratou nenhum serviço pela Love. Quando aceitar uma proposta sua, o contrato aparece aqui.</p>
          </section>
          <section class="op-analise-sec">
            <h4 class="op-analise-sub">Resumo</h4>
            <dl class="cli-resumo">
              ${[['Produto/serviço', lead.event_name], ['Tipo do evento', lead.tipo_evento], ['Data do evento', lead.event_date ? cliData(lead.event_date) : ''], ['Orçamento', lead.value ? cliBRL(lead.value) : '']]
                .filter(([, v]) => v).map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join('') || '<div><dt>—</dt><dd></dd></div>'}
            </dl>
          </section>
        </div>
        <aside class="op-analise-lateral">${lateralCliente}</aside>
      </div>`;
    return;
  }

  const p = c.pedido || {};
  const t = cliTotais(c);
  const pct = t.total ? Math.round((t.pago / t.total) * 100) : 0;
  const local = [[p.cidade, p.uf].filter(Boolean).join(' - '), p.bairro].filter(Boolean).join(' · ') || '—';
  const periodo = p.periodo === 'horas' ? `${p.horas_servico || '?'} horas de serviço` : (CLI_PERIODOS[p.periodo] || '—');
  const dataEvento = p.data_flexivel || !p.data_evento ? 'Data flexível' : cliData(p.data_evento);
  const titulo = c.produtoNome || p.titulo || 'Serviço';

  corpo.innerHTML = `
    ${cliContratos.length > 1 ? `<div class="cli-servicos">${cliContratos.map(x => `<button type="button" class="op-chip${x.id === c.id ? ' is-ativo' : ''}" data-cli-contrato="${escapeHtml(x.id)}">${escapeHtml(x.produtoNome || (x.pedido && x.pedido.titulo) || 'Serviço')}</button>`).join('')}</div>` : ''}
    <div class="op-analise">
      <div class="op-analise-principal">
        <header class="op-analise-cabeca">
          <h3 class="op-analise-titulo">${escapeHtml(titulo)}</h3>
          <p class="op-analise-meta">
            <span class="op-analise-badge">Contratado</span>
            <span>Desde ${escapeHtml(cliData(c.updated_at || c.created_at))}</span>
          </p>
        </header>

        <section class="op-analise-sec">
          <h4 class="op-analise-sub">Descrição</h4>
          <p class="op-analise-desc">${escapeHtml(String(p.descricao || '').trim() || 'Sem descrição.')}</p>
          ${c.inclui ? `<h4 class="op-analise-sub cli-sub-2">O que está incluso</h4><p class="op-analise-desc">${escapeHtml(c.inclui)}</p>` : ''}
          <div class="cli-links">
            ${p.id ? `<a href="crm?pedido=${encodeURIComponent(p.id)}">Ver solicitação</a>` : ''}
            <a href="${conversaUrl}">Abrir conversa com ${escapeHtml(nome.split(' ')[0])}</a>
          </div>
        </section>

        <section class="op-analise-sec">
          <h4 class="op-analise-sub">Resumo</h4>
          <dl class="cli-resumo">
            <div><dt>Produto/serviço</dt><dd>${escapeHtml(titulo)}</dd></div>
            <div><dt>Valor do contrato</dt><dd>${cliBRL(t.total)}</dd></div>
            <div><dt>Pago</dt><dd>${cliBRL(t.pago)}</dd></div>
            <div><dt>Falta pagar</dt><dd>${cliBRL(t.falta)}</dd></div>
            <div><dt>Data do evento</dt><dd>${escapeHtml(dataEvento)}</dd></div>
            <div><dt>Contratado em</dt><dd>${escapeHtml(cliData(c.updated_at || c.created_at))}</dd></div>
          </dl>
        </section>

        <section class="op-analise-sec">
          <h4 class="op-analise-sub">Pagamentos</h4>
          ${c.parcelas.length ? `<table class="leads-table w-full cli-tabela"><thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Situação</th></tr></thead><tbody>
            ${c.parcelas.map(x => `<tr><td>${escapeHtml(x.titulo)}</td><td>${escapeHtml(cliData(x.vencimento))}</td><td class="finance-valor">${cliBRL(x.valor)}</td><td><span class="cli-situacao ${x.status === 'paga' ? 'is-paga' : ''}">${x.status === 'paga' ? 'Paga' : 'Pendente'}</span></td></tr>`).join('')}
          </tbody></table>` : '<p class="op-analise-desc cli-vazio">Nenhuma parcela ainda.</p>'}
        </section>

        <section class="op-analise-sec">
          <h4 class="op-analise-sub">Entregas</h4>
          ${c.entregas.length ? `<ul class="cli-entregas">${c.entregas.map(x => `
            <li><label><input type="checkbox" data-cli-entrega="${escapeHtml(x.id)}"${x.concluida ? ' checked' : ''}> <span>${escapeHtml(x.titulo)}</span></label><span class="cli-entrega-data">${escapeHtml(cliData(x.data))}</span></li>`).join('')}</ul>` : '<p class="op-analise-desc cli-vazio">Nenhuma entrega ainda.</p>'}
        </section>

        <section class="op-analise-sec">
          <h4 class="op-analise-sub">Progresso do serviço</h4>
          <p class="cli-dica">Mostre ao cliente como está ficando: fotos e um texto curto. Ele vê na página do contrato dele.</p>
          <form class="cli-progresso-form" id="cli-progresso-form">
            <textarea id="cli-progresso-texto" class="field-textarea" maxlength="2000" placeholder="Conte o que foi feito (opcional)"></textarea>
            <div class="cli-progresso-fotos" id="cli-progresso-previas"></div>
            <div class="cli-progresso-acoes">
              <label class="btn-secondary cli-btn" for="cli-progresso-arquivos">Adicionar fotos</label>
              <input type="file" id="cli-progresso-arquivos" accept="image/*" multiple hidden>
              <button type="submit" class="btn-primary cli-btn" id="cli-progresso-enviar">Publicar progresso</button>
            </div>
            <p class="settings-form-msg" id="cli-progresso-msg" hidden></p>
          </form>
          <div class="cli-atualizacoes">
            ${c.atualizacoes.map(a => `
              <article class="cli-atualizacao">
                <p class="cli-atualizacao-data">${escapeHtml(cliData(a.created_at))}</p>
                ${a.texto ? `<p class="op-analise-desc">${escapeHtml(a.texto)}</p>` : ''}
                ${(a.fotos || []).length ? `<div class="cli-progresso-fotos">${a.fotos.map(u => `<a href="${escapeHtml(u)}" target="_blank" rel="noopener"><img src="${escapeHtml(u)}" alt=""></a>`).join('')}</div>` : ''}
              </article>`).join('')}
          </div>
        </section>
      </div>

      <aside class="op-analise-lateral">
        ${lateralCliente}
        <div class="op-analise-card">
          <h4 class="op-analise-card-titulo">Pagamento</h4>
          <div class="cli-barra" aria-hidden="true"><span style="width:${pct}%"></span></div>
          <dl class="op-analise-lista">
            <div><dt>Valor do contrato</dt><dd>${cliBRL(t.total)}</dd></div>
            <div><dt>Pago</dt><dd>${cliBRL(t.pago)}</dd></div>
            <div><dt>Falta pagar</dt><dd>${cliBRL(t.falta)}</dd></div>
          </dl>
        </div>
        <div class="op-analise-card">
          <h4 class="op-analise-card-titulo">Sobre o evento</h4>
          <dl class="op-analise-lista">
            <div><dt>Tipo</dt><dd>${escapeHtml(CLI_CELEBRACOES[p.tipo_celebracao] || p.tipo_celebracao || '—')}</dd></div>
            <div><dt>Data</dt><dd>${escapeHtml(dataEvento)}</dd></div>
            <div><dt>Local</dt><dd>${escapeHtml(local)}</dd></div>
            <div><dt>Convidados</dt><dd>${escapeHtml(CLI_CONVIDADOS[p.convidados] || '—')}</dd></div>
            <div><dt>Horário</dt><dd>${escapeHtml(periodo)}</dd></div>
          </dl>
        </div>
      </aside>
    </div>`;
}

/* -------------------- Abrir / fechar -------------------- */

async function abrirClientePagina(leadId) {
  const lead = (typeof crmLeads !== 'undefined' ? crmLeads : []).find(l => l.id === leadId);
  if (!lead) return;
  cliLead = lead;
  document.body.classList.add('cli-aberto');
  document.getElementById('cli-pagina').hidden = false;
  document.getElementById('op-pedido-voltar').hidden = false;
  document.getElementById('leads-titulo-pagina').textContent = lead.name || 'Cliente';
  document.getElementById('cli-corpo').innerHTML = '<p class="cli-carregando">Carregando…</p>';
  if (new URLSearchParams(location.search).get('cliente') !== leadId) history.replaceState(null, '', `${location.pathname}?cliente=${encodeURIComponent(leadId)}`);
  document.querySelector('.b2b-content')?.scrollTo({ top: 0 });
  window.scrollTo({ top: 0 });
  await cliCarregar(lead);
  cliContratoAtivo = cliContratos[0] || null;
  document.getElementById('leads-titulo-pagina').textContent = cliNome();
  cliRender();
}
window.abrirClientePagina = abrirClientePagina;

function fecharClientePagina() {
  if (!document.body.classList.contains('cli-aberto')) return;
  document.body.classList.remove('cli-aberto');
  document.getElementById('cli-pagina').hidden = true;
  document.getElementById('op-pedido-voltar').hidden = true;
  history.replaceState(null, '', location.pathname);
  if (typeof leadsMostrarAba === 'function') leadsMostrarAba('leads');
}

/* -------------------- Progresso (fotos + texto) -------------------- */

let cliArquivos = [];
function cliMostrarPrevias() {
  const box = document.getElementById('cli-progresso-previas');
  if (!box) return;
  box.innerHTML = cliArquivos.map((f, i) => `<span class="cli-previa"><img src="${URL.createObjectURL(f)}" alt=""><button type="button" data-cli-tirar="${i}" aria-label="Tirar foto">×</button></span>`).join('');
}
function cliMsg(texto, erro) {
  const el = document.getElementById('cli-progresso-msg');
  if (!el) return;
  el.textContent = texto || '';
  el.hidden = !texto;
  el.classList.toggle('is-erro', !!erro);
}
async function cliPublicarProgresso(e) {
  e.preventDefault();
  const c = cliContratoAtivo;
  if (!c) return;
  const texto = document.getElementById('cli-progresso-texto').value.trim();
  if (!texto && !cliArquivos.length) return cliMsg('Escreva algo ou adicione fotos.', true);
  const btn = document.getElementById('cli-progresso-enviar');
  btn.disabled = true;
  cliMsg('Publicando…');
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  const fotos = [];
  for (const f of cliArquivos) {
    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
    const caminho = `progresso/${empresaId(session)}/${c.id}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
    const { error } = await supabaseClient.storage.from('fornecedores').upload(caminho, f, { cacheControl: '31536000', contentType: f.type || 'image/jpeg' });
    if (error) { btn.disabled = false; return cliMsg('Não foi possível enviar uma das fotos. Tente de novo.', true); }
    fotos.push(supabaseClient.storage.from('fornecedores').getPublicUrl(caminho).data.publicUrl);
  }
  const { data, error } = await supabaseClient.from('contrato_atualizacoes').insert({ proposta_id: c.id, texto: texto || null, fotos }).select().single();
  btn.disabled = false;
  if (error) return cliMsg('Não foi possível publicar agora. Tente de novo.', true);
  c.atualizacoes.unshift(data);
  cliArquivos = [];
  cliRender();
}

/* -------------------- Eventos -------------------- */

document.addEventListener('DOMContentLoaded', async () => {
  const pagina = document.getElementById('cli-pagina');
  if (!pagina) return;
  document.getElementById('op-pedido-voltar')?.addEventListener('click', fecharClientePagina);
  pagina.addEventListener('click', async ev => {
    const troca = ev.target.closest('[data-cli-contrato]');
    if (troca) { cliContratoAtivo = cliContratos.find(x => x.id === troca.dataset.cliContrato) || cliContratoAtivo; cliRender(); return; }
    if (ev.target.closest('[data-cli-editar]')) { if (typeof openLeadDrawer === 'function') openLeadDrawer(cliLead.id); return; }
    const tirar = ev.target.closest('[data-cli-tirar]');
    if (tirar) { cliArquivos.splice(Number(tirar.dataset.cliTirar), 1); cliMostrarPrevias(); }
  });
  pagina.addEventListener('change', async ev => {
    if (ev.target.id === 'cli-progresso-arquivos') {
      cliArquivos = cliArquivos.concat([...ev.target.files].filter(f => f.type.startsWith('image/'))).slice(0, 10);
      ev.target.value = '';
      cliMostrarPrevias();
      return;
    }
    const entrega = ev.target.closest('[data-cli-entrega]');
    if (entrega) {
      const { error } = await supabaseClient.from('contrato_entregas').update({ concluida: entrega.checked }).eq('id', entrega.dataset.cliEntrega);
      if (error) entrega.checked = !entrega.checked;
    }
  });
  pagina.addEventListener('submit', ev => { if (ev.target.id === 'cli-progresso-form') cliPublicarProgresso(ev); });

  // F5 com ?cliente=<lead>: reabre a página do cliente.
  const pedido = new URLSearchParams(location.search).get('cliente');
  if (pedido) {
    await window.b2bAuthReady;
    for (let i = 0; i < 40 && !(typeof crmLeads !== 'undefined' && crmLeads.length); i++) await new Promise(r => setTimeout(r, 100));
    abrirClientePagina(pedido);
  }
});
