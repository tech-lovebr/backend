/* ==========================================================================
   LOVE ADMIN — Finanças (peças compartilhadas)

   O custo da plataforma e o gráfico de linhas do Dashboard aparecem em mais
   de uma tela. Para o gráfico do Financeiro ser de fato igual ao do
   Dashboard — e continuar igual quando um dos dois mudar — o desenho e a
   conta de custo moram aqui, e cada página só entrega os números.

   Quem usa: financeiro.js. O dashboard.js ainda tem a sua própria cópia
   destas funções; migrá-lo para cá é o passo seguinte.
   ========================================================================== */

const Financas = (() => {
  const API_CUSTOS = 'https://love.com.br/api/custos';
  const DIA_MS = 86400000;

  /* ------------------------------------------------- Custo da plataforma */

  let BASE = { integracoes: [], custos: [], cotacoes: { BRL: 1 } };
  const CACHE_DIA = new Map();

  async function buscarIntegrados() {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const r = await fetch(API_CUSTOS, { headers: { Authorization: `Bearer ${session?.access_token || ''}` } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch {
      return { itens: [], cotacoes: {} };
    }
  }

  /** Integrações (Vercel, Supabase, Amazon) + custos manuais + cotação do dia. */
  async function carregarCustos() {
    const [manuais, integrados] = await Promise.all([
      safeSelect('custos', '*'),
      buscarIntegrados()
    ]);

    const cotacoes = { BRL: 1, ...(integrados.cotacoes || {}) };
    if (!cotacoes.USD || !cotacoes.EUR) {
      try {
        const j = await (await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL')).json();
        cotacoes.USD = cotacoes.USD || Number(j.USDBRL?.bid) || null;
        cotacoes.EUR = cotacoes.EUR || Number(j.EURBRL?.bid) || null;
      } catch { /* sem cotação: custo em dólar fica fora, não vira número errado */ }
    }

    BASE = {
      integracoes: (integrados.itens || []).filter(i => i.status === 'ativo'),
      custos: manuais.error ? [] : manuais.data,
      cotacoes
    };
    CACHE_DIA.clear();
    return BASE;
  }

  /** Para a página que já carregou integrações e custos (Settings › Custos)
      não buscar tudo de novo só para usar a conta de rateio daqui. */
  function semear({ integracoes, custos, cotacoes }) {
    BASE = {
      integracoes: (integracoes || []).filter(i => i.status === 'ativo'),
      custos: custos || [],
      cotacoes: { BRL: 1, ...(cotacoes || {}) }
    };
    CACHE_DIA.clear();
    return BASE;
  }

  const chaveMes = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  function emReais(valor, moeda) {
    if (!moeda || moeda === 'BRL') return Number(valor) || 0;
    const taxa = BASE.cotacoes?.[moeda];
    return taxa ? (Number(valor) || 0) * taxa : 0;
  }

  /** Dias em que o custo do mês se espalha: no mês atual, só os que já passaram. */
  function diasDoRateio(d) {
    const hoje = new Date();
    if (d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth()) return hoje.getDate();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  }

  /**
   * Custo de um dia, em reais, item por item. A chave é única por custo
   * (`integracao:vercel`, `manual:<id>`) porque duas linhas podem ter a
   * mesma empresa; o nome vem junto para quem agrupa por empresa.
   */
  function custoDoDia(d) {
    const chave = d.toDateString();
    if (CACHE_DIA.has(chave)) return CACHE_DIA.get(chave);
    const hoje = new Date();
    const itens = {};
    // Guarda o valor na moeda do custo junto do convertido: a tabela mostra
    // "US$ 59,42 ≈ R$ 315,92" e não dá para reconverter sem perder centavos.
    const somar1 = (id, nome, moeda, original) => {
      if (!original) return;
      if (!itens[id]) itens[id] = { id, nome, moeda, valor: 0, original: 0 };
      itens[id].valor += emReais(original, moeda);
      itens[id].original += original;
    };
    if (d <= hoje) {
      const mes = chaveMes(d);
      const dias = diasDoRateio(d);
      BASE.integracoes.forEach(i => {
        somar1(`integracao:${i.fonte || i.nome}`, i.nome, i.moeda, (Number(i.meses?.[mes]) || 0) / dias);
      });
      const iso = `${mes}-${String(d.getDate()).padStart(2, '0')}`;
      BASE.custos.forEach(c => {
        const nome = c.empresa || c.nome;
        const valor = Number(c.valor) || 0;
        if (c.tipo === 'unico') {
          if (c.data === iso) somar1(`manual:${c.id}`, nome, c.moeda, valor);
        } else if (String(c.data || '').slice(0, 7) <= mes) {
          somar1(`manual:${c.id}`, nome, c.moeda, valor / dias);
        }
      });
    }
    CACHE_DIA.set(chave, itens);
    return itens;
  }

  /** Soma dia a dia entre dois instantes; frações de dia contam proporcionalmente. */
  function rateioNoIntervalo(de, ate, acumular) {
    let d = new Date(de.getFullYear(), de.getMonth(), de.getDate());
    while (d <= ate) {
      const fimDia = new Date(d.getTime() + DIA_MS);
      const parte = (Math.min(fimDia, ate) - Math.max(d, de)) / DIA_MS;
      if (parte > 0) Object.values(custoDoDia(d)).forEach(item => acumular(item, parte));
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    }
  }

  /** Custo entre dois instantes, somado por empresa (para a rosca e o total). */
  function custosNoIntervalo(de, ate) {
    const total = {};
    rateioNoIntervalo(de, ate, (item, parte) => {
      total[item.nome] = (total[item.nome] || 0) + item.valor * parte;
    });
    return total;
  }

  /**
   * O mesmo, mas uma entrada por custo, com o valor na moeda original ao
   * lado do convertido — é o que as tabelas precisam.
   * @returns {Record<string, { id: string, nome: string, moeda: string, valor: number, original: number }>}
   */
  function custosNoIntervaloPorItem(de, ate) {
    const total = {};
    rateioNoIntervalo(de, ate, (item, parte) => {
      if (!total[item.id]) total[item.id] = { id: item.id, nome: item.nome, moeda: item.moeda, valor: 0, original: 0 };
      total[item.id].valor += item.valor * parte;
      total[item.id].original += item.original * parte;
    });
    return total;
  }

  const somar = obj => Object.values(obj).reduce((s, v) => s + v, 0);

  /* ------------------------------------------------------ Gráfico de linha */

  /** Fatias do eixo X: horas num dia só, dias até dois meses, meses acima disso. */
  function fatiasDoTempo(de, ate) {
    const mesmoDia = de.toDateString() === ate.toDateString();
    const lista = [];
    if (mesmoDia) {
      for (let h = 0; h < 24; h++) {
        const ini = new Date(de.getFullYear(), de.getMonth(), de.getDate(), h);
        lista.push({ ini, fim: new Date(ini.getTime() + 3600000), eixo: `${String(h).padStart(2, '0')}:00`, tipo: 'Horário' });
      }
      return lista;
    }
    const dias = Math.round((ate - de) / DIA_MS) + 1;
    if (dias <= 62) {
      for (let i = 0; i < dias; i++) {
        const ini = new Date(de.getFullYear(), de.getMonth(), de.getDate() + i);
        lista.push({ ini, fim: new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + 1), eixo: ini.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), tipo: 'Dia' });
      }
      return lista;
    }
    let ini = new Date(de.getFullYear(), de.getMonth(), 1);
    while (ini <= ate) {
      const fim = new Date(ini.getFullYear(), ini.getMonth() + 1, 1);
      const nome = ini.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      lista.push({ ini, fim, eixo: `${nome} ${String(ini.getFullYear()).slice(2)}`, tipo: 'Mês' });
      ini = fim;
    }
    return lista;
  }

  function escalaBonita(valor) {
    if (!valor) return 4;
    const potencia = 10 ** Math.floor(Math.log10(valor));
    return [1, 2, 2.5, 4, 5, 10].find(p => p * potencia >= valor) * potencia;
  }

  /**
   * Chips de cima: nenhuma escolhida mostra todas; clicar numa isola; clicar
   * de novo na mesma volta para todas. Nunca fica sem linha nenhuma.
   */
  function chips(host, series, escolhida, aoTrocar) {
    if (!host) return;
    host.innerHTML = `
      <div class="dash-chips" role="group" aria-label="Linha do gráfico">
        ${series.map(s => `
          <button type="button" class="dash-chip${escolhida === s.id ? ' is-ativa' : ''}${escolhida && escolhida !== s.id ? ' is-apagada' : ''}"
                  data-serie="${s.id}" aria-pressed="${escolhida === s.id}">
            <span class="dash-chip-cor" style="background:${s.cor}"></span>${escapeHtml(s.rotulo)}
          </button>`).join('')}
      </div>`;
    host.querySelectorAll('[data-serie]').forEach(b => b.addEventListener('click', () => {
      aoTrocar(escolhida === b.dataset.serie ? null : b.dataset.serie);
    }));
  }

  /**
   * Desenha o gráfico. `pontoDe(ini, fim)` devolve um objeto com uma chave
   * por série; o que estiver no futuro já chega zerado de quem chamou.
   */
  function desenharGrafico(host, { de, ate, series, escolhida, pontoDe }) {
    if (!host) return;
    const fatias = fatiasDoTempo(de, ate);
    const pontos = fatias.map(f => {
      const fimReal = f.fim > ate ? ate : f.fim;
      return { ...f, ...pontoDe(f.ini, fimReal) };
    });
    const visiveis = series.filter(s => !escolhida || s.id === escolhida);

    const largura = Math.max(host.clientWidth || 640, 300);
    const altura = 300;
    const m = { esq: 64, dir: 12, topo: 12, base: 30 };
    const w = largura - m.esq - m.dir;
    const h = altura - m.topo - m.base;
    const valores = pontos.flatMap(p => visiveis.map(s => p[s.id]));
    const teto = escalaBonita(Math.max(0, ...valores));
    const piso = Math.min(0, ...valores) < 0 ? -escalaBonita(-Math.min(...valores)) : 0;
    const x = i => m.esq + (pontos.length === 1 ? w / 2 : (i * w) / (pontos.length - 1));
    const y = v => m.topo + h - ((v - piso) / (teto - piso)) * h;

    const marcas = Array.from({ length: 5 }, (_, i) => piso + ((teto - piso) * i) / 4);
    const reais = v => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
    const grade = marcas.map(v => `
      <line x1="${m.esq}" x2="${largura - m.dir}" y1="${y(v)}" y2="${y(v)}" class="custos-grade" />
      <text x="${m.esq - 10}" y="${y(v) + 4}" text-anchor="end" class="custos-eixo">${escapeHtml(reais(v))}</text>`).join('');

    // Rótulos do eixo sem amontoar: no máximo uns 8.
    const passo = Math.max(1, Math.ceil(pontos.length / 8));
    const eixo = pontos.map((p, i) => i % passo === 0
      ? `<text x="${x(i)}" y="${altura - 8}" text-anchor="middle" class="custos-eixo">${escapeHtml(p.eixo)}</text>` : '').join('');

    const linhas = visiveis.map(s => `
      <path d="${pontos.map((p, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(p[s.id])}`).join(' ')}" fill="none" stroke="${s.cor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      ${pontos.map((p, i) => `<circle cx="${x(i)}" cy="${y(p[s.id])}" r="3" fill="#fff" stroke="${s.cor}" stroke-width="1.5" data-ponto="${i}" />`).join('')}`).join('');

    host.innerHTML = `
      <svg width="${largura}" height="${altura}" role="img" aria-label="${escapeHtml(visiveis.map(s => s.rotulo).join(', '))}">
        ${grade}
        <line class="dash-guia" id="dash-guia" x1="0" x2="0" y1="${m.topo}" y2="${m.topo + h}" visibility="hidden" />
        ${linhas}
        ${eixo}
        <rect x="${m.esq}" y="${m.topo}" width="${w}" height="${h}" fill="transparent" id="dash-area" />
      </svg>
      <div class="dash-dica" id="dash-dica" hidden></div>`;

    const area = host.querySelector('#dash-area');
    const guia = host.querySelector('#dash-guia');
    const dica = host.querySelector('#dash-dica');
    const mostrar = e => {
      const caixa = host.querySelector('svg').getBoundingClientRect();
      const px = e.clientX - caixa.left;
      const i = Math.max(0, Math.min(pontos.length - 1, Math.round(((px - m.esq) / w) * (pontos.length - 1))));
      const p = pontos[i];
      guia.setAttribute('x1', x(i)); guia.setAttribute('x2', x(i)); guia.setAttribute('visibility', 'visible');
      host.querySelectorAll('[data-ponto]').forEach(c => c.setAttribute('r', Number(c.dataset.ponto) === i ? 4.5 : 3));
      const titulo = p.tipo === 'Dia' ? p.ini.toLocaleDateString('pt-BR') : p.eixo;
      dica.innerHTML = `<strong>${p.tipo}: ${escapeHtml(titulo)}</strong>
        ${visiveis.map(s => `<div class="dash-dica-linha"><span class="dash-chip-cor" style="background:${s.cor}"></span><span>${escapeHtml(s.rotulo)}</span><b>${formatCurrency(p[s.id])}</b></div>`).join('')}`;
      dica.hidden = false;
      const esquerda = x(i) + 16 + dica.offsetWidth > largura ? x(i) - 16 - dica.offsetWidth : x(i) + 16;
      dica.style.left = `${esquerda}px`;
      dica.style.top = `${Math.max(0, Math.min(altura - dica.offsetHeight, e.clientY - caixa.top - dica.offsetHeight / 2))}px`;
    };
    area.addEventListener('mousemove', mostrar);
    area.addEventListener('mouseleave', () => {
      guia.setAttribute('visibility', 'hidden');
      dica.hidden = true;
      host.querySelectorAll('[data-ponto]').forEach(c => c.setAttribute('r', 3));
    });
  }

  return {
    carregarCustos, semear, custoDoDia, custosNoIntervalo, custosNoIntervaloPorItem,
    somar, fatiasDoTempo, escalaBonita, chips, desenharGrafico
  };
})();
