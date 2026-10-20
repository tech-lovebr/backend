// =============================================================================
// Pedidos de orçamento (RFP) — Fornecedores › Pedidos de orçamento
//
// O anfitrião descreve o que precisa em 4 etapas (o que, evento e logística,
// orçamento e detalhes, publicação). O pedido vai para a tabela
// pedidos_orcamento (migration 072) e aparece para os fornecedores no Hub,
// que mandam propostas pela Love. Telefone e WhatsApp nunca ficam expostos.
//
// Usa supabaseClient (js/supabase-init.js) e, do app.js,
// window.loveClienteSession / window.getLoveActiveEvent / getLoveActiveEventId.
// API: window.LovePedidos.mostrarLista() e window.LovePedidos.abrir().
// =============================================================================
(function () {
  'use strict';

  /**
   * @typedef {'fotografia'|'buffet'|'espaco'|'decoracao'|'musica'|'assessoria'|'bebidas'|'doces'} RfpCategory
   * @typedef {'economico'|'moderado'|'premium'|'exclusivo'} RfpBudgetTier
   * @typedef {'casamento'|'aniversario'|'bodas'|'noivado'|'formatura'|'corporativo'} RfpCelebracao
   * @typedef {'ate-50'|'50-100'|'100-200'|'200-mais'} RfpConvidados
   * @typedef {'diurno'|'noturno'|'horas'} RfpPeriodo
   *
   * @typedef {Object} RfpFormData
   * @property {RfpCategory|''} categoria
   * @property {string[]} especialidades
   * @property {RfpCelebracao|''} tipoCelebracao
   * @property {string} dataEvento            AAAA-MM-DD ('' quando flexível)
   * @property {boolean} dataFlexivel
   * @property {string} cep
   * @property {string} cidade
   * @property {string} bairro
   * @property {string} uf
   * @property {RfpConvidados|''} convidados
   * @property {RfpPeriodo|''} periodo
   * @property {number|null} horasServico
   * @property {RfpBudgetTier|''} faixa
   * @property {boolean} aceitaForaDaFaixa
   * @property {string} descricao
   * @property {File[]} referencias          fotos ainda não enviadas
   * @property {number|null} limitePropostas  null = sem limite
   */

  /** @type {{ id: RfpCategory, nome: string, icone: string, tags: string[] }[]} */
  const CATEGORIAS = [
    { id: 'fotografia', nome: 'Fotografia & Vídeo', icone: '<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.6l1.2-1.8A1.5 1.5 0 0 1 9.55 3.5h4.9a1.5 1.5 0 0 1 1.25.7L16.9 6h1.6A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-9Z"/><circle cx="12" cy="13" r="3.5"/>',
      tags: ['Ensaio pré-wedding', 'Cobertura completa', 'Álbum impresso', 'Drone', 'Vídeo / filme', 'Making of'] },
    { id: 'buffet', nome: 'Buffet & Gastronomia', icone: '<path d="M4 13h16M5 13a7 7 0 0 1 14 0M12 6V4M3 17h18"/>',
      tags: ['Coquetel', 'Jantar empratado', 'Ilhas gastronômicas', 'Churrasco', 'Opções veganas', 'Finger food'] },
    { id: 'espaco', nome: 'Espaço para Eventos', icone: '<path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6"/>',
      tags: ['Ao ar livre', 'Salão fechado', 'Com hospedagem', 'Com estacionamento', 'Cerimônia no local', 'Acessibilidade'] },
    { id: 'decoracao', nome: 'Decoração & Cenografia', icone: '<path d="M12 21v-7M12 14c-3 0-5-2-5-5 2 0 3.5.8 5 2.5C13.5 9.8 15 9 17 9c0 3-2 5-5 5ZM12 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>',
      tags: ['Flores naturais', 'Iluminação cênica', 'Mobiliário', 'Decoração da cerimônia', 'Mesa de doces', 'Painel / backdrop'] },
    { id: 'musica', nome: 'Música, Banda & DJ', icone: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
      tags: ['DJ', 'Banda ao vivo', 'Música na cerimônia', 'Som e iluminação', 'Pista de dança', 'Voz e violão'] },
    { id: 'assessoria', nome: 'Assessoria & Cerimonial', icone: '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2ZM9 13l2 2 4-4"/>',
      tags: ['Assessoria completa', 'Assessoria do dia', 'Cerimonialista', 'Roteiro e cronograma', 'Gestão de fornecedores'] },
    { id: 'bebidas', nome: 'Bebidas & Bar', icone: '<path d="M8 3h8l-1 8a3 3 0 0 1-6 0L8 3ZM12 14v7M8 21h8"/>',
      tags: ['Open bar', 'Drinks autorais', 'Bartender', 'Cervejas especiais', 'Vinhos e espumantes', 'Drinks sem álcool'] },
    { id: 'doces', nome: 'Doces & Bolo', icone: '<path d="M4 21h16M5 21v-6h14v6M7 15v-3h10v3M12 12V8M12 8c-1 0-1.5-1-1-2l1-2 1 2c.5 1 0 2-1 2Z"/>',
      tags: ['Bolo de casamento', 'Bem-casados', 'Doces finos', 'Mesa de doces', 'Naked cake', 'Lembrancinhas'] }
  ];

  /** @type {{ id: RfpCelebracao, nome: string }[]} */
  const CELEBRACOES = [
    { id: 'casamento', nome: 'Casamento' }, { id: 'aniversario', nome: 'Aniversário' },
    { id: 'bodas', nome: 'Bodas' }, { id: 'noivado', nome: 'Noivado' },
    { id: 'formatura', nome: 'Formatura' }, { id: 'corporativo', nome: 'Evento corporativo' }
  ];

  /** @type {{ id: RfpConvidados, nome: string }[]} */
  const CONVIDADOS = [
    { id: 'ate-50', nome: 'Até 50' }, { id: '50-100', nome: '50 a 100' },
    { id: '100-200', nome: '100 a 200' }, { id: '200-mais', nome: '200+' }
  ];

  /** @type {{ id: RfpPeriodo, nome: string }[]} */
  const PERIODOS = [
    { id: 'diurno', nome: 'Diurno' }, { id: 'noturno', nome: 'Noturno' }, { id: 'horas', nome: 'Por horas de serviço' }
  ];

  /** @type {{ id: RfpBudgetTier, nome: string, faixa: string, min: number, max: number|null }[]} */
  const FAIXAS = [
    { id: 'economico', nome: 'Econômico', faixa: 'até R$ 2.500', min: 0, max: 2500 },
    { id: 'moderado', nome: 'Moderado', faixa: 'R$ 2.500 a R$ 6.000', min: 2500, max: 6000 },
    { id: 'premium', nome: 'Premium', faixa: 'R$ 6.000 a R$ 12.000', min: 6000, max: 12000 },
    { id: 'exclusivo', nome: 'Exclusivo', faixa: 'acima de R$ 12.000', min: 12000, max: null }
  ];

  // Foto de cada categoria (assets/rfp/<id>.jpg). Sem o arquivo, o card mostra o ícone.
  /** @param {RfpCategory} id */
  const fotoDaCategoria = (id) => `/assets/rfp/${id}.jpg`;

  const LIMITES = [{ valor: 3, nome: 'Até 3 propostas' }, { valor: 5, nome: 'Até 5 propostas' }, { valor: null, nome: 'Sem limite' }];
  const ETAPAS = ['O que você precisa', 'Evento e logística', 'Orçamento e detalhes', 'Publicação'];
  const DESCRICAO_MIN = 50;
  const DESCRICAO_MAX = 1000;
  const MAX_FOTOS = 5;
  const MAX_FOTO_BYTES = 5 * 1024 * 1024;
  const SITUACOES = { aberto: 'Aberto', fechado: 'Encerrado', cancelado: 'Cancelado' };

  const ICONE_FECHAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  const ICONE_CADEADO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
  const ICONE_FOTO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/></svg>';
  const ICONE_MAIS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';

  /** @param {unknown} v */
  const esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  /** @param {RfpCategory|string} id */
  const categoriaPorId = (id) => CATEGORIAS.find(c => c.id === id) || null;
  /** @param {string} id */
  const nomeDe = (lista, id) => ((lista.find(/** @param {any} x */ x => x.id === id) || {}).nome) || '';

  // --------------------------------------------------------------------------
  // Estado do assistente
  // --------------------------------------------------------------------------

  /** @type {RfpFormData} */
  let dados = rascunhoVazio();
  let etapa = 1;
  /** @type {Record<string, string>} */
  let erros = {};
  let publicando = false;
  /** @type {string[]} */
  let previas = [];

  /** @returns {RfpFormData} */
  function rascunhoVazio() {
    return {
      categoria: '', especialidades: [], tipoCelebracao: '', dataEvento: '', dataFlexivel: false,
      cep: '', cidade: '', bairro: '', uf: '', convidados: '', periodo: '', horasServico: null,
      faixa: '', aceitaForaDaFaixa: false, descricao: '', referencias: [], limitePropostas: 5
    };
  }

  // Começa com o que o evento ativo já sabe (tipo, data e cidade).
  function preencherComOEvento() {
    const evento = typeof window.getLoveActiveEvent === 'function' ? window.getLoveActiveEvent() : null;
    if (!evento) return;
    /** @type {Record<string, RfpCelebracao>} */
    const porTipo = { wedding: 'casamento', birthday: 'aniversario', anniversary: 'bodas' };
    if (porTipo[evento.type]) dados.tipoCelebracao = porTipo[evento.type];
    const det = evento.eventDetails || {};
    const data = det.date || evento.date || '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) dados.dataEvento = data;
    if (det.city) dados.cidade = String(det.city);
    if (det.state) dados.uf = String(det.state).slice(0, 2).toUpperCase();
  }

  // --------------------------------------------------------------------------
  // Validação (por etapa — não deixa avançar com obrigatório vazio)
  // --------------------------------------------------------------------------

  /** @param {number} n @returns {Record<string, string>} */
  function validarEtapa(n) {
    /** @type {Record<string, string>} */
    const e = {};
    if (n === 1 && !dados.categoria) e.categoria = 'Escolha a categoria do serviço.';
    if (n === 2) {
      if (!dados.tipoCelebracao) e.tipoCelebracao = 'Escolha o tipo de celebração.';
      if (!dados.dataFlexivel && !dados.dataEvento) e.dataEvento = 'Informe a data ou marque "Data flexível".';
      if (!dados.dataFlexivel && dados.dataEvento && dados.dataEvento < hojeIso()) e.dataEvento = 'A data precisa ser hoje ou depois.';
      if (!dados.cidade.trim()) e.cidade = 'Informe a cidade.';
      if (!/^[A-Za-z]{2}$/.test(dados.uf.trim())) e.uf = 'UF com 2 letras.';
      if (!dados.convidados) e.convidados = 'Escolha a quantidade de convidados.';
      if (!dados.periodo) e.periodo = 'Escolha o período.';
      if (dados.periodo === 'horas' && !(Number(dados.horasServico) >= 1 && Number(dados.horasServico) <= 24)) e.horasServico = 'De 1 a 24 horas.';
    }
    if (n === 3) {
      if (!dados.faixa) e.faixa = 'Escolha a faixa de orçamento.';
      const tam = dados.descricao.trim().length;
      if (tam < DESCRICAO_MIN) e.descricao = `Escreva pelo menos ${DESCRICAO_MIN} caracteres (faltam ${DESCRICAO_MIN - tam}).`;
      if (tam > DESCRICAO_MAX) e.descricao = `No máximo ${DESCRICAO_MAX} caracteres.`;
    }
    return e;
  }

  function hojeIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** @param {string} campo */
  const erroHtml = (campo) => erros[campo] ? `<p class="rfp-erro" role="alert">${esc(erros[campo])}</p>` : '';

  // --------------------------------------------------------------------------
  // Modal (montado uma vez e reaproveitado)
  // --------------------------------------------------------------------------

  /** @returns {HTMLElement} */
  function modal() {
    let m = document.getElementById('rfp-modal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'rfp-modal';
    m.className = 'rfp-modal hidden';
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    m.setAttribute('aria-labelledby', 'rfp-titulo');
    m.innerHTML = `
      <div class="rfp-caixa">
        <header class="rfp-topo">
          <div>
            <h3 id="rfp-titulo">Novo pedido de orçamento</h3>
            <p class="rfp-subtitulo">Conte o que você precisa e receba propostas dos fornecedores.</p>
          </div>
          <button type="button" class="rfp-fechar" data-rfp-fechar aria-label="Fechar">${ICONE_FECHAR}</button>
        </header>
        <div class="rfp-stepper" id="rfp-stepper"></div>
        <div class="rfp-corpo" id="rfp-corpo"></div>
        <footer class="rfp-rodape">
          <button type="button" class="btn-white rfp-btn" data-rfp-voltar>Voltar</button>
          <p class="rfp-erro-geral hidden" id="rfp-erro-geral" role="alert"></p>
          <button type="button" class="btn-primary rfp-btn" data-rfp-avancar>Continuar</button>
        </footer>
      </div>`;
    document.body.appendChild(m);

    m.addEventListener('click', (e) => {
      const alvo = /** @type {HTMLElement} */ (e.target);
      if (alvo === m || alvo.closest('[data-rfp-fechar]')) return fechar();
      if (alvo.closest('[data-rfp-voltar]')) return irPara(etapa - 1, -1);
      if (alvo.closest('[data-rfp-avancar]')) return avancar();
      const opcao = /** @type {HTMLElement|null} */ (alvo.closest('[data-rfp-campo]'));
      if (opcao && opcao.dataset.rfpValor !== undefined) return escolher(opcao.dataset.rfpCampo || '', opcao.dataset.rfpValor || '');
      const tag = /** @type {HTMLElement|null} */ (alvo.closest('[data-rfp-tag]'));
      if (tag) return alternarTag(tag.dataset.rfpTag || '');
      const tirar = /** @type {HTMLElement|null} */ (alvo.closest('[data-rfp-tirar-foto]'));
      if (tirar) return tirarFoto(Number(tirar.dataset.rfpTirarFoto));
    });
    m.addEventListener('input', aoDigitar);
    m.addEventListener('change', aoDigitar);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !m.classList.contains('hidden')) fechar();
    });
    return m;
  }

  function abrir() {
    dados = rascunhoVazio();
    preencherComOEvento();
    etapa = 1;
    erros = {};
    publicando = false;
    previas.forEach(u => URL.revokeObjectURL(u));
    previas = [];
    const m = modal();
    m.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    desenhar(0);
  }

  function fechar() {
    if (publicando) return;
    const m = document.getElementById('rfp-modal');
    if (m) m.classList.add('hidden');
    document.body.style.overflow = '';
  }

  /** @param {number} n @param {number} direcao */
  function irPara(n, direcao) {
    if (n < 1 || n > ETAPAS.length) return;
    etapa = n;
    erros = {};
    desenhar(direcao);
  }

  function avancar() {
    erros = validarEtapa(etapa);
    if (Object.keys(erros).length) { desenhar(0); focarPrimeiroErro(); return; }
    if (etapa < ETAPAS.length) return irPara(etapa + 1, 1);
    publicar();
  }

  function focarPrimeiroErro() {
    const el = document.querySelector('#rfp-corpo .rfp-erro');
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  // --------------------------------------------------------------------------
  // Desenho das etapas
  // --------------------------------------------------------------------------

  /** @param {number} direcao  1 = avançou, -1 = voltou, 0 = só redesenho */
  function desenhar(direcao) {
    const pct = Math.round((etapa / ETAPAS.length) * 100);
    const stepper = document.getElementById('rfp-stepper');
    if (stepper) stepper.innerHTML = `
      <div class="rfp-progresso" aria-hidden="true"><span style="width:${pct}%"></span></div>
      <div class="rfp-etapas">
        ${ETAPAS.map((nome, i) => `<span class="rfp-etapa${i + 1 === etapa ? ' atual' : ''}${i + 1 < etapa ? ' feita' : ''}"><b>${i + 1}</b><em>${esc(nome)}</em></span>`).join('')}
      </div>
      <p class="rfp-progresso-texto">Etapa ${etapa} de ${ETAPAS.length} · ${pct}%</p>`;

    const corpo = document.getElementById('rfp-corpo');
    if (corpo) {
      const telas = [htmlEtapa1, htmlEtapa2, htmlEtapa3, htmlEtapa4];
      corpo.innerHTML = `<div class="rfp-tela${direcao > 0 ? ' entra-direita' : direcao < 0 ? ' entra-esquerda' : ''}">${telas[etapa - 1]()}</div>`;
      if (direcao) corpo.scrollTop = 0;
    }
    const voltar = /** @type {HTMLButtonElement|null} */ (document.querySelector('#rfp-modal [data-rfp-voltar]'));
    const avancarBtn = /** @type {HTMLButtonElement|null} */ (document.querySelector('#rfp-modal [data-rfp-avancar]'));
    if (voltar) voltar.style.visibility = etapa === 1 ? 'hidden' : 'visible';
    if (avancarBtn) {
      avancarBtn.textContent = publicando ? 'Publicando…' : (etapa === ETAPAS.length ? 'Publicar solicitação de orçamento' : 'Continuar');
      avancarBtn.disabled = publicando;
    }
  }

  /**
   * Grupo de opções de escolha única (pílulas).
   * @param {string} campo @param {{ id: string, nome: string }[]} lista @param {string} atual
   */
  const pilulas = (campo, lista, atual) => `
    <div class="rfp-pilulas" role="radiogroup">
      ${lista.map(o => `<button type="button" class="rfp-pilula${o.id === atual ? ' ativa' : ''}" role="radio" aria-checked="${o.id === atual}" data-rfp-campo="${campo}" data-rfp-valor="${esc(o.id)}">${esc(o.nome)}</button>`).join('')}
    </div>`;

  function htmlEtapa1() {
    const cat = categoriaPorId(dados.categoria);
    return `
      <h4 class="rfp-pergunta">Qual serviço você procura?</h4>
      <div class="rfp-categorias" role="radiogroup">
        ${CATEGORIAS.map(c => `
          <button type="button" class="rfp-categoria${c.id === dados.categoria ? ' ativa' : ''}" role="radio" aria-checked="${c.id === dados.categoria}" aria-label="${esc(c.nome)}" data-rfp-campo="categoria" data-rfp-valor="${c.id}">
            <span class="rfp-categoria-foto">
              <img src="${fotoDaCategoria(c.id)}" alt="" onerror="this.parentElement.classList.add('sem-foto');this.remove();">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${c.icone}</svg>
            </span>
            <span class="rfp-categoria-nome">${esc(c.nome)}</span>
          </button>`).join('')}
      </div>
      ${erroHtml('categoria')}
      ${cat ? `
        <h4 class="rfp-pergunta">Especialidades <span class="rfp-opcional">(opcional)</span></h4>
        <div class="rfp-tags">
          ${cat.tags.map(t => `<button type="button" class="rfp-tag${dados.especialidades.includes(t) ? ' ativa' : ''}" aria-pressed="${dados.especialidades.includes(t)}" data-rfp-tag="${esc(t)}">${esc(t)}</button>`).join('')}
        </div>` : ''}`;
  }

  function htmlEtapa2() {
    return `
      <h4 class="rfp-pergunta">Tipo de celebração</h4>
      ${pilulas('tipoCelebracao', CELEBRACOES, dados.tipoCelebracao)}
      ${erroHtml('tipoCelebracao')}

      <h4 class="rfp-pergunta">Data do evento</h4>
      <div class="rfp-linha">
        <input type="date" class="rfp-campo" data-rfp-input="dataEvento" value="${esc(dados.dataEvento)}" min="${hojeIso()}" ${dados.dataFlexivel ? 'disabled' : ''} aria-label="Data do evento">
        <label class="rfp-check"><input type="checkbox" data-rfp-input="dataFlexivel" ${dados.dataFlexivel ? 'checked' : ''}> Data flexível / em definição</label>
      </div>
      ${erroHtml('dataEvento')}

      <h4 class="rfp-pergunta">Local</h4>
      <div class="rfp-grade-local">
        <label class="rfp-rotulo">CEP <span class="rfp-opcional">(opcional)</span>
          <input type="text" class="rfp-campo" data-rfp-input="cep" value="${esc(dados.cep)}" inputmode="numeric" maxlength="9" placeholder="00000-000">
          <span class="rfp-dica" id="rfp-cep-status"></span>
        </label>
        <label class="rfp-rotulo">Cidade
          <input type="text" class="rfp-campo" data-rfp-input="cidade" value="${esc(dados.cidade)}" placeholder="Ex.: São Paulo">
          ${erroHtml('cidade')}
        </label>
        <label class="rfp-rotulo">Bairro <span class="rfp-opcional">(opcional)</span>
          <input type="text" class="rfp-campo" data-rfp-input="bairro" value="${esc(dados.bairro)}" placeholder="Ex.: Pinheiros">
        </label>
        <label class="rfp-rotulo">UF
          <input type="text" class="rfp-campo rfp-campo-uf" data-rfp-input="uf" value="${esc(dados.uf)}" maxlength="2" placeholder="SP">
          ${erroHtml('uf')}
        </label>
      </div>

      <h4 class="rfp-pergunta">Número estimado de convidados</h4>
      ${pilulas('convidados', CONVIDADOS, dados.convidados)}
      ${erroHtml('convidados')}

      <h4 class="rfp-pergunta">Horário / duração</h4>
      ${pilulas('periodo', PERIODOS, dados.periodo)}
      ${dados.periodo === 'horas' ? `
        <label class="rfp-rotulo rfp-horas">Horas de serviço
          <input type="number" class="rfp-campo" data-rfp-input="horasServico" min="1" max="24" value="${dados.horasServico ?? ''}" placeholder="Ex.: 6">
        </label>${erroHtml('horasServico')}` : ''}
      ${erroHtml('periodo')}`;
  }

  function htmlEtapa3() {
    const tam = dados.descricao.trim().length;
    return `
      <h4 class="rfp-pergunta">Faixa de orçamento prevista</h4>
      <div class="rfp-faixas" role="radiogroup">
        ${FAIXAS.map(f => `
          <button type="button" class="rfp-faixa${f.id === dados.faixa ? ' ativa' : ''}" role="radio" aria-checked="${f.id === dados.faixa}" data-rfp-campo="faixa" data-rfp-valor="${f.id}">
            <b>${esc(f.nome)}</b><span>${esc(f.faixa)}</span>
          </button>`).join('')}
      </div>
      ${erroHtml('faixa')}
      <label class="rfp-toggle">
        <span>Aceito propostas fora dessa faixa de preço</span>
        <span class="settings-switch"><input type="checkbox" data-rfp-input="aceitaForaDaFaixa" ${dados.aceitaForaDaFaixa ? 'checked' : ''}><span class="settings-switch-track"></span></span>
      </label>

      <h4 class="rfp-pergunta">Descreva o que você precisa</h4>
      <textarea class="rfp-campo rfp-descricao" data-rfp-input="descricao" maxlength="${DESCRICAO_MAX}" rows="6" placeholder="Conte o estilo, referências e detalhes importantes. Ex.: cobertura da cerimônia e festa, fotos espontâneas, entrega em 30 dias…">${esc(dados.descricao)}</textarea>
      <p class="rfp-contador${tam > 0 && tam < DESCRICAO_MIN ? ' falta' : ''}" id="rfp-contador">${tam}/${DESCRICAO_MAX} · mínimo ${DESCRICAO_MIN}</p>
      ${erroHtml('descricao')}

      <h4 class="rfp-pergunta">Fotos de referência <span class="rfp-opcional">(opcional, até ${MAX_FOTOS})</span></h4>
      <div class="rfp-fotos">
        ${previas.map((u, i) => `
          <div class="rfp-foto"><img src="${u}" alt="Referência ${i + 1}"><button type="button" data-rfp-tirar-foto="${i}" aria-label="Remover foto">${ICONE_FECHAR}</button></div>`).join('')}
        ${dados.referencias.length < MAX_FOTOS ? `
          <label class="rfp-dropzone" id="rfp-dropzone">
            ${ICONE_FOTO}<span>Arraste ou clique para adicionar</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple data-rfp-fotos hidden>
          </label>` : ''}
      </div>
      ${erroHtml('fotos')}`;
  }

  function htmlEtapa4() {
    return `
      <h4 class="rfp-pergunta">Quantas propostas você quer receber?</h4>
      <div class="rfp-pilulas" role="radiogroup">
        ${LIMITES.map(l => `<button type="button" class="rfp-pilula${l.valor === dados.limitePropostas ? ' ativa' : ''}" role="radio" aria-checked="${l.valor === dados.limitePropostas}" data-rfp-campo="limitePropostas" data-rfp-valor="${l.valor === null ? '' : l.valor}">${esc(l.nome)}</button>`).join('')}
      </div>
      <p class="rfp-dica">O pedido fecha sozinho quando chegar ao limite.</p>

      <div class="rfp-aviso">
        ${ICONE_CADEADO}
        <p>Seu telefone e WhatsApp <b>não são mostrados</b> aos fornecedores. As propostas, a conversa e o fechamento acontecem com segurança dentro da Love.</p>
      </div>

      <h4 class="rfp-pergunta">Como os fornecedores vão ver seu pedido</h4>
      ${cardDoFeed()}`;
  }

  // Prévia do card da oportunidade no feed dos fornecedores.
  function cardDoFeed() {
    const cat = categoriaPorId(dados.categoria);
    const faixa = FAIXAS.find(f => f.id === dados.faixa);
    const quando = dados.dataFlexivel || !dados.dataEvento ? 'Data flexível' : formatarData(dados.dataEvento);
    const local = [dados.bairro, dados.cidade].filter(s => s && s.trim()).join(', ') + (dados.uf ? ` - ${dados.uf.toUpperCase()}` : '');
    const periodo = dados.periodo === 'horas' ? `${dados.horasServico || '?'}h de serviço` : nomeDe(PERIODOS, dados.periodo);
    const desc = dados.descricao.trim();
    return `
      <article class="rfp-feed-card">
        <div class="rfp-feed-topo">
          <span class="rfp-feed-categoria">${esc(cat ? cat.nome : '')}</span>
          <span class="rfp-feed-novo">Novo</span>
        </div>
        <h5>${esc(cat ? cat.nome : 'Serviço')} para ${esc(nomeDe(CELEBRACOES, dados.tipoCelebracao).toLowerCase() || 'evento')}</h5>
        <ul class="rfp-feed-meta">
          <li>${esc(quando)}</li><li>${esc(local)}</li>
          <li>${esc(nomeDe(CONVIDADOS, dados.convidados))} convidados</li><li>${esc(periodo)}</li>
        </ul>
        <p class="rfp-feed-faixa">${esc(faixa ? `${faixa.nome} · ${faixa.faixa}` : '')}${dados.aceitaForaDaFaixa ? ' · aceita fora da faixa' : ''}</p>
        ${dados.especialidades.length ? `<div class="rfp-feed-tags">${dados.especialidades.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
        <p class="rfp-feed-desc">${esc(desc.length > 220 ? desc.slice(0, 220) + '…' : desc)}</p>
        <p class="rfp-feed-rodape">${dados.referencias.length ? `${dados.referencias.length} foto(s) de referência · ` : ''}${dados.limitePropostas ? `Até ${dados.limitePropostas} propostas` : 'Propostas sem limite'}</p>
      </article>`;
  }

  /** @param {string} iso */
  function formatarData(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return '';
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // --------------------------------------------------------------------------
  // Interações
  // --------------------------------------------------------------------------

  /** @param {string} campo @param {string} valor */
  function escolher(campo, valor) {
    const d = /** @type {any} */ (dados);
    if (campo === 'limitePropostas') d.limitePropostas = valor === '' ? null : Number(valor);
    else d[campo] = valor;
    if (campo === 'categoria') dados.especialidades = [];
    if (campo === 'periodo' && valor !== 'horas') dados.horasServico = null;
    delete erros[campo];
    desenhar(0);
  }

  /** @param {string} tag */
  function alternarTag(tag) {
    const i = dados.especialidades.indexOf(tag);
    if (i >= 0) dados.especialidades.splice(i, 1); else dados.especialidades.push(tag);
    desenhar(0);
  }

  /** @param {Event} e */
  function aoDigitar(e) {
    const el = /** @type {HTMLInputElement} */ (e.target);
    if (el.matches('[data-rfp-fotos]')) { if (e.type === 'change') adicionarFotos(Array.from(el.files || [])); return; }
    const campo = el.dataset ? el.dataset.rfpInput : '';
    if (!campo) return;
    const d = /** @type {any} */ (dados);
    if (el.type === 'checkbox') {
      d[campo] = el.checked;
      if (campo === 'dataFlexivel') { if (el.checked) dados.dataEvento = ''; delete erros.dataEvento; desenhar(0); }
      return;
    }
    if (campo === 'horasServico') { dados.horasServico = el.value ? Number(el.value) : null; return; }
    if (campo === 'uf') el.value = el.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (campo === 'cep') {
      const num = el.value.replace(/\D/g, '').slice(0, 8);
      el.value = num.length > 5 ? `${num.slice(0, 5)}-${num.slice(5)}` : num;
      dados.cep = el.value;
      if (num.length === 8 && e.type === 'input') buscarCep(num);
      return;
    }
    d[campo] = el.value;
    if (campo === 'descricao') {
      const tam = el.value.trim().length;
      const cont = document.getElementById('rfp-contador');
      if (cont) { cont.textContent = `${tam}/${DESCRICAO_MAX} · mínimo ${DESCRICAO_MIN}`; cont.classList.toggle('falta', tam > 0 && tam < DESCRICAO_MIN); }
    }
  }

  // CEP → cidade, bairro e UF (ViaCEP, serviço público dos Correios).
  /** @param {string} cep */
  async function buscarCep(cep) {
    const status = document.getElementById('rfp-cep-status');
    if (status) status.textContent = 'Buscando…';
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const j = await resp.json();
      if (j && !j.erro) {
        dados.cidade = j.localidade || dados.cidade;
        dados.bairro = j.bairro || dados.bairro;
        dados.uf = (j.uf || dados.uf || '').toUpperCase();
        delete erros.cidade; delete erros.uf;
        desenhar(0);
        const s = document.getElementById('rfp-cep-status');
        if (s) s.textContent = 'Endereço encontrado';
        return;
      }
      if (status) status.textContent = 'CEP não encontrado';
    } catch (err) {
      if (status) status.textContent = 'Não deu para buscar o CEP agora';
    }
  }

  /** @param {File[]} arquivos */
  function adicionarFotos(arquivos) {
    delete erros.fotos;
    for (const f of arquivos) {
      if (dados.referencias.length >= MAX_FOTOS) { erros.fotos = `No máximo ${MAX_FOTOS} fotos.`; break; }
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { erros.fotos = 'Use fotos JPG, PNG ou WebP.'; continue; }
      if (f.size > MAX_FOTO_BYTES) { erros.fotos = 'Cada foto pode ter até 5 MB.'; continue; }
      dados.referencias.push(f);
      previas.push(URL.createObjectURL(f));
    }
    desenhar(0);
  }

  /** @param {number} i */
  function tirarFoto(i) {
    dados.referencias.splice(i, 1);
    const [u] = previas.splice(i, 1);
    if (u) URL.revokeObjectURL(u);
    desenhar(0);
  }

  // Arrastar fotos para a área de upload.
  document.addEventListener('dragover', (e) => {
    const zona = e.target instanceof Element ? e.target.closest('#rfp-dropzone') : null;
    if (zona) { e.preventDefault(); zona.classList.add('arrastando'); }
  });
  document.addEventListener('dragleave', (e) => {
    const zona = e.target instanceof Element ? e.target.closest('#rfp-dropzone') : null;
    if (zona) zona.classList.remove('arrastando');
  });
  document.addEventListener('drop', (e) => {
    const zona = e.target instanceof Element ? e.target.closest('#rfp-dropzone') : null;
    if (!zona) return;
    e.preventDefault();
    adicionarFotos(Array.from((e.dataTransfer && e.dataTransfer.files) || []));
  });

  // --------------------------------------------------------------------------
  // Publicar
  // --------------------------------------------------------------------------

  /** @param {string} msg */
  function mostrarErroGeral(msg) {
    const el = document.getElementById('rfp-erro-geral');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('hidden', !msg);
  }

  async function publicar() {
    // Confere tudo de novo antes de mandar.
    for (const n of [1, 2, 3]) {
      const e = validarEtapa(n);
      if (Object.keys(e).length) { erros = e; return irPara(n, -1); }
    }
    const usuario = window.loveClienteSession && window.loveClienteSession.user;
    if (!usuario || typeof supabaseClient === 'undefined') return mostrarErroGeral('Entre na sua conta para publicar o pedido.');

    publicando = true;
    mostrarErroGeral('');
    desenhar(0);
    try {
      /** @type {string[]} */
      const urls = [];
      for (const [i, foto] of dados.referencias.entries()) {
        const ext = foto.type === 'image/png' ? 'png' : foto.type === 'image/webp' ? 'webp' : 'jpg';
        const caminho = `pedidos/${usuario.id}/${Date.now()}-${i}.${ext}`;
        const { error } = await supabaseClient.storage.from('clientes').upload(caminho, foto, { contentType: foto.type });
        if (error) throw new Error('Não foi possível enviar as fotos de referência.');
        urls.push(supabaseClient.storage.from('clientes').getPublicUrl(caminho).data.publicUrl);
      }
      const faixa = FAIXAS.find(f => f.id === dados.faixa);
      const eventoId = typeof window.getLoveActiveEventId === 'function' ? window.getLoveActiveEventId() : null;
      const linha = {
        cliente_id: usuario.id,
        evento_id: /^[0-9a-f-]{36}$/i.test(String(eventoId || '')) ? eventoId : null,
        categoria: dados.categoria,
        especialidades: dados.especialidades,
        tipo_celebracao: dados.tipoCelebracao,
        data_evento: dados.dataFlexivel ? null : dados.dataEvento,
        data_flexivel: dados.dataFlexivel,
        cep: dados.cep || null,
        cidade: dados.cidade.trim(),
        bairro: dados.bairro.trim() || null,
        uf: dados.uf.trim().toUpperCase(),
        convidados: dados.convidados,
        periodo: dados.periodo,
        horas_servico: dados.periodo === 'horas' ? dados.horasServico : null,
        faixa: dados.faixa,
        valor_min: faixa ? faixa.min : null,
        valor_max: faixa ? faixa.max : null,
        aceita_fora_da_faixa: dados.aceitaForaDaFaixa,
        descricao: dados.descricao.trim(),
        referencias: urls,
        limite_propostas: dados.limitePropostas
      };
      const { error } = await supabaseClient.from('pedidos_orcamento').insert(linha);
      if (error) throw new Error(tabelaAusente(error) ? 'Os pedidos de orçamento ainda não foram ativados no banco.' : 'Não foi possível publicar agora. Tente de novo.');
      publicando = false;
      fechar();
      avisoNaLista('Pedido publicado. Os fornecedores da categoria já podem enviar propostas.');
      mostrarLista();
    } catch (err) {
      publicando = false;
      desenhar(0);
      mostrarErroGeral(err instanceof Error ? err.message : 'Não foi possível publicar agora.');
    }
  }

  /** @param {any} error */
  const tabelaAusente = (error) => !!error && (error.code === '42P01' || error.code === 'PGRST205' || /pedidos_orcamento/.test(String(error.message || '')));

  // --------------------------------------------------------------------------
  // Lista: Fornecedores › Pedidos de orçamento
  // --------------------------------------------------------------------------

  /** @param {string} msg */
  function avisoNaLista(msg) {
    const el = document.getElementById('rfp-lista-aviso');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('hidden', !msg);
    if (msg) setTimeout(() => el.classList.add('hidden'), 6000);
  }

  async function mostrarLista() {
    const corpo = document.getElementById('rfp-lista');
    const contagem = document.getElementById('rfp-contagem');
    if (!corpo) return;
    const usuario = window.loveClienteSession && window.loveClienteSession.user;
    if (!usuario || typeof supabaseClient === 'undefined') {
      corpo.innerHTML = linhaVazia('Entre na sua conta para ver seus pedidos de orçamento.');
      if (contagem) contagem.textContent = '';
      return;
    }
    corpo.innerHTML = linhaVazia('Carregando…');
    const { data, error } = await supabaseClient
      .from('pedidos_orcamento')
      .select('id, categoria, especialidades, tipo_celebracao, data_evento, data_flexivel, cidade, bairro, uf, faixa, limite_propostas, propostas_recebidas, status, created_at')
      .eq('cliente_id', usuario.id)
      .order('created_at', { ascending: false });
    if (error) {
      corpo.innerHTML = linhaVazia(tabelaAusente(error) ? 'Os pedidos de orçamento ainda não foram ativados no banco.' : 'Não foi possível carregar seus pedidos agora.');
      if (contagem) contagem.textContent = '';
      return;
    }
    const linhas = data || [];
    if (contagem) contagem.textContent = linhas.length === 1 ? '1 pedido' : `${linhas.length} pedidos`;
    if (!linhas.length) {
      corpo.innerHTML = `<tr><td colspan="7" class="rfp-vazio">
        <p><b>Você ainda não pediu orçamentos.</b></p>
        <p>Conte o que precisa e os fornecedores mandam propostas para você — sem precisar procurar um por um.</p>
        <button type="button" class="btn-primary rfp-btn" data-rfp-novo>${ICONE_MAIS}<span>Novo pedido</span></button>
      </td></tr>`;
      return;
    }
    corpo.innerHTML = linhas.map(p => {
      const cat = categoriaPorId(p.categoria);
      const faixa = FAIXAS.find(f => f.id === p.faixa);
      const quando = p.data_flexivel || !p.data_evento ? 'Data flexível' : formatarData(p.data_evento);
      const local = [p.bairro, p.cidade].filter(Boolean).join(', ') + (p.uf ? ` - ${p.uf}` : '');
      const situacao = SITUACOES[/** @type {'aberto'|'fechado'|'cancelado'} */ (p.status)] || p.status;
      return `
        <tr data-rfp-id="${esc(p.id)}">
          <td><b class="rfp-col-titulo">${esc(cat ? cat.nome : p.categoria)}</b>${(p.especialidades || []).length ? `<span class="rfp-col-sub">${esc(p.especialidades.slice(0, 2).join(', '))}${p.especialidades.length > 2 ? ` +${p.especialidades.length - 2}` : ''}</span>` : ''}</td>
          <td>${esc(nomeDe(CELEBRACOES, p.tipo_celebracao))}<span class="rfp-col-sub">${esc(quando)}</span></td>
          <td>${esc(local)}</td>
          <td>${esc(faixa ? faixa.nome : '')}<span class="rfp-col-sub">${esc(faixa ? faixa.faixa : '')}</span></td>
          <td class="rfp-col-num">${p.propostas_recebidas || 0}${p.limite_propostas ? ` / ${p.limite_propostas}` : ''}</td>
          <td><span class="rfp-situacao rfp-situacao-${esc(p.status)}">${esc(situacao)}</span></td>
          <td class="love-tabela-col-acoes">
            <div class="rfp-menu-wrap">
              <button type="button" class="rfp-menu-btn" data-rfp-menu aria-label="Ações do pedido">⋯</button>
              <div class="rfp-menu hidden" role="menu">
                ${p.status === 'aberto' ? '<button type="button" role="menuitem" data-rfp-acao="encerrar">Encerrar pedido</button>' : ''}
                <button type="button" role="menuitem" data-rfp-acao="excluir">Excluir</button>
              </div>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  /** @param {string} texto */
  const linhaVazia = (texto) => `<tr><td colspan="7" class="rfp-vazio"><p>${esc(texto)}</p></td></tr>`;

  // Ações da lista (Novo pedido, menu ⋯, encerrar, excluir).
  document.addEventListener('click', async (e) => {
    const alvo = e.target instanceof Element ? e.target : null;
    if (!alvo) return;
    if (alvo.closest('[data-rfp-novo]')) { abrir(); return; }
    const abertos = document.querySelectorAll('.rfp-menu:not(.hidden)');
    const btnMenu = alvo.closest('[data-rfp-menu]');
    if (btnMenu) {
      const menu = btnMenu.parentElement && btnMenu.parentElement.querySelector('.rfp-menu');
      abertos.forEach(m => { if (m !== menu) m.classList.add('hidden'); });
      if (menu) menu.classList.toggle('hidden');
      return;
    }
    const acao = /** @type {HTMLElement|null} */ (alvo.closest('[data-rfp-acao]'));
    abertos.forEach(m => m.classList.add('hidden'));
    if (!acao) return;
    const linha = /** @type {HTMLElement|null} */ (acao.closest('[data-rfp-id]'));
    const id = linha && linha.dataset.rfpId;
    if (!id || typeof supabaseClient === 'undefined') return;
    if (acao.dataset.rfpAcao === 'excluir' && !confirm('Excluir este pedido de orçamento? Os fornecedores deixam de vê-lo.')) return;
    const { error } = acao.dataset.rfpAcao === 'encerrar'
      ? await supabaseClient.from('pedidos_orcamento').update({ status: 'fechado' }).eq('id', id)
      : await supabaseClient.from('pedidos_orcamento').delete().eq('id', id);
    avisoNaLista(error ? 'Não foi possível concluir agora. Tente de novo.' : (acao.dataset.rfpAcao === 'encerrar' ? 'Pedido encerrado.' : 'Pedido excluído.'));
    mostrarLista();
  });

  window.LovePedidos = { abrir, mostrarLista, CATEGORIAS, FAIXAS };
})();
