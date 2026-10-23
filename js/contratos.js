// Fornecedores › Contratos (anfitrião).
//
// Proposta aceita em Minhas solicitações = contrato. A lista mostra quem você
// contratou, para qual serviço, o valor combinado, quanto já pagou e quanto
// falta. Clicando no título ou no fornecedor abre a visão geral: valores,
// pagamentos (parcelas), datas de entrega, descrição e as atualizações com
// fotos que o fornecedor publica pelo Hub.
//
// Dados: propostas_pedido (status 'aceita') + contrato_parcelas,
// contrato_entregas e contrato_atualizacoes (migration 096). Sem a migration,
// o contrato aparece com uma parcela única do valor total.
// Os contratos também abastecem window.LOVE_DATA.contractedVendors (Orçamento,
// responsáveis do Checklist e permissões da lista de convidados).
// API: window.LoveContratos.carregar(), renderLista(el), renderPagina(id, el)
(function () {
  'use strict';

  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reais = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  function dataCurta(iso, comAno) {
    if (!iso) return '';
    const s = String(iso).slice(0, 10);
    const [a, m, d] = s.split('-').map(Number);
    if (!a || !m || !d) return '';
    return `${d} ${MESES[m - 1]}${comAno ? ` ${a}` : ''}`;
  }
  const hojeIso = () => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`; };

  const NOME_DA_CATEGORIA = {
    espaco: 'Espaço para locação', buffet: 'Buffet', doces: 'Doces e bolos', bebidas: 'Bar e bebidas',
    decoracao: 'Decoração', musica: 'Música, banda ou DJ', fotografia: 'Foto e vídeo', assessoria: 'Assessoria',
    staff: 'Staff e mão de obra'
  };
  function nomeDaCategoria(id) {
    const w = window;
    const cat = w.LovePedidos && Array.isArray(w.LovePedidos.CATEGORIAS) ? w.LovePedidos.CATEGORIAS.find(c => c.id === id) : null;
    return cat ? cat.nome : (NOME_DA_CATEGORIA[id] || 'Serviço');
  }

  /** Contratos carregados (um por proposta aceita). */
  let contratos = [];
  let carregado = false;
  let carregando = null;
  let abaDaPagina = 'geral';

  function eventoAtivoId() {
    return typeof window.getLoveActiveEventId === 'function' ? window.getLoveActiveEventId() : null;
  }

  // supabaseClient é global (const em js/supabaseClient.js), não fica em window.
  // eslint-disable-next-line no-undef
  const cliente = () => (typeof supabaseClient !== 'undefined' ? supabaseClient : null);

  const faltaTabela = (e) => !!e && /does not exist|relation|schema cache|42P01|PGRST2/i.test(`${e.code || ''} ${e.message || ''}`);

  async function carregar() {
    if (carregando) return carregando;
    carregando = (async () => {
      const sb = cliente();
      if (!sb) { contratos = []; carregado = true; return contratos; }
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { contratos = []; carregado = true; return contratos; }
      const { data, error } = await sb
        .from('propostas_pedido')
        .select('id, pedido_id, fornecedor_id, valor, inclui, mensagem, prazo_entrega, created_at, updated_at, conversation_id, fornecedores(company_name, logo_url, avatar_url, city, state), pedido:pedidos_orcamento(id, titulo, categoria, descricao, data_evento, evento_id, cidade, bairro, uf, convidados, cliente_id)')
        .eq('status', 'aceita')
        .order('updated_at', { ascending: false });
      if (error) { contratos = []; carregado = true; return contratos; }
      const evento = eventoAtivoId();
      const meus = (data || []).filter(p => p.pedido && p.pedido.cliente_id === session.user.id && (!evento || !p.pedido.evento_id || p.pedido.evento_id === evento));
      const ids = meus.map(p => p.id);
      let parcelas = [], entregas = [], atualizacoes = [];
      if (ids.length) {
        const [rp, re, ra] = await Promise.all([
          sb.from('contrato_parcelas').select('*').in('proposta_id', ids).order('ordem'),
          sb.from('contrato_entregas').select('*').in('proposta_id', ids).order('ordem'),
          sb.from('contrato_atualizacoes').select('*').in('proposta_id', ids).order('created_at', { ascending: false })
        ]);
        if (!rp.error) parcelas = rp.data || [];
        if (!re.error) entregas = re.data || [];
        if (!ra.error) atualizacoes = ra.data || [];
        if (rp.error && !faltaTabela(rp.error)) console.warn('Contratos: parcelas', rp.error.message);
      }
      contratos = meus.map(p => montar(p, parcelas, entregas, atualizacoes));
      carregado = true;
      publicarNoLoveData();
      return contratos;
    })();
    try { return await carregando; } finally { carregando = null; }
  }

  function montar(p, parcelas, entregas, atualizacoes) {
    const f = p.fornecedores || {};
    const ped = p.pedido || {};
    let minhas = parcelas.filter(x => x.proposta_id === p.id);
    // Sem a migration 096 (ou antes do gatilho): uma parcela com o total.
    if (!minhas.length) minhas = [{ id: '', proposta_id: p.id, titulo: 'Pagamento total', valor: Number(p.valor) || 0, vencimento: ped.data_evento || null, status: 'pendente', virtual: true }];
    let datas = entregas.filter(x => x.proposta_id === p.id);
    if (!datas.length && ped.data_evento) datas = [{ id: '', titulo: 'Serviço no dia do evento', data: ped.data_evento, concluida: false }];
    const valor = Number(p.valor) || 0;
    const pago = minhas.filter(x => x.status === 'paga').reduce((s, x) => s + (Number(x.valor) || 0), 0);
    const proxima = minhas.filter(x => x.status !== 'paga').sort((a, b) => String(a.vencimento || '9999').localeCompare(String(b.vencimento || '9999')))[0] || null;
    return {
      id: p.id,
      pedidoId: p.pedido_id,
      fornecedorId: p.fornecedor_id,
      conversaId: p.conversation_id,
      fornecedor: f.company_name || 'Fornecedor',
      foto: f.logo_url || f.avatar_url || '',
      localFornecedor: [f.city, f.state].filter(Boolean).join(' - '),
      titulo: ped.titulo || nomeDaCategoria(ped.categoria),
      categoria: ped.categoria || '',
      descricao: ped.descricao || '',
      inclui: p.inclui || '',
      mensagem: p.mensagem || '',
      prazoEntrega: p.prazo_entrega || '',
      dataEvento: ped.data_evento || null,
      localEvento: [ped.bairro, ped.cidade, ped.uf].filter(Boolean).join(', '),
      convidados: ped.convidados || null,
      contratadoEm: p.updated_at || p.created_at,
      valor, pago, falta: Math.max(0, valor - pago),
      parcelas: minhas,
      entregas: datas,
      atualizacoes: atualizacoes.filter(x => x.proposta_id === p.id),
      proxima
    };
  }

  function situacao(c) {
    if (c.falta <= 0 && c.dataEvento && c.dataEvento < hojeIso()) return { texto: 'Concluído', classe: 'is-concluido' };
    if (c.falta <= 0) return { texto: 'Quitado', classe: 'is-quitado' };
    return { texto: 'Em andamento', classe: 'is-andamento' };
  }

  // Outras telas (Orçamento, Checklist, permissões) leem esta lista.
  function publicarNoLoveData() {
    const w = window;
    if (!w.LOVE_DATA) return;
    w.LOVE_DATA.contractedVendors = contratos.map(c => ({
      id: c.id,
      name: c.fornecedor,
      category: nomeDaCategoria(c.categoria),
      image: c.foto,
      service: c.titulo,
      negotiatedValue: reais(c.valor),
      negotiatedValueNum: c.valor,
      paidValue: reais(c.pago),
      paidValueNum: c.pago,
      parcelas: c.parcelas.map(x => ({ vencimento: x.vencimento, valor: Number(x.valor) || 0, pago: x.status === 'paga' })),
      proximoVencimento: c.proxima ? c.proxima.vencimento : null,
      fornecedorId: c.fornecedorId
    }));
  }

  const ICONE_MENSAGEM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>';
  const ICONE_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  const ICONE_VOLTAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 19l-7-7 7-7M3 12h18"/></svg>';
  const ICONE_FOTOS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 15-4.5-4.5L7 20"/></svg>';

  function avatar(c, classe) {
    return c.foto
      ? `<img src="${esc(c.foto)}" alt="" class="${classe}">`
      : `<span class="${classe} ct-inicial">${esc(c.fornecedor.charAt(0).toUpperCase())}</span>`;
  }

  // ------------------------------------------------------------------ Lista
  async function renderLista(el) {
    if (!el) return;
    if (!carregado) el.innerHTML = '<div class="dash-card love-tabela-caixa ct-caixa"><p class="ct-vazio-texto ct-carregando">Carregando contratos…</p></div>';
    await carregar();
    desenharLista(el);
  }

  function desenharLista(el) {
    if (!contratos.length) {
      el.innerHTML = `
        <div class="dash-card love-tabela-caixa ct-caixa">
          <div class="ct-vazio">
            <p class="ct-vazio-titulo">Nenhum contrato ainda</p>
            <p class="ct-vazio-texto">Quando você aceitar a proposta de um fornecedor em Minhas solicitações, o contrato aparece aqui com o valor combinado, os pagamentos e as datas de entrega.</p>
            <button type="button" class="ct-botao-escuro" data-ct-solicitar>Criar solicitação</button>
          </div>
        </div>`;
      return;
    }
    el.innerHTML = `
      <div class="dash-card love-tabela-caixa ct-caixa">
        ${contratos.map(c => {
          const s = situacao(c);
          return `
          <div class="ct-linha" data-ct-id="${esc(c.id)}">
            <div class="ct-linha-info">
              <button type="button" class="ct-titulo" data-ct-abrir="${esc(c.id)}">${esc(c.titulo)}</button>
              <button type="button" class="ct-quem" data-ct-abrir="${esc(c.id)}">
                ${avatar(c, 'ct-foto')}
                <span class="ct-quem-texto"><b>${esc(c.fornecedor)}</b><span>${esc(nomeDaCategoria(c.categoria))}${c.localFornecedor ? ` · ${esc(c.localFornecedor)}` : ''}</span></span>
              </button>
              <p class="ct-datas">Contratado em ${esc(dataCurta(c.contratadoEm, true))}${c.dataEvento ? ` · Evento em ${esc(dataCurta(c.dataEvento, true))}` : ''}</p>
            </div>
            <div class="ct-linha-meio">
              <span class="ct-selo ${s.classe}">${s.texto}</span>
              <p class="ct-valor">${esc(reais(c.valor))} <span>combinado</span></p>
              <div class="ct-barra" role="progressbar" aria-label="Pago do contrato" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${c.valor ? Math.round(c.pago / c.valor * 100) : 0}"><span style="width:${c.valor ? Math.min(100, Math.round(c.pago / c.valor * 100)) : 0}%"></span></div>
              <p class="ct-pago">Pago ${esc(reais(c.pago))} · Falta ${esc(reais(c.falta))}</p>
            </div>
            <div class="ct-linha-acoes">
              <button type="button" class="ct-botao" data-ct-mensagem="${esc(c.fornecedorId)}">${ICONE_MENSAGEM}<span>Mensagens</span></button>
              <button type="button" class="ct-botao" data-ct-abrir="${esc(c.id)}">Ver contrato</button>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  }

  // ------------------------------------------------------------------ Página
  async function renderPagina(id, el) {
    if (!el) return;
    if (!carregado) await carregar();
    const c = contratos.find(x => x.id === id);
    if (!c) { el.innerHTML = '<p class="ct-vazio-texto">Contrato não encontrado.</p>'; return; }
    el.dataset.ctPagina = c.id;
    const s = situacao(c);
    el.innerHTML = `
      <button type="button" class="ct-voltar" data-ct-voltar>${ICONE_VOLTAR}<span>Voltar para Contratos</span></button>
      <section class="ct-topo">
        <div class="ct-topo-linha">
          <div class="min-w-0">
            <p class="ct-topo-situacao"><span class="ct-selo ${s.classe}">${s.texto}</span>${c.dataEvento ? `<span>Evento em ${esc(dataCurta(c.dataEvento, true))}</span>` : ''}</p>
            <h2 class="ct-topo-titulo">${esc(c.titulo)}</h2>
          </div>
          <button type="button" class="ct-botao" data-ct-mensagem="${esc(c.fornecedorId)}">${ICONE_MENSAGEM}<span>Mensagens</span></button>
        </div>
        <div class="ct-topo-quem">
          ${avatar(c, 'ct-foto ct-foto-grande')}
          <span class="ct-quem-texto"><b>${esc(c.fornecedor)}</b><span>${esc(nomeDaCategoria(c.categoria))}${c.localFornecedor ? ` · ${esc(c.localFornecedor)}` : ''}</span></span>
        </div>
        <div class="love-tabs-nav ct-abas" role="tablist">
          ${[['geral', 'Visão geral'], ['atualizacoes', `Atualizações${c.atualizacoes.length ? ` (${c.atualizacoes.length})` : ''}`], ['detalhes', 'Detalhes do contrato'], ['config', 'Configurações']]
            .map(([k, n]) => `<button type="button" class="love-tab-item${abaDaPagina === k ? ' active' : ''}" data-ct-aba="${k}">${n}</button>`).join('')}
        </div>
      </section>
      <div class="ct-painel" ${abaDaPagina === 'geral' ? '' : 'hidden'}>${htmlVisaoGeral(c)}</div>
      <div class="ct-painel" ${abaDaPagina === 'atualizacoes' ? '' : 'hidden'}>${htmlAtualizacoes(c, false)}</div>
      <div class="ct-painel" ${abaDaPagina === 'detalhes' ? '' : 'hidden'}>${htmlDetalhes(c)}</div>
      <div class="ct-painel" ${abaDaPagina === 'config' ? '' : 'hidden'}>
        <div class="dash-card ct-cartao">
          <h3 class="ct-cartao-titulo">Lista de convidados</h3>
          <p class="ct-cartao-sub">Escolha o que esse fornecedor pode ver e fazer na sua lista de convidados.</p>
          <div id="contracted-vendor-permissions-list"></div>
        </div>
      </div>`;
    const w = window;
    if (abaDaPagina === 'config' && typeof w.loveRenderPermissoesDoContratado === 'function') w.loveRenderPermissoesDoContratado(c.id);
  }

  function htmlVisaoGeral(c) {
    const pagas = c.parcelas.filter(x => x.status === 'paga').length;
    const restantes = c.parcelas.length - pagas;
    return `
      <div class="dash-card ct-numeros">
        <div><span>Valor combinado</span><b>${esc(reais(c.valor))}</b><small>Preço fechado</small></div>
        <div><span>Já pago${c.parcelas.length > 1 ? ` (${pagas})` : ''}</span><b>${esc(reais(c.pago))}</b></div>
        <div><span>Falta pagar${c.parcelas.length > 1 ? ` (${restantes})` : ''}</span><b>${esc(reais(c.falta))}</b></div>
        <div><span>Próximo pagamento</span><b>${c.proxima ? esc(c.proxima.vencimento ? dataCurta(c.proxima.vencimento, true) : 'Sem data') : '—'}</b>${c.proxima ? `<small>${esc(reais(c.proxima.valor))}</small>` : '<small>Tudo pago</small>'}</div>
      </div>
      <div class="ct-colunas">
        <div class="ct-coluna-principal">
          <section class="ct-bloco">
            <h3 class="ct-bloco-titulo">Pagamentos</h3>
            <ol class="ct-linha-tempo">
              ${c.parcelas.map(x => {
                const paga = x.status === 'paga';
                const atrasada = !paga && x.vencimento && x.vencimento < hojeIso();
                return `
                <li class="ct-marco${paga ? ' is-feito' : ''}">
                  <span class="ct-marco-bola">${paga ? ICONE_CHECK : ''}</span>
                  <div class="ct-marco-corpo">
                    <p class="ct-marco-titulo">${esc(x.titulo || 'Pagamento')}</p>
                    <p class="ct-marco-linha"><b>${esc(reais(x.valor))}</b>
                      <span class="ct-selo ${paga ? 'is-quitado' : atrasada ? 'is-atrasado' : 'is-pendente'}">${paga ? 'Pago' : atrasada ? 'Atrasado' : 'A pagar'}</span>
                      ${x.vencimento ? `<span class="ct-marco-data">${paga && x.pago_em ? `Pago em ${esc(dataCurta(x.pago_em, true))}` : `Vence em ${esc(dataCurta(x.vencimento, true))}`}</span>` : ''}
                    </p>
                    ${x.id ? `<button type="button" class="ct-link" data-ct-parcela="${esc(x.id)}" data-ct-parcela-status="${paga ? 'pendente' : 'paga'}">${paga ? 'Desfazer pagamento' : 'Marcar como pago'}</button>` : ''}
                  </div>
                </li>`;
              }).join('')}
            </ol>
          </section>
          <section class="ct-bloco">
            <h3 class="ct-bloco-titulo">Datas de entrega</h3>
            ${c.entregas.length ? `
            <ol class="ct-linha-tempo">
              ${c.entregas.map(x => `
                <li class="ct-marco${x.concluida ? ' is-feito' : ''}">
                  <span class="ct-marco-bola">${x.concluida ? ICONE_CHECK : ''}</span>
                  <div class="ct-marco-corpo">
                    <p class="ct-marco-titulo">${esc(x.titulo)}</p>
                    <p class="ct-marco-linha">${x.data ? `<span class="ct-marco-data">${esc(dataCurta(x.data, true))}</span>` : '<span class="ct-marco-data">Sem data</span>'}${x.concluida ? '<span class="ct-selo is-quitado">Entregue</span>' : ''}</p>
                  </div>
                </li>`).join('')}
            </ol>` : '<p class="ct-vazio-texto">O fornecedor ainda não definiu as datas de entrega.</p>'}
            ${c.prazoEntrega ? `<p class="ct-nota">Prazo combinado na proposta: ${esc(c.prazoEntrega)}</p>` : ''}
          </section>
          <section class="ct-bloco">
            <h3 class="ct-bloco-titulo">O que ele vai fazer</h3>
            <p class="ct-texto">${esc(c.inclui || c.descricao || '—')}</p>
          </section>
        </div>
        <aside class="dash-card ct-cartao ct-lateral">
          <div class="ct-lateral-topo">
            <h3 class="ct-cartao-titulo">Atualizações</h3>
            ${c.atualizacoes.length ? '<button type="button" class="ct-link" data-ct-aba="atualizacoes">Ver todas</button>' : ''}
          </div>
          ${htmlAtualizacoes(c, true)}
        </aside>
      </div>`;
  }

  function htmlAtualizacoes(c, resumo) {
    const lista = resumo ? c.atualizacoes.slice(0, 3) : c.atualizacoes;
    if (!lista.length) {
      return `
        <div class="ct-vazio ct-vazio-pequeno">
          <span class="ct-vazio-icone">${ICONE_FOTOS}</span>
          <p class="ct-vazio-texto">Quando ${esc(c.fornecedor)} publicar fotos e novidades da preparação, elas aparecem aqui.</p>
        </div>`;
    }
    return `
      <div class="${resumo ? 'ct-atualizacoes is-resumo' : 'dash-card ct-cartao ct-atualizacoes'}">
        ${lista.map(a => {
          const fotos = Array.isArray(a.fotos) ? a.fotos.filter(Boolean) : [];
          return `
          <article class="ct-atualizacao">
            <p class="ct-atualizacao-quando">${esc(dataCurta(a.created_at, true))}</p>
            ${a.texto ? `<p class="ct-texto">${esc(a.texto)}</p>` : ''}
            ${fotos.length ? `<div class="ct-fotos">${fotos.slice(0, resumo ? 3 : 12).map(u => `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="Foto da preparação" loading="lazy"></a>`).join('')}</div>` : ''}
          </article>`;
        }).join('')}
      </div>`;
  }

  function htmlDetalhes(c) {
    const linha = (rotulo, valor) => valor ? `<div class="ct-detalhe"><dt>${rotulo}</dt><dd>${esc(valor)}</dd></div>` : '';
    return `
      <div class="dash-card ct-cartao">
        <dl class="ct-detalhes">
          ${linha('Serviço', nomeDaCategoria(c.categoria))}
          ${linha('Fornecedor', c.fornecedor)}
          ${linha('Valor combinado', reais(c.valor))}
          ${linha('Contratado em', dataCurta(c.contratadoEm, true))}
          ${linha('Data do evento', c.dataEvento ? dataCurta(c.dataEvento, true) : '')}
          ${linha('Local do evento', c.localEvento)}
          ${linha('Convidados', c.convidados ? String(c.convidados) : '')}
          ${linha('Prazo de entrega', c.prazoEntrega)}
        </dl>
      </div>
      <section class="ct-bloco">
        <h3 class="ct-bloco-titulo">O que está incluso</h3>
        <p class="ct-texto">${esc(c.inclui || '—')}</p>
      </section>
      ${c.descricao ? `
      <section class="ct-bloco">
        <h3 class="ct-bloco-titulo">O que você pediu</h3>
        <p class="ct-texto">${esc(c.descricao)}</p>
      </section>` : ''}
      ${c.mensagem ? `
      <section class="ct-bloco">
        <h3 class="ct-bloco-titulo">Mensagem do fornecedor</h3>
        <p class="ct-texto">${esc(c.mensagem)}</p>
      </section>` : ''}`;
  }

  async function mudarParcela(id, status, pagina) {
    const w = window;
    const ok = w.confirmarNaLove ? await w.confirmarNaLove(status === 'paga'
      ? { titulo: 'Marcar como pago?', texto: 'O valor entra em "Já pago" e no seu Orçamento.', botao: 'Marcar como pago' }
      : { titulo: 'Desfazer este pagamento?', texto: 'O valor volta para "Falta pagar".', botao: 'Desfazer' }) : true;
    if (!ok) return;
    const { error } = await cliente().from('contrato_parcelas').update({ status }).eq('id', id);
    if (error) { if (w.showLoveToast) w.showLoveToast('Não foi possível salvar agora.'); return; }
    carregado = false;
    await carregar();
    if (pagina) renderPagina(pagina.dataset.ctPagina || '', pagina);
  }

  // ------------------------------------------------------------------ Cliques
  document.addEventListener('click', (e) => {
    const alvo = e.target instanceof Element ? e.target : null;
    if (!alvo) return;
    const w = window;
    const msg = alvo.closest('[data-ct-mensagem]');
    if (msg) { e.stopPropagation(); if (w.loveAbrirChatComFornecedor) w.loveAbrirChatComFornecedor(msg.getAttribute('data-ct-mensagem')); return; }
    const abrir = alvo.closest('[data-ct-abrir]');
    if (abrir) { abaDaPagina = 'geral'; if (w.loveAbrirContrato) w.loveAbrirContrato(abrir.getAttribute('data-ct-abrir')); return; }
    if (alvo.closest('[data-ct-voltar]')) { if (w.loveFecharContrato) w.loveFecharContrato(); return; }
    if (alvo.closest('[data-ct-solicitar]')) { if (w.loveIrPara) w.loveIrPara('b2b', 'pedidos'); return; }
    const aba = alvo.closest('[data-ct-aba]');
    if (aba) {
      const pagina = aba.closest('[data-ct-pagina]');
      abaDaPagina = aba.getAttribute('data-ct-aba') || 'geral';
      if (pagina) { renderPagina(pagina.dataset.ctPagina || '', pagina); window.scrollTo({ top: 0 }); }
      return;
    }
    const parcela = alvo.closest('[data-ct-parcela]');
    if (parcela) { mudarParcela(parcela.getAttribute('data-ct-parcela'), parcela.getAttribute('data-ct-parcela-status'), parcela.closest('[data-ct-pagina]')); }
  });

  // Troca de evento: recarrega na próxima vez.
  window.addEventListener('love:evento-trocado', () => { carregado = false; });

  window.LoveContratos = {
    carregar: () => { carregado = false; return carregar(); },
    renderLista,
    renderPagina,
    lista: () => contratos
  };

  // Já carrega para o Orçamento e o Checklist enxergarem os contratados.
  const iniciar = () => { if (cliente()) carregar(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(iniciar, 800));
  else setTimeout(iniciar, 800);
})();
