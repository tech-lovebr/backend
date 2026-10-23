/* ==========================================================================
   LOVE ADMIN — Settings · E-mails
   Métricas do Amazon SES a partir do livro-razão (email_envios), que as
   funções da Vercel preenchem no envio e a /api/ses-eventos atualiza com os
   eventos da AWS (entregue, bounce, denúncia, abertura, clique). A conexão,
   a conta do SES, o custo e o envio passam pela /api/emails.
   ========================================================================== */

const API_EMAILS = 'https://love.com.br/api/emails';

const STATUS_EMAIL = {
  entregue: ['Entregue', 'badge-success'],
  enviado: ['Enviado', 'badge-info'],
  atrasado: ['Atrasado', 'badge-warning'],
  bounce: ['Bounce', 'badge-danger'],
  denuncia: ['Denúncia', 'badge-danger'],
  rejeitado: ['Rejeitado', 'badge-danger'],
  falhou: ['Falhou', 'badge-danger']
};
const FALHAS = ['bounce', 'denuncia', 'rejeitado', 'falhou'];
const CATEGORIAS_EMAIL = ['Comunicados', 'Novidades', 'Marketing', 'Sistema', 'Atendimento', 'Autenticação', 'Segurança e senha'];
const CORES_EMAIL = { disparados: '#E4E4E7', entregues: '#1baf7a', bounces: '#eb6834' };

let DIAS = 7;
let ENVIOS = [];
let TEMPLATES = [];
let SITUACAO = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  montarPeriodo();
  addHeaderAction('Escrever e-mail', () => abrirEscrever(), {
    principal: true,
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1" /><path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z" /><path d="M16 5l3 3" /></svg>'
  });

  const novoTemplate = document.createElement('button');
  novoTemplate.type = 'button';
  novoTemplate.className = 'btn btn-ghost';
  novoTemplate.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5l0 14" /><path d="M5 12l14 0" /></svg><span>Novo template</span>';
  novoTemplate.addEventListener('click', () => abrirTemplate());
  document.querySelector('#aba-templates .table-toolbar-dir').appendChild(novoTemplate);

  document.querySelectorAll('#abas-emails [data-aba]').forEach(aba => aba.addEventListener('click', () => {
    document.querySelectorAll('#abas-emails [data-aba]').forEach(a => a.classList.toggle('is-active', a === aba));
    document.getElementById('aba-metricas').hidden = aba.dataset.aba !== 'metricas';
    document.getElementById('aba-templates').hidden = aba.dataset.aba !== 'templates';
    document.querySelector('.periodo-segmentado')?.toggleAttribute('hidden', aba.dataset.aba !== 'metricas');
  }));
  document.getElementById('busca').addEventListener('input', renderEnvios);
  document.getElementById('filtro-status').addEventListener('change', renderEnvios);
  document.getElementById('busca-templates').addEventListener('input', renderTemplates);

  await Promise.all([carregarEnvios(), carregarSituacao(), carregarTemplates()]);
});

/* ------------------------------------------------------------ Período */

function montarPeriodo() {
  const host = document.getElementById('header-actions');
  const grupo = document.createElement('div');
  grupo.className = 'periodo-segmentado';
  grupo.innerHTML = [7, 30, 90].map(d => `<button type="button" data-dias="${d}" class="${d === DIAS ? 'is-active' : ''}">${d} dias</button>`).join('');
  grupo.addEventListener('click', async (e) => {
    const botao = e.target.closest('[data-dias]');
    if (!botao || Number(botao.dataset.dias) === DIAS) return;
    DIAS = Number(botao.dataset.dias);
    grupo.querySelectorAll('[data-dias]').forEach(b => b.classList.toggle('is-active', b === botao));
    await Promise.all([carregarEnvios(), carregarSituacao()]);
  });
  host.prepend(grupo);
}

/* ------------------------------------------------------------ Dados */

async function chamarApi(metodo, corpo, consulta = '') {
  const { data: { session } } = await supabaseClient.auth.getSession();
  const r = await fetch(`${API_EMAILS}${consulta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(metodo === 'GET' ? 25000 : 60000)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}

function inicioDoPeriodo() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (DIAS - 1));
  return d;
}

async function carregarEnvios() {
  renderLoading(document.getElementById('tbody-envios'), 7);
  const r = await safeSelect('email_envios', '*', q => q
    .gte('created_at', inicioDoPeriodo().toISOString())
    .order('created_at', { ascending: false })
    .limit(5000));
  if (r.error) {
    ENVIOS = [];
    renderEmpty(document.getElementById('tbody-envios'), 7, 'Banco ainda não está preparado',
      'Rode supabase/migrations/091_emails_e_moeda_dos_planos.sql no SQL Editor do Supabase.');
  } else {
    ENVIOS = r.data;
    renderEnvios();
  }
  renderKpis();
  renderGraficoDias();
  renderCategorias();
}

async function carregarSituacao() {
  // O quadro aparece na hora; a consulta à AWS completa depois.
  if (!SITUACAO) { SITUACAO = { verificando: true }; renderConexao(); }
  try {
    SITUACAO = await chamarApi('GET', null, `?dias=${DIAS}`);
  } catch (e) {
    SITUACAO = { erroApi: e.name === 'TimeoutError' ? 'A AWS demorou para responder' : e.message };
  }
  renderConexao();
  renderKpis();
}

async function carregarTemplates() {
  const r = await safeSelect('email_templates', '*', q => q.order('updated_at', { ascending: false }));
  TEMPLATES = r.error ? [] : r.data;
  renderTemplates();
}

/* ------------------------------------------------------------ Conexão */

function renderConexao() {
  const host = document.getElementById('conexao-ses');
  const s = SITUACAO || {};
  let html = '';

  if (s.verificando) {
    html = `<div class="conexao-texto"><strong>Amazon SES</strong>
      <p>Verificando a conexão com a sua conta AWS...</p><ul class="conexao-lista" id="conexao-passos"></ul></div>
      <button type="button" class="btn btn-primary" id="btn-conectar-ses">Conectar Amazon SES</button>`;
  } else if (s.erroApi) {
    html = `<div class="conexao-texto"><strong>Não foi possível falar com a função de e-mails</strong>
      <p>${escapeHtml(s.erroApi)}. Você ainda pode tentar conectar.</p><ul class="conexao-lista" id="conexao-passos"></ul></div>
      <button type="button" class="btn btn-primary" id="btn-conectar-ses">Conectar Amazon SES</button>`;
  } else if (!s.configurado) {
    html = `<div class="conexao-texto"><strong>Amazon SES sem chaves</strong>
      <p>Coloque AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY e EMAIL_FROM nas variáveis da Vercel.</p></div>`;
  } else if (!s.conectado) {
    const itens = [
      ['Conjunto de configuração "love-eventos"', s.eventos?.conjunto],
      ['Eventos publicados no SNS', s.eventos?.destino],
      ['Inscrição da Love confirmada', s.eventos?.inscricao === 'confirmada'],
      [`Eventos ligados a todo e-mail de ${s.dominio || 'love.com.br'}`, s.identidade?.conjunto === 'love-eventos']
    ];
    html = `
      <div class="conexao-texto">
        <strong>Conecte os eventos do Amazon SES</strong>
        <p>Sem isso, os disparos aparecem como Enviado, mas entregas, bounces, denúncias e aberturas não chegam. A Love cria a ligação na sua conta AWS sozinha.</p>
        <ul class="conexao-lista">${itens.map(([t, ok]) => `<li class="${ok ? 'is-ok' : ''}">${ok ? '✓' : '·'} ${escapeHtml(t)}</li>`).join('')}</ul>
        <ul class="conexao-lista" id="conexao-passos"></ul>
      </div>
      <button type="button" class="btn btn-primary" id="btn-conectar-ses">Conectar Amazon SES</button>`;
  } else if (s.conta && !s.conta.producao) {
    html = `<div class="conexao-texto"><strong>Conta do SES em sandbox</strong>
      <p>Só sai e-mail para endereços verificados no SES. Peça o acesso de produção no console da AWS (SES → Account dashboard → Request production access).</p></div>`;
  }

  host.hidden = !html;
  host.innerHTML = html;
  document.getElementById('btn-conectar-ses')?.addEventListener('click', conectarSes);
}

async function conectarSes() {
  const botao = document.getElementById('btn-conectar-ses');
  const lista = document.getElementById('conexao-passos');
  botao.disabled = true;
  botao.textContent = 'Conectando...';
  try {
    const r = await chamarApi('POST', { acao: 'conectar' });
    lista.innerHTML = r.passos.map(p => `
      <li class="${p.ok ? 'is-ok' : 'is-erro'}">${p.ok ? '✓' : '×'} ${escapeHtml(p.nome)}${p.detalhe ? ` <span>${escapeHtml(p.detalhe)}</span>` : ''}</li>`).join('');
    if (r.ok) {
      toast('Amazon SES conectado');
      setTimeout(carregarSituacao, 4000);
    } else {
      toast('Algum passo falhou. Veja o motivo na lista.');
    }
  } catch (e) {
    toast(e.message);
  }
  botao.disabled = false;
  botao.textContent = 'Conectar Amazon SES';
}

/* ------------------------------------------------------------ Métricas */

function renderKpis() {
  const total = ENVIOS.length;
  const entregues = ENVIOS.filter(e => e.status === 'entregue').length;
  const bounces = ENVIOS.filter(e => e.status === 'bounce').length;
  const denuncias = ENVIOS.filter(e => e.status === 'denuncia').length;
  const falhas = ENVIOS.filter(e => FALHAS.includes(e.status)).length;
  const aguardando = ENVIOS.filter(e => e.status === 'enviado' || e.status === 'atrasado').length;
  const finalizados = total - aguardando;
  const taxa = finalizados ? (entregues / finalizados) * 100 : null;
  const abertos = ENVIOS.filter(e => e.aberto_em).length;

  const reputacao = SITUACAO?.conta?.reputacao;
  const textoReputacao = reputacao === 'HEALTHY' ? 'Reputação saudável no SES'
    : reputacao === 'PROBATION' ? 'Conta em observação no SES'
      : reputacao === 'SHUTDOWN' ? 'Envio suspenso pelo SES'
        : `${formatNumber(abertos)} aberturas`;

  const custo = SITUACAO?.custo;
  const valorCusto = custo && !custo.erro
    ? (custo.brl != null ? formatCurrency(custo.brl) : `US$ ${custo.usd.toFixed(4)}`)
    : '—';
  const subCusto = custo?.erro ? 'Sem permissão ce:GetCostAndUsage'
    : custo ? `US$ ${Number(custo.usd || 0).toFixed(4)} na AWS SES` : 'Carregando...';

  const tile = (label, value, sub) => `
    <div class="kpi"><p class="kpi-label">${label}</p><p class="kpi-value">${value}</p><p class="kpi-sub">${sub}</p></div>`;

  document.getElementById('kpi-grid').innerHTML = [
    tile('Total de disparos', formatNumber(total), `${formatNumber(entregues)} entregues com sucesso`),
    tile('Entregabilidade', taxa == null ? '—' : `${taxa.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`, textoReputacao),
    tile('Bounces / falhas', formatNumber(falhas), `${formatNumber(bounces)} bounces · ${formatNumber(denuncias)} denúncias`),
    tile('Custo acumulado', valorCusto, subCusto)
  ].join('');
}

function diasDoPeriodo() {
  const inicio = inicioDoPeriodo();
  return Array.from({ length: DIAS }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(d.getDate() + i);
    return d;
  });
}

const chaveDoDia = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function renderGraficoDias() {
  const host = document.getElementById('grafico-dias');
  const dias = diasDoPeriodo();
  const porDia = new Map(dias.map(d => [chaveDoDia(d), { disparados: 0, entregues: 0, bounces: 0 }]));
  ENVIOS.forEach(e => {
    const b = porDia.get(chaveDoDia(new Date(e.created_at)));
    if (!b) return;
    b.disparados += 1;
    if (e.status === 'entregue') b.entregues += 1;
    if (FALHAS.includes(e.status)) b.bounces += 1;
  });
  const serie = dias.map(d => ({ dia: d, ...porDia.get(chaveDoDia(d)) }));

  const largura = Math.max(host.clientWidth || 560, 280);
  const altura = 240;
  const m = { esq: 36, dir: 8, topo: 10, base: 26 };
  const w = largura - m.esq - m.dir;
  const h = altura - m.topo - m.base;
  const maximo = Math.max(4, ...serie.map(s => s.disparados));
  const teto = Math.ceil(maximo / 4) * 4;
  const y = v => m.topo + h - (v / teto) * h;
  const grupo = w / serie.length;
  const barra = Math.max(2, Math.min(18, (grupo - 6) / 3));
  const passoRotulo = Math.ceil(serie.length / 10);

  const grade = [0, .25, .5, .75, 1].map(f => Math.round(f * teto)).map(v => `
    <line x1="${m.esq}" x2="${largura - m.dir}" y1="${y(v)}" y2="${y(v)}" class="custos-grade" />
    <text x="${m.esq - 8}" y="${y(v) + 4}" text-anchor="end" class="custos-eixo">${v}</text>`).join('');

  const barras = serie.map((s, i) => {
    const centro = m.esq + grupo * i + grupo / 2;
    const rect = (v, k, dx) => v ? `<rect x="${centro + dx}" y="${y(v)}" width="${barra}" height="${y(0) - y(v)}" rx="2" fill="${CORES_EMAIL[k]}"><title>${s.dia.toLocaleDateString('pt-BR')}: ${v} ${k}</title></rect>` : '';
    return `
      ${rect(s.disparados, 'disparados', -barra * 1.5 - 1)}
      ${rect(s.entregues, 'entregues', -barra / 2)}
      ${rect(s.bounces, 'bounces', barra / 2 + 1)}
      ${i % passoRotulo === 0 ? `<text x="${centro}" y="${altura - 6}" text-anchor="middle" class="custos-eixo">${s.dia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</text>` : ''}`;
  }).join('');

  host.innerHTML = `
    <svg width="${largura}" height="${altura}" role="img" aria-label="Volume e entregas diárias">${grade}${barras}</svg>
    <ul class="grafico-legenda">
      <li><span style="background:${CORES_EMAIL.disparados}"></span>Disparados</li>
      <li><span style="background:${CORES_EMAIL.entregues}"></span>Entregues</li>
      <li><span style="background:${CORES_EMAIL.bounces}"></span>Bounces e falhas</li>
    </ul>`;
}

function renderCategorias() {
  const host = document.getElementById('grafico-categorias');
  const total = ENVIOS.length;
  const mapa = new Map();
  ENVIOS.forEach(e => mapa.set(e.categoria || 'Sistema', (mapa.get(e.categoria || 'Sistema') || 0) + 1));
  const linhas = [...mapa.entries()].sort((a, b) => b[1] - a[1]);

  host.innerHTML = `
    ${linhas.length ? `<ul class="categorias-barras">
      ${linhas.map(([nome, qtd]) => {
        const pct = Math.round((qtd / total) * 100);
        return `<li>
          <div class="categorias-linha"><span>${escapeHtml(nome)}</span><strong>${pct}% (${formatNumber(qtd)})</strong></div>
          <div class="categorias-trilho"><span style="width:${Math.max(pct, 1)}%"></span></div>
        </li>`;
      }).join('')}
    </ul>` : '<div class="empty-state"><strong>Nenhum disparo no período</strong><p>Os envios aparecem aqui assim que saírem pelo SES.</p></div>'}
    <div class="categorias-provedor"><span>Provedor principal</span><strong>Amazon SES</strong></div>`;
}

/* ------------------------------------------------------------ Registro */

function latencia(ms) {
  if (ms == null) return '—';
  return ms >= 1000 ? `${(ms / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}s` : `${ms}ms`;
}

function renderEnvios() {
  const tbody = document.getElementById('tbody-envios');
  const termo = document.getElementById('busca').value.trim().toLowerCase();
  const status = document.getElementById('filtro-status').value;
  const lista = ENVIOS.filter(e => (!status || e.status === status)
    && (!termo || [e.destinatario, e.assunto, e.template, e.remetente].some(v => String(v || '').toLowerCase().includes(termo))));

  if (!lista.length) {
    renderEmpty(tbody, 7, 'Nenhum disparo', ENVIOS.length ? 'Nada encontrado para esse filtro.' : 'Nenhum e-mail saiu pelo SES neste período.');
    return;
  }

  tbody.innerHTML = lista.slice(0, 500).map(e => {
    const [rotulo, classe] = STATUS_EMAIL[e.status] || [e.status, ''];
    return `
      <tr data-envio="${e.id}">
        <td><span class="cell-strong">${escapeHtml(e.assunto || e.template || '—')}</span>${e.template && e.template !== e.assunto ? `<span class="cell-sub">${escapeHtml(e.template)}</span>` : ''}</td>
        <td class="cell-mono">${escapeHtml(e.destinatario)}</td>
        <td class="cell-muted">${escapeHtml(e.remetente || '—')}</td>
        <td>${badge(rotulo, classe)}</td>
        <td class="cell-muted">${escapeHtml(e.provedor || 'Amazon SES')}</td>
        <td class="col-numero cell-mono">${latencia(e.latencia_ms)}</td>
        <td class="cell-muted" title="${escapeHtml(formatDateTime(e.created_at))}">${escapeHtml(formatRelative(e.created_at))}</td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-envio]').forEach(tr => tr.addEventListener('click', () => {
    abrirEnvio(ENVIOS.find(e => e.id === tr.dataset.envio));
  }));
}

function abrirEnvio(e) {
  const [rotulo, classe] = STATUS_EMAIL[e.status] || [e.status, ''];
  const linha = (rotulo, valor) => valor ? `<div class="dados-linha"><span class="rotulo">${rotulo}</span><span class="valor">${valor}</span></div>` : '';
  const NOME_EVENTO = { send: 'Enviado ao SES', delivery: 'Entregue', bounce: 'Bounce', complaint: 'Denúncia de spam', reject: 'Rejeitado', open: 'Aberto', click: 'Link clicado', deliverydelay: 'Entrega atrasada', renderingfailure: 'Falha ao montar' };

  Drawer.open({
    title: e.assunto || e.template || 'E-mail',
    subtitle: e.destinatario,
    body: `
      <div class="lista-dados">
        ${linha('Status', badge(rotulo, classe))}
        ${linha('Erro', e.erro ? escapeHtml(e.erro) : '')}
        ${linha('Template', escapeHtml(e.template || ''))}
        ${linha('Categoria', escapeHtml(e.categoria || ''))}
        ${linha('Remetente', escapeHtml(e.remetente || ''))}
        ${linha('Destinatário', escapeHtml(e.destinatario))}
        ${linha('Provedor', escapeHtml(e.provedor || 'Amazon SES'))}
        ${linha('Latência', latencia(e.latencia_ms))}
        ${linha('Enviado em', escapeHtml(formatDateTime(e.created_at)))}
        ${linha('Entregue em', e.entregue_em ? escapeHtml(formatDateTime(e.entregue_em)) : '')}
        ${linha('Aberto em', e.aberto_em ? escapeHtml(formatDateTime(e.aberto_em)) : '')}
        ${linha('Clicado em', e.clicado_em ? escapeHtml(formatDateTime(e.clicado_em)) : '')}
        ${linha('ID no SES', e.message_id ? `<span class="cell-mono">${escapeHtml(e.message_id)}</span>` : '')}
      </div>
      ${e.trecho ? `<p class="drawer-section-title">Extrato</p><p class="email-trecho">${escapeHtml(e.trecho)}</p>` : ''}
      ${(e.eventos || []).length ? `<p class="drawer-section-title">Eventos da AWS</p>
        <ul class="email-eventos">${e.eventos.map(ev => `<li><span>${escapeHtml(NOME_EVENTO[ev.tipo] || ev.tipo)}</span><span class="cell-muted">${escapeHtml(formatDateTime(ev.em))}</span></li>`).join('')}</ul>` : ''}`,
    footer: '<button type="button" class="btn btn-ghost" id="btn-fechar-envio">Fechar</button>'
  });
  document.getElementById('btn-fechar-envio').addEventListener('click', () => Drawer.close());
}

/* ------------------------------------------------------------ Escrever */

function opcoesDeCategoria(atual) {
  const lista = atual && !CATEGORIAS_EMAIL.includes(atual) ? [...CATEGORIAS_EMAIL, atual] : CATEGORIAS_EMAIL;
  return lista.map(c => `<option ${c === (atual || 'Comunicados') ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
}

function abrirEscrever(template) {
  const remetente = SITUACAO?.remetente || 'Love <contato@love.com.br>';

  Drawer.open({
    title: 'Escrever e-mail',
    subtitle: `Sai pelo Amazon SES, com o layout da Love`,
    body: `
      <form id="form-email">
        <label class="field">
          <span class="field-label">Remetente</span>
          <input class="field-input" name="de" type="text" value="${escapeHtml(remetente)}">
        </label>
        <label class="field">
          <span class="field-label">Para</span>
          <textarea class="field-textarea" name="para" rows="2" placeholder="email@exemplo.com, outro@exemplo.com"></textarea>
        </label>
        <div class="field-row">
          <label class="field">
            <span class="field-label">Template</span>
            <select class="field-select" name="template">
              <option value="">Sem template</option>
              ${TEMPLATES.map(t => `<option value="${t.id}" ${template?.id === t.id ? 'selected' : ''}>${escapeHtml(t.nome)}</option>`).join('')}
            </select>
          </label>
          <label class="field">
            <span class="field-label">Categoria</span>
            <select class="field-select" name="categoria">${opcoesDeCategoria(template?.categoria)}</select>
          </label>
        </div>
        <label class="field">
          <span class="field-label">Assunto</span>
          <input class="field-input" name="assunto" type="text" value="${escapeHtml(template?.assunto || '')}">
        </label>
        <div class="field">
          <span class="field-label">Mensagem</span>
          <div id="editor-email"></div>
        </div>
        ${SITUACAO?.conta && !SITUACAO.conta.producao ? '<p class="field-hint">Conta do SES em sandbox: só chega a endereços verificados na AWS.</p>' : ''}
      </form>`,
    footer: `
      <button type="button" class="btn btn-ghost" id="btn-cancelar">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btn-enviar">Enviar</button>`
  });

  const form = document.getElementById('form-email');
  const editor = EditorRico.montar(document.getElementById('editor-email'), { placeholder: 'Escreva o e-mail.', tabela: false });
  editor.definir(template?.html || '');

  form.template.addEventListener('change', () => {
    const t = TEMPLATES.find(x => x.id === form.template.value);
    if (!t) return;
    form.assunto.value = t.assunto;
    form.categoria.innerHTML = opcoesDeCategoria(t.categoria);
    editor.definir(t.html);
  });

  document.getElementById('btn-cancelar').addEventListener('click', () => Drawer.close());
  document.getElementById('btn-enviar').addEventListener('click', async () => {
    const t = TEMPLATES.find(x => x.id === form.template.value);
    const dados = {
      acao: 'enviar',
      de: form.de.value.trim(),
      para: form.para.value,
      assunto: form.assunto.value.trim(),
      categoria: form.categoria.value,
      template: t?.nome || '',
      html: editor.html()
    };
    if (!dados.para.trim()) return toast('Informe o destinatário');
    if (!dados.assunto) return toast('Informe o assunto');

    Drawer.setFooterBusy(true);
    try {
      const r = await chamarApi('POST', dados);
      Drawer.close();
      toast(r.falhas?.length
        ? `${r.enviados} enviado(s); falhou para ${r.falhas.map(f => f.para).join(', ')}`
        : `${r.enviados} e-mail(s) enviado(s)`);
      carregarEnvios();
    } catch (e) {
      toast(e.message);
    }
    Drawer.setFooterBusy(false);
  });
}

/* ------------------------------------------------------------ Templates */

function renderTemplates() {
  const tbody = document.getElementById('tbody-templates');
  const termo = document.getElementById('busca-templates').value.trim().toLowerCase();
  const lista = TEMPLATES.filter(t => !termo || [t.nome, t.assunto, t.categoria].some(v => String(v || '').toLowerCase().includes(termo)));
  if (!lista.length) {
    renderEmpty(tbody, 4, 'Nenhum template', termo ? 'Nada encontrado para essa busca.' : 'Crie um modelo para reaproveitar nos envios.');
    return;
  }
  tbody.innerHTML = lista.map(t => `
    <tr data-template="${t.id}">
      <td class="cell-strong">${escapeHtml(t.nome)}</td>
      <td>${escapeHtml(t.assunto)}</td>
      <td>${badge(t.categoria || 'Comunicados')}</td>
      <td class="cell-muted">${escapeHtml(formatDateTime(t.updated_at))}</td>
    </tr>`).join('');
  tbody.querySelectorAll('[data-template]').forEach(tr => tr.addEventListener('click', () => {
    abrirTemplate(TEMPLATES.find(t => t.id === tr.dataset.template));
  }));
}

function abrirTemplate(item) {
  const editando = Boolean(item);
  Drawer.open({
    title: editando ? 'Editar template' : 'Novo template',
    subtitle: 'Modelo de e-mail',
    body: `
      <form id="form-template">
        <div class="field-row">
          <label class="field">
            <span class="field-label">Nome</span>
            <input class="field-input" name="nome" type="text" placeholder="Ex.: Novidades do mês" value="${escapeHtml(item?.nome || '')}">
          </label>
          <label class="field">
            <span class="field-label">Categoria</span>
            <select class="field-select" name="categoria">${opcoesDeCategoria(item?.categoria)}</select>
          </label>
        </div>
        <label class="field">
          <span class="field-label">Assunto</span>
          <input class="field-input" name="assunto" type="text" value="${escapeHtml(item?.assunto || '')}">
        </label>
        <div class="field">
          <span class="field-label">Mensagem</span>
          <div id="editor-template"></div>
        </div>
      </form>`,
    footer: `
      ${editando ? '<button type="button" class="btn btn-ghost" id="btn-remover-template" style="margin-right:auto">Remover</button>' : ''}
      ${editando ? '<button type="button" class="btn btn-ghost" id="btn-usar-template">Usar no envio</button>' : ''}
      <button type="button" class="btn btn-ghost" id="btn-cancelar">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btn-salvar">Salvar</button>`
  });

  const form = document.getElementById('form-template');
  const editor = EditorRico.montar(document.getElementById('editor-template'), { placeholder: 'Escreva o modelo.', tabela: false });
  editor.definir(item?.html || '');

  document.getElementById('btn-cancelar').addEventListener('click', () => Drawer.close());
  document.getElementById('btn-usar-template')?.addEventListener('click', () => abrirEscrever(item));
  document.getElementById('btn-remover-template')?.addEventListener('click', async () => {
    if (!(await confirmar(`Remover o template "${item.nome}"?`, { titulo: 'Remover template', rotulo: 'Remover' }))) return;
    const { error } = await supabaseClient.from('email_templates').delete().eq('id', item.id);
    if (error) return toast(`Não foi possível remover: ${error.message}`);
    Drawer.close();
    toast('Template removido');
    carregarTemplates();
  });

  document.getElementById('btn-salvar').addEventListener('click', async () => {
    const payload = {
      nome: form.nome.value.trim(),
      categoria: form.categoria.value,
      assunto: form.assunto.value.trim(),
      html: editor.html(),
      updated_at: new Date().toISOString()
    };
    if (!payload.nome) return toast('Dê um nome ao template');
    if (!payload.assunto) return toast('Informe o assunto');

    Drawer.setFooterBusy(true);
    const { error } = editando
      ? await supabaseClient.from('email_templates').update(payload).eq('id', item.id)
      : await supabaseClient.from('email_templates').insert(payload);
    Drawer.setFooterBusy(false);
    if (error) return toast(`Não foi possível salvar: ${error.message}`);
    Drawer.close();
    toast(editando ? 'Template atualizado' : 'Template criado');
    carregarTemplates();
  });
}
