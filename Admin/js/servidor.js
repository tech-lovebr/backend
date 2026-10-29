/* ==========================================================================
   LOVE ADMIN — Operacional › Servidor
   Saúde da plataforma: latência dos sites e da API (medida do seu computador
   e do servidor), banco, regiões, builds e uso dos últimos 7 dias, com nota
   de A a F por limites fixos (os mesmos da API, em api/servidor.js).

   No topo: "Diagnóstico" abre a lista de melhorias; "Aplicar melhorias"
   aparece sempre que houver alguma que dá para aplicar na Vercel por aqui.
   ========================================================================== */

const API_SERVIDOR = 'https://love.com.br/api/servidor';

// Do computador de quem está olhando (Brasil): HTML inteiro e ida e volta da API.
const LIMITES_NAVEGADOR = { site_ms: [300, 600, 1000, 2000], api_ms: [300, 600, 1000, 2000] };
const LETRAS = ['A', 'B', 'C', 'D', 'F'];
const notaPor = (valor, limites) => {
  if (valor == null || Number.isNaN(valor)) return null;
  const i = limites.findIndex(l => valor <= l);
  return LETRAS[i === -1 ? 4 : i];
};

let DADOS = null;
let NAVEGADOR = null;
let BOTAO_DIAGNOSTICO = null;
let BOTAO_APLICAR = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  addHeaderAction('Atualizar', () => carregar(), {
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" /><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" /></svg>'
  });
  BOTAO_DIAGNOSTICO = addHeaderAction('Diagnóstico', (e) => { e.stopPropagation(); alternarDiagnostico(); }, {
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l3 8l4 -16l3 8h4" /></svg>'
  });
  BOTAO_DIAGNOSTICO?.classList.add('servidor-btn-diagnostico');
  BOTAO_APLICAR = addHeaderAction('Aplicar melhorias', () => aplicarTodas(), {
    principal: true,
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11" /></svg>'
  });
  if (BOTAO_APLICAR) BOTAO_APLICAR.hidden = true;

  document.addEventListener('click', (e) => {
    const menu = document.getElementById('servidor-menu');
    if (menu && !menu.contains(e.target)) menu.remove();
  });

  await carregar();
});

async function sessao() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session?.access_token || '';
}

/* ------------------------------------------------------------ Medições */

/** Mede do navegador: 3 vezes, fica a mediana. */
async function medirDoNavegador(url, opcoes = {}) {
  const tempos = [];
  for (let i = 0; i < 3; i++) {
    const inicio = performance.now();
    try {
      await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, { cache: 'no-store', ...opcoes });
      tempos.push(Math.round(performance.now() - inicio));
    } catch { /* conta como falha */ }
  }
  tempos.sort((a, b) => a - b);
  return tempos.length ? tempos[Math.floor(tempos.length / 2)] : null;
}

async function medirNavegador() {
  const [site, hub, api] = await Promise.all([
    medirDoNavegador('https://love.com.br/', { mode: 'no-cors' }),
    medirDoNavegador('https://hub.love.com.br/login', { mode: 'no-cors' }),
    medirDoNavegador(`${API_SERVIDOR}?ping=1`)
  ]);
  return {
    site_ms: site, hub_ms: hub, api_ms: api,
    nota_site: notaPor(site, LIMITES_NAVEGADOR.site_ms),
    nota_hub: notaPor(hub, LIMITES_NAVEGADOR.site_ms),
    nota_api: notaPor(api, LIMITES_NAVEGADOR.api_ms)
  };
}

async function carregar() {
  const kpis = document.getElementById('kpi-grid');
  kpis.innerHTML = '<div class="kpi"><p class="kpi-label">Medindo…</p><p class="kpi-sub">Sites, API e banco, três vezes cada</p></div>';
  document.getElementById('servidor-corpo').innerHTML = '';
  if (BOTAO_APLICAR) BOTAO_APLICAR.hidden = true;

  try {
    const [token, navegador] = await Promise.all([sessao(), medirNavegador()]);
    NAVEGADOR = navegador;
    const r = await fetch(API_SERVIDOR, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
    DADOS = j;
    render();
  } catch (e) {
    kpis.innerHTML = '';
    document.getElementById('servidor-corpo').innerHTML = `
      <section class="card"><div class="card-body"><div class="empty-state">
        <strong>Não foi possível medir o servidor</strong>
        <p>${escapeHtml(String(e.message || e))}</p>
      </div></div></section>`;
  }
}

/* ------------------------------------------------------------- Render */

const pastilhaNota = (letra, grande = false) => letra
  ? `<span class="nota-servidor nota-${letra}${grande ? ' is-grande' : ''}">${letra}</span>`
  : '<span class="cell-muted">—</span>';
const ms = v => (v == null ? '—' : `${formatNumber(v)} ms`);
const nomeRegiao = cod => (cod ? `${DADOS.regiao.nomes[cod] || cod} <span class="cell-muted">(${escapeHtml(cod)})</span>` : '<span class="cell-muted">—</span>');
const referencia = limites => `A até ${limites[0]} · B até ${limites[1]} · C até ${limites[2]} · D até ${limites[3]}`;

/** Nota geral junta as do servidor com as medidas daqui. */
function notaGeral() {
  const letras = [DADOS.nota_geral, NAVEGADOR.nota_site, NAVEGADOR.nota_hub, NAVEGADOR.nota_api].filter(Boolean);
  if (!letras.length) return null;
  const media = letras.reduce((s, l) => s + (4 - LETRAS.indexOf(l)), 0) / letras.length;
  return LETRAS[4 - Math.round(media)];
}

function render() {
  const d = DADOS;
  const n = NAVEGADOR;
  const geral = notaGeral();
  const aplicaveis = d.melhorias.filter(m => m.aplicavel);

  if (BOTAO_DIAGNOSTICO) BOTAO_DIAGNOSTICO.querySelector('span').textContent = d.melhorias.length ? `Diagnóstico (${d.melhorias.length})` : 'Diagnóstico';
  if (BOTAO_APLICAR) {
    BOTAO_APLICAR.hidden = !aplicaveis.length;
    BOTAO_APLICAR.querySelector('span').textContent = `Aplicar melhorias (${aplicaveis.length})`;
  }

  const tile = (rotulo, valor, sub, nota) => `
    <div class="kpi">
      <p class="kpi-label">${escapeHtml(rotulo)}</p>
      <div class="kpi-linha"><p class="kpi-value">${valor}</p>${nota ? pastilhaNota(nota) : ''}</div>
      <p class="kpi-sub">${sub}</p>
    </div>`;
  const resumoGeral = { A: 'Rápida', B: 'Boa', C: 'Dá para melhorar', D: 'Lenta', F: 'Muito lenta' }[geral] || 'Sem medição';
  document.getElementById('kpi-grid').innerHTML = [
    `<div class="kpi kpi-nota-geral">
      <p class="kpi-label">Nota da plataforma</p>
      <div class="kpi-linha">${pastilhaNota(geral, true)}<p class="kpi-value">${escapeHtml(resumoGeral)}</p></div>
      <p class="kpi-sub">${d.melhorias.length ? `${d.melhorias.length} ponto${d.melhorias.length > 1 ? 's' : ''} de melhoria` : 'Nada a melhorar agora'}</p>
    </div>`,
    tile('Site (do seu computador)', ms(n.site_ms), 'love.com.br, página inteira', n.nota_site),
    tile('API (do seu computador)', ms(n.api_ms), 'Ida e volta até a função', n.nota_api),
    tile('Banco de dados', ms(d.banco.banco_ms), 'Consulta simples, a partir da função', d.banco.nota)
  ].join('');

  const r = d.regiao;
  const regiaoOk = r.ideal && r.funcoes === r.ideal;
  const regiao = `
    <section class="card">
      <div class="card-head"><div><h2>Região</h2><p>Quanto mais perto as funções estiverem do banco, menor a espera em cada chamada</p></div></div>
      <div class="card-body"><div class="lista-dados">
        <div class="dados-linha"><span class="rotulo">Funções /api (love-platform)</span><span class="valor">${nomeRegiao(r.funcoes)} ${r.ideal ? (regiaoOk ? badge('Ao lado do banco', 'badge-success') : badge('Longe do banco', 'badge-warning')) : ''}</span></div>
        <div class="dados-linha"><span class="rotulo">Banco de dados (Supabase)</span><span class="valor">${r.banco ? nomeRegiao(r.banco) : `<span class="cell-muted">${escapeHtml(r.banco_erro || '—')}</span>`}</span></div>
        <div class="dados-linha"><span class="rotulo">Região ideal das funções</span><span class="valor">${nomeRegiao(r.ideal)}</span></div>
        <div class="dados-linha"><span class="rotulo">Esta medição rodou em</span><span class="valor">${nomeRegiao(r.funcao_atual)}</span></div>
      </div></div>
    </section>`;

  const linhaMedicao = (item, valor, letra, ref) => `
    <tr class="no-hover"><td class="cell-strong">${item}</td><td>${valor}</td><td>${pastilhaNota(letra)}</td><td class="cell-muted">${ref}</td></tr>`;
  const medicoes = [
    linhaMedicao('Plataforma — do seu computador', ms(n.site_ms), n.nota_site, `${referencia(LIMITES_NAVEGADOR.site_ms)} ms`),
    linhaMedicao('Hub — do seu computador', ms(n.hub_ms), n.nota_hub, `${referencia(LIMITES_NAVEGADOR.site_ms)} ms`),
    linhaMedicao('API — do seu computador', ms(n.api_ms), n.nota_api, `${referencia(LIMITES_NAVEGADOR.api_ms)} ms`),
    ...d.sites.flatMap(s => [
      linhaMedicao(`${escapeHtml(s.nome)} — primeiro byte`, `${ms(s.ttfb_ms)}${s.borda ? ` <span class="cell-muted">via ${escapeHtml(s.borda)}</span>` : ''}`, s.nota_ttfb, `${referencia(d.limites.ttfb_ms)} ms`),
      linhaMedicao(`${escapeHtml(s.nome)} — tamanho`, `${s.html_kb == null ? '—' : `${formatNumber(s.html_kb)} KB`}${s.compressao ? ` <span class="cell-muted">${escapeHtml(s.compressao)}</span>` : ' <span class="cell-muted">sem compressão</span>'}`, s.nota_html, `${referencia(d.limites.html_kb)} KB`)
    ]),
    linhaMedicao('Banco de dados — consulta', ms(d.banco.banco_ms), d.banco.nota, `${referencia(d.limites.banco_ms)} ms`)
  ];

  const sim = v => (v ? 'Sim' : 'Não');
  const projetos = d.projetos.map(p => p.ok ? `
    <tr class="no-hover">
      <td class="cell-strong">${escapeHtml(p.nome)}</td>
      <td>${nomeRegiao(p.regiao_funcoes)}</td>
      <td>${escapeHtml(p.maquina_build)}</td>
      <td>${sim(p.builds_em_paralelo)}</td>
      <td>${sim(p.pular_build_sem_mudanca)}</td>
      <td>${formatNumber(p.builds_7_dias)}</td>
      <td>${p.build_medio_s == null ? '—' : `${formatNumber(p.build_medio_s)} s`}</td>
      <td>${pastilhaNota(p.nota_build)}</td>
    </tr>` : `
    <tr class="no-hover"><td class="cell-strong">${escapeHtml(p.nome)}</td><td colspan="7" class="cell-muted">${escapeHtml(p.erro || 'Sem acesso')}</td></tr>`);

  const unidade = { minute: 'min de CPU', gigabyte: 'GB', 'gigabyte-hour': 'GB-hora', hour: 'horas', events: 'eventos', invocations: 'chamadas', requests: 'requisições' };
  const uso = (d.uso.servicos || []).filter(s => s.uso > 0 || s.consumo > 0.0005).map(s => `
    <tr class="no-hover">
      <td class="cell-strong">${escapeHtml(s.servico)}</td>
      <td>${formatNumber(Math.round(s.uso * 100) / 100)} ${escapeHtml(unidade[String(s.unidade).toLowerCase()] || s.unidade || '')}</td>
      <td class="valor-dinheiro">${formatarMoedaServidor(s.consumo)}</td>
    </tr>`);

  const tabela = (titulo, sub, cabecalho, linhas, vazio) => `
    <section class="card table-card servidor-tabela">
      <div class="card-head"><div><h2>${titulo}</h2>${sub ? `<p>${sub}</p>` : ''}</div></div>
      <div class="table-wrap"><table class="data">
        <thead><tr>${cabecalho.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>
        <tbody>${linhas.length ? linhas.join('') : `<tr class="no-hover"><td colspan="${cabecalho.length}" class="cell-muted">${vazio}</td></tr>`}</tbody>
      </table></div>
    </section>`;

  document.getElementById('servidor-corpo').innerHTML = `
    ${regiao}
    ${tabela('Medições', `Medido em ${escapeHtml(formatDateTime(d.medido_em))} · três vezes cada, vale a do meio`, ['Item', 'Medição', 'Nota', 'Referência'], medicoes, '')}
    ${tabela('Projetos na Vercel', 'Configuração de cada projeto e os builds dos últimos 7 dias', ['Projeto', 'Região das funções', 'Máquina de build', 'Builds em paralelo', 'Pula build sem mudança', 'Builds (7 dias)', 'Build médio', 'Nota'], projetos, 'Sem acesso à Vercel')}
    ${tabela('Uso nos últimos 7 dias', 'CPU das funções, chamadas, build e tráfego, pela cobrança da Vercel', ['Serviço', 'Uso', 'Consumo'], uso, escapeHtml(d.uso.erro || 'Nada consumido'))}`;
  if (typeof agendarEsticarTabelas === 'function') agendarEsticarTabelas();
}

const formatarMoedaServidor = v => `US$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ---------------------------------------------------------- Diagnóstico */

function alternarDiagnostico() {
  const aberto = document.getElementById('servidor-menu');
  if (aberto) { aberto.remove(); return; }
  if (!DADOS || !BOTAO_DIAGNOSTICO) return;

  const IMPACTO = { alto: ['Impacto alto', 'badge-danger'], medio: ['Impacto médio', 'badge-warning'], baixo: ['Impacto baixo', 'badge-info'] };
  const menu = document.createElement('div');
  menu.id = 'servidor-menu';
  menu.className = 'servidor-menu';
  menu.innerHTML = DADOS.melhorias.length ? `
    <p class="servidor-menu-titulo">Como melhorar</p>
    ${DADOS.melhorias.map(m => `
      <div class="servidor-melhoria">
        <div class="servidor-melhoria-topo">
          <p class="servidor-melhoria-nome">${escapeHtml(m.titulo)}</p>
          ${badge(...IMPACTO[m.impacto])}
        </div>
        <p class="servidor-melhoria-texto">${escapeHtml(m.texto)}</p>
        ${m.aplicavel
          ? `<button type="button" class="btn btn-ghost btn-sm" data-aplicar="${escapeHtml(m.id)}">Aplicar</button>`
          : '<p class="servidor-melhoria-manual">Ajuste manual</p>'}
      </div>`).join('')}` : `
    <p class="servidor-menu-titulo">Como melhorar</p>
    <p class="servidor-melhoria-texto" style="padding:4px 16px 16px">Tudo dentro do esperado. Nada a melhorar agora.</p>`;

  const caixa = BOTAO_DIAGNOSTICO.getBoundingClientRect();
  menu.style.top = `${Math.round(caixa.bottom + window.scrollY + 8)}px`;
  menu.style.right = `${Math.max(16, Math.round(window.innerWidth - caixa.right))}px`;
  document.body.appendChild(menu);
  menu.addEventListener('click', e => e.stopPropagation());
  menu.querySelectorAll('[data-aplicar]').forEach(b => b.addEventListener('click', () => {
    menu.remove();
    aplicar([b.dataset.aplicar]);
  }));
}

/* --------------------------------------------------------------- Aplicar */

async function aplicarTodas() {
  const ids = (DADOS?.melhorias || []).filter(m => m.aplicavel).map(m => m.id);
  if (ids.length) await aplicar(ids);
}

async function aplicar(ids) {
  const itens = DADOS.melhorias.filter(m => ids.includes(m.id));
  const lista = itens.map(m => `• ${m.titulo} (${m.projetos.join(', ')})`).join('\n');
  const ok = await confirmar(`Aplicar na Vercel?\n\n${lista}\n\nVale a partir da próxima publicação de cada projeto.`,
    { titulo: ids.length > 1 ? 'Aplicar melhorias' : 'Aplicar melhoria', rotulo: 'Aplicar' });
  if (!ok) return;

  try {
    const r = await fetch(API_SERVIDOR, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await sessao()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ aplicar: ids })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
    const falhas = (j.resultados || []).filter(x => !x.ok);
    toast(falhas.length
      ? `Não aplicou: ${falhas.map(f => `${f.projeto || f.id} — ${f.erro}`).join(' · ')}`
      : 'Melhorias aplicadas. Valem a partir da próxima publicação.');
  } catch (e) {
    toast(`Não foi possível aplicar: ${e.message || e}`);
  }
  await carregar();
}
