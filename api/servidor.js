// Vercel Serverless Function — saúde do servidor para o Admin (Operacional › Servidor).
//
// GET  /api/servidor            → medições, notas (A a F) e melhorias sugeridas
// GET  /api/servidor?ping=1     → resposta vazia, para o Admin medir a latência da API
// POST /api/servidor {aplicar}  → aplica uma melhoria na Vercel (região, máquina de build…)
// Header: Authorization: Bearer <access_token do admin logado>
//
// O que mede:
//   - os três sites (love.com.br, hub, admin): tempo até o primeiro byte, tamanho
//     do HTML, compressão, cache e o ponto da Vercel que respondeu;
//   - o banco (Supabase): tempo de uma consulta simples, daqui da função;
//   - a região das funções e a do banco (quanto mais perto, menor a latência);
//   - os projetos na Vercel: máquina de build, builds em paralelo, Fluid,
//     "pular build sem mudança", e a duração dos últimos builds;
//   - o uso dos últimos 7 dias (CPU das funções, chamadas, build, tráfego).
//
// As notas seguem limites fixos (NOTAS abaixo): a mesma medição dá sempre a
// mesma nota. As melhorias "aplicáveis" mudam configurações dos projetos na
// Vercel pela API e valem a partir da próxima publicação.
//
// Variáveis: VERCEL_API_TOKEN, VERCEL_TEAM_ID (Vercel), SUPABASE_ACCESS_TOKEN
// (região do banco), SUPABASE_SECRET_KEY (conferir o admin e medir o banco).

const { supabaseAdmin } = require("./_ses");

const ORIGENS_PERMITIDAS = ["https://admin.love.com.br", "http://localhost:8090", "http://127.0.0.1:8090"];

const SITES = [
  { id: "love", nome: "Plataforma (love.com.br)", url: "https://love.com.br/", projeto: "love-platform" },
  { id: "hub", nome: "Hub (hub.love.com.br)", url: "https://hub.love.com.br/login", projeto: "b2b-platform" },
  { id: "admin", nome: "Admin (admin.love.com.br)", url: "https://admin.love.com.br/login", projeto: "admin-platform" }
];
const PROJETOS = ["love-platform", "b2b-platform", "admin-platform"];
// Projetos que só precisam montar quando a pasta deles mudou.
const PROJETOS_COM_PASTA = ["b2b-platform", "admin-platform"];
const COMANDO_PULAR_BUILD = "git diff --quiet HEAD^ HEAD -- ./";

// Região do banco (AWS, usada pela Supabase) → região da Vercel mais próxima.
const VERCEL_PERTO_DO_BANCO = {
  "sa-east-1": "gru1", "us-east-1": "iad1", "us-east-2": "cle1", "us-west-1": "sfo1", "us-west-2": "pdx1",
  "ca-central-1": "yul1", "eu-west-1": "dub1", "eu-west-2": "lhr1", "eu-west-3": "cdg1", "eu-central-1": "fra1",
  "eu-north-1": "arn1", "ap-south-1": "bom1", "ap-southeast-1": "sin1", "ap-southeast-2": "syd1",
  "ap-northeast-1": "hnd1", "ap-northeast-2": "icn1", "ap-northeast-3": "kix1"
};
const NOME_REGIAO = {
  gru1: "São Paulo", iad1: "Washington (EUA)", cle1: "Cleveland (EUA)", sfo1: "São Francisco (EUA)", pdx1: "Portland (EUA)",
  yul1: "Montreal", dub1: "Dublin", lhr1: "Londres", cdg1: "Paris", fra1: "Frankfurt", arn1: "Estocolmo", bom1: "Mumbai",
  sin1: "Singapura", syd1: "Sydney", hnd1: "Tóquio", icn1: "Seul", kix1: "Osaka", hkg1: "Hong Kong", cpt1: "Cidade do Cabo", dxb1: "Dubai",
  "sa-east-1": "São Paulo", "us-east-1": "Virgínia (EUA)", "us-east-2": "Ohio (EUA)", "us-west-1": "Califórnia (EUA)", "us-west-2": "Oregon (EUA)",
  "eu-west-1": "Irlanda", "eu-west-2": "Londres", "eu-central-1": "Frankfurt", "ap-southeast-1": "Singapura"
};

/* Limites das notas (quanto menor, melhor). Abaixo do 1º = A, do 2º = B,
   do 3º = C, do 4º = D; acima = F. */
const NOTAS = {
  ttfb_ms: [200, 500, 1000, 2000],          // primeiro byte do site, medido daqui
  banco_ms: [50, 150, 300, 600],            // consulta simples no banco
  html_kb: [100, 250, 500, 1000],           // tamanho do HTML transferido
  build_s: [60, 120, 300, 600]              // duração média do build
};
const LETRAS = ["A", "B", "C", "D", "F"];
const nota = (valor, limites) => (valor == null || Number.isNaN(valor) ? null : LETRAS[limites.findIndex(l => valor <= l) === -1 ? 4 : limites.findIndex(l => valor <= l)]);

function cors(req, res) {
  const origem = req.headers.origin || "";
  if (ORIGENS_PERMITIDAS.includes(origem)) {
    res.setHeader("Access-Control-Allow-Origin", origem);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Cache-Control", "no-store");
}

const mediana = lista => {
  const v = lista.filter(n => typeof n === "number").sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : null;
};

/* ------------------------------------------------------------- Sites */

async function medirSite(site) {
  const tentativas = [];
  let ultimo = null;
  for (let i = 0; i < 3; i++) {
    const inicio = Date.now();
    try {
      const r = await fetch(site.url, { headers: { "Accept-Encoding": "br, gzip", "User-Agent": "LoveAdmin-Servidor/1.0" }, redirect: "follow" });
      const ttfb = Date.now() - inicio;
      const corpo = await r.arrayBuffer();
      tentativas.push({ ttfb, total: Date.now() - inicio });
      ultimo = {
        status: r.status,
        bytes: corpo.byteLength,
        compressao: r.headers.get("content-encoding") || "",
        cache: r.headers.get("x-vercel-cache") || "",
        cacheControl: r.headers.get("cache-control") || "",
        vercelId: r.headers.get("x-vercel-id") || ""
      };
    } catch (e) {
      tentativas.push({ erro: String(e.message || e) });
    }
  }
  const ttfb = mediana(tentativas.map(t => t.ttfb));
  // node fetch já descomprime: o tamanho transferido é estimado (br/gzip ≈ 25%).
  const kb = ultimo ? Math.round((ultimo.bytes / 1024) * (ultimo.compressao ? 0.25 : 1)) : null;
  const borda = ultimo?.vercelId ? ultimo.vercelId.split("::")[0] : "";
  return {
    ...site,
    ok: Boolean(ultimo) && ultimo.status < 400,
    status: ultimo?.status || null,
    ttfb_ms: ttfb,
    total_ms: mediana(tentativas.map(t => t.total)),
    html_kb: kb,
    compressao: ultimo?.compressao || "",
    cache: ultimo?.cache || "",
    cache_control: ultimo?.cacheControl || "",
    borda,
    erro: tentativas.find(t => t.erro)?.erro || "",
    nota_ttfb: nota(ttfb, NOTAS.ttfb_ms),
    nota_html: nota(kb, NOTAS.html_kb)
  };
}

/* ------------------------------------------------------------- Banco */

async function medirBanco(db) {
  const tempos = [];
  for (let i = 0; i < 3; i++) {
    const inicio = Date.now();
    const { error } = await db.from("admins").select("id").limit(1);
    if (!error) tempos.push(Date.now() - inicio);
  }
  const ms = mediana(tempos);
  return { banco_ms: ms, nota: nota(ms, NOTAS.banco_ms) };
}

async function regiaoDoBanco() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://krpgtixwmxwhtjchcufl.supabase.co";
  const ref = (url.match(/https:\/\/([^.]+)\./) || [])[1];
  if (!token) return { regiao: "", ref, erro: "Falta SUPABASE_ACCESS_TOKEN para ler a região do banco" };
  try {
    const r = await fetch("https://api.supabase.com/v1/projects", { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`Supabase respondeu ${r.status}`);
    const lista = await r.json();
    const p = (Array.isArray(lista) ? lista : []).find(x => x.id === ref || x.ref === ref);
    return { regiao: p?.region || "", ref, nome: p?.name || "", erro: p ? "" : "Projeto do banco não encontrado no token" };
  } catch (e) {
    return { regiao: "", ref, erro: String(e.message || e) };
  }
}

/* ------------------------------------------------------------- Vercel */

function vercel(caminho, opcoes = {}) {
  const token = process.env.VERCEL_API_TOKEN;
  const sep = caminho.includes("?") ? "&" : "?";
  const time = process.env.VERCEL_TEAM_ID ? `${sep}teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}` : "";
  return fetch(`https://api.vercel.com${caminho}${time}`, {
    ...opcoes,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(opcoes.headers || {}) }
  });
}

async function lerProjeto(nome) {
  try {
    const r = await vercel(`/v9/projects/${encodeURIComponent(nome)}`);
    if (!r.ok) throw new Error(`Vercel respondeu ${r.status}`);
    const p = await r.json();
    const rc = p.resourceConfig || {};

    // Últimos builds prontos: duração e quantos nos últimos 7 dias.
    let builds = [];
    try {
      const rd = await vercel(`/v6/deployments?projectId=${encodeURIComponent(p.id)}&limit=20&state=READY`);
      const jd = rd.ok ? await rd.json() : {};
      builds = (jd.deployments || []).map(d => ({
        criado: d.created || d.createdAt,
        segundos: d.ready && d.buildingAt ? Math.round((d.ready - d.buildingAt) / 1000) : null
      }));
    } catch { /* sem histórico de builds */ }
    const semana = Date.now() - 7 * 86400000;
    const duracoes = builds.map(b => b.segundos).filter(s => s != null);
    const mediaBuild = duracoes.length ? Math.round(duracoes.reduce((s, v) => s + v, 0) / duracoes.length) : null;

    return {
      nome,
      id: p.id,
      ok: true,
      regiao_funcoes: (rc.functionDefaultRegions && rc.functionDefaultRegions[0]) || p.serverlessFunctionRegion || "iad1",
      maquina_build: rc.buildMachineType || (rc.buildMachineSelection === "elastic" ? "elastic" : "standard"),
      selecao_maquina: rc.buildMachineSelection || "",
      builds_em_paralelo: rc.elasticConcurrencyEnabled === true,
      fluid: rc.fluid === true,
      pular_build_sem_mudanca: Boolean(p.commandForIgnoringBuildStep),
      comando_pular_build: p.commandForIgnoringBuildStep || "",
      node: p.nodeVersion || "",
      builds_7_dias: builds.filter(b => b.criado >= semana).length,
      build_medio_s: mediaBuild,
      nota_build: nota(mediaBuild, NOTAS.build_s)
    };
  } catch (e) {
    return { nome, ok: false, erro: String(e.message || e) };
  }
}

/* Uso dos últimos 7 dias pela cobrança da Vercel (mesma fonte do Custos). */
async function usoDaSemana() {
  const de = new Date(Date.now() - 7 * 86400000).toISOString();
  const ate = new Date().toISOString();
  try {
    const r = await vercel(`/v1/billing/charges?from=${encodeURIComponent(de)}&to=${encodeURIComponent(ate)}`);
    const texto = await r.text();
    if (!r.ok) throw new Error(`Vercel respondeu ${r.status}`);
    let registros;
    try {
      const j = JSON.parse(texto);
      registros = Array.isArray(j) ? j : (j.charges || j.data || []);
    } catch {
      registros = texto.split("\n").filter(l => l.trim()).map(l => JSON.parse(l));
    }
    const porServico = {};
    registros.forEach(c => {
      const nome = c.ServiceName || c.ChargeDescription || "Outros";
      if (nome === "Pro") return;
      const s = porServico[nome] || (porServico[nome] = { servico: nome, uso: 0, unidade: c.ConsumedUnit || "", consumo: 0 });
      s.uso += Number(c.ConsumedQuantity) || 0;
      s.consumo += Number(c.EffectiveCost ?? c.BilledCost) || 0;
    });
    return { ok: true, servicos: Object.values(porServico).sort((a, b) => b.consumo - a.consumo) };
  } catch (e) {
    return { ok: false, erro: String(e.message || e), servicos: [] };
  }
}

/* ------------------------------------------------------- Melhorias

   Regras fixas sobre as medições. "aplicavel" = o botão do Admin muda a
   configuração na Vercel; as outras explicam o que fazer à mão. */

function melhorias({ sites, banco, regiaoBanco, projetos, regiaoAtual }) {
  const lista = [];
  const ideal = VERCEL_PERTO_DO_BANCO[regiaoBanco.regiao] || "";
  const plataforma = projetos.find(p => p.nome === "love-platform" && p.ok);
  const regiaoFuncoes = plataforma?.regiao_funcoes || regiaoAtual;

  if (ideal && regiaoFuncoes && regiaoFuncoes !== ideal) {
    lista.push({
      id: "regiao-funcoes", impacto: "alto", aplicavel: Boolean(plataforma),
      titulo: `Levar as funções /api para ${NOME_REGIAO[ideal] || ideal}`,
      texto: `As funções rodam em ${NOME_REGIAO[regiaoFuncoes] || regiaoFuncoes} (${regiaoFuncoes}) e o banco está em ${NOME_REGIAO[regiaoBanco.regiao] || regiaoBanco.regiao}. Cada consulta atravessa essa distância. Com as funções em ${ideal}, ao lado do banco, cada chamada da plataforma fica mais rápida.`,
      projetos: ["love-platform"], mudanca: [{ resourceConfig: { functionDefaultRegions: [ideal] } }, { serverlessFunctionRegion: ideal }]
    });
  }
  if (regiaoBanco.regiao && regiaoBanco.regiao !== "sa-east-1") {
    lista.push({
      id: "regiao-banco", impacto: "medio", aplicavel: false,
      titulo: "Banco fora do Brasil",
      texto: `O banco está em ${NOME_REGIAO[regiaoBanco.regiao] || regiaoBanco.regiao}, e quase todos os usuários estão no Brasil. Mover para São Paulo (sa-east-1) exige criar um projeto novo na Supabase e migrar os dados — é uma operação planejada, não um botão.`
    });
  }

  const maquinaGrande = projetos.filter(p => p.ok && p.maquina_build !== "basic");
  if (maquinaGrande.length) {
    lista.push({
      id: "maquina-build", impacto: "medio", aplicavel: true,
      titulo: "Máquina de build Basic",
      texto: `${maquinaGrande.map(p => p.nome).join(", ")} ${maquinaGrande.length > 1 ? "montam" : "monta"} em máquina ${maquinaGrande.map(p => p.maquina_build).join("/")}. O site é estático + funções: a Basic dá conta e o build é a maior parte da conta da Vercel.`,
      projetos: maquinaGrande.map(p => p.nome), mudanca: [{ resourceConfig: { buildMachineType: "basic" } }, { resourceConfig: { buildMachineSelection: "fixed" } }, { resourceConfig: { buildMachineSelection: "fixed", buildMachineType: "basic" } }]
    });
  }

  const paralelo = projetos.filter(p => p.ok && p.builds_em_paralelo);
  if (paralelo.length) {
    lista.push({
      id: "builds-paralelos", impacto: "medio", aplicavel: true,
      titulo: "Builds em fila, sem máquina extra",
      texto: `${paralelo.map(p => p.nome).join(", ")} ${paralelo.length > 1 ? "ganham" : "ganha"} máquina extra a cada publicação simultânea. Em fila, o custo cai e o site continua igual.`,
      projetos: paralelo.map(p => p.nome), mudanca: { resourceConfig: { elasticConcurrencyEnabled: false } }
    });
  }

  const semPular = projetos.filter(p => p.ok && PROJETOS_COM_PASTA.includes(p.nome) && !p.pular_build_sem_mudanca);
  if (semPular.length) {
    lista.push({
      id: "pular-build", impacto: "medio", aplicavel: true,
      titulo: "Só montar quando a pasta mudou",
      texto: `${semPular.map(p => p.nome).join(" e ")} ${semPular.length > 1 ? "montam" : "monta"} a cada envio ao GitHub, mesmo quando a mudança foi em outra parte. Com o "pular build sem mudança", cada projeto só monta quando a própria pasta mudou.`,
      projetos: semPular.map(p => p.nome), mudanca: { commandForIgnoringBuildStep: COMANDO_PULAR_BUILD }
    });
  }

  const semFluid = projetos.filter(p => p.ok && p.nome === "love-platform" && !p.fluid);
  if (semFluid.length) {
    lista.push({
      id: "fluid", impacto: "medio", aplicavel: true,
      titulo: "Ligar o Fluid compute nas funções",
      texto: "Com o Fluid, uma mesma instância atende várias chamadas ao mesmo tempo: menos partidas a frio (a primeira chamada lenta) e menos CPU cobrada.",
      projetos: ["love-platform"], mudanca: { resourceConfig: { fluid: true } }
    });
  }

  sites.forEach(s => {
    if (s.ok && !s.compressao) {
      lista.push({ id: `compressao-${s.id}`, impacto: "alto", aplicavel: false,
        titulo: `${s.nome}: sem compressão`, texto: "O HTML está indo sem br/gzip. Conferir se algum cabeçalho em vercel.json desliga a compressão." });
    }
    if (s.nota_html && "DF".includes(s.nota_html)) {
      lista.push({ id: `html-${s.id}`, impacto: "medio", aplicavel: false,
        titulo: `${s.nome}: página pesada (${s.html_kb} KB)`, texto: "Tirar do HTML o que pode ir para arquivos .js/.css separados (ficam em cache no navegador) e carregar sob demanda as partes que não aparecem na primeira tela." });
    }
    if (s.nota_ttfb && "CDF".includes(s.nota_ttfb)) {
      lista.push({ id: `ttfb-${s.id}`, impacto: "alto", aplicavel: false,
        titulo: `${s.nome}: resposta lenta (${s.ttfb_ms} ms)`, texto: "O primeiro byte está demorando. Se a página passa por uma função (rewrite para /api), ela é a suspeita; páginas estáticas devem responder da CDN em poucos milissegundos." });
    }
    if (!s.ok) {
      lista.push({ id: `fora-${s.id}`, impacto: "alto", aplicavel: false,
        titulo: `${s.nome}: não respondeu bem`, texto: s.erro || `Respondeu ${s.status}.` });
    }
  });

  if (banco.nota && "CDF".includes(banco.nota)) {
    lista.push({ id: "banco-lento", impacto: "alto", aplicavel: false,
      titulo: `Banco lento (${banco.banco_ms} ms por consulta)`,
      texto: "Uma consulta simples está demorando. Conferir em Supabase › Reports se o banco está no limite de CPU/memória do plano e se faltam índices nas tabelas mais usadas." });
  }

  const longos = projetos.filter(p => p.ok && p.nota_build && "DF".includes(p.nota_build));
  if (longos.length) {
    lista.push({ id: "build-longo", impacto: "baixo", aplicavel: false,
      titulo: "Builds demorados",
      texto: `${longos.map(p => `${p.nome} (${p.build_medio_s}s)`).join(", ")}. Um site estático não precisa de mais de um minuto; vale ver o log do build na Vercel.` });
  }

  const ordem = { alto: 0, medio: 1, baixo: 2 };
  return lista.sort((a, b) => (ordem[a.impacto] - ordem[b.impacto]) || (Number(b.aplicavel) - Number(a.aplicavel)));
}

/* Nota geral: média das notas (A=4 … F=0), arredondada. */
function notaGeral(letras) {
  const v = letras.filter(Boolean).map(l => 4 - LETRAS.indexOf(l));
  if (!v.length) return null;
  const media = v.reduce((s, n) => s + n, 0) / v.length;
  return LETRAS[4 - Math.round(media)];
}

/* -------------------------------------------------------------- Handler */

module.exports = async (req, res) => {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method === "GET" && String(req.query?.ping || "") === "1") return res.status(200).json({ ok: true, regiao: process.env.VERCEL_REGION || "" });

  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Sem sessão" });

  try {
    const db = supabaseAdmin();
    if (!db) return res.status(500).json({ error: "Falta SUPABASE_SECRET_KEY no projeto love-platform da Vercel" });
    const { data: quem, error: erroSessao } = await db.auth.getUser(token);
    if (erroSessao || !quem?.user) return res.status(401).json({ error: "Sessão inválida" });
    const { data: admin } = await db.from("admins").select("id, active").eq("id", quem.user.id).maybeSingle();
    if (!admin || admin.active === false) return res.status(403).json({ error: "Acesso só para admins" });

    if (req.method === "POST") return await aplicar(req, res, db);
    if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });
    return res.status(200).json(await diagnostico(db));
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
};

async function diagnostico(db) {
  const temVercel = Boolean(process.env.VERCEL_API_TOKEN);
  const [sites, banco, regiaoBanco, projetos, uso] = await Promise.all([
    Promise.all(SITES.map(medirSite)),
    medirBanco(db),
    regiaoDoBanco(),
    temVercel ? Promise.all(PROJETOS.map(lerProjeto)) : Promise.resolve(PROJETOS.map(nome => ({ nome, ok: false, erro: "Falta VERCEL_API_TOKEN" }))),
    temVercel ? usoDaSemana() : Promise.resolve({ ok: false, erro: "Falta VERCEL_API_TOKEN", servicos: [] })
  ]);
  const regiaoAtual = process.env.VERCEL_REGION || "";
  const lista = melhorias({ sites, banco, regiaoBanco, projetos, regiaoAtual });
  const notas = [...sites.map(s => s.nota_ttfb), ...sites.map(s => s.nota_html), banco.nota, ...projetos.map(p => p.nota_build)];
  const ideal = VERCEL_PERTO_DO_BANCO[regiaoBanco.regiao] || "";
  return {
    medido_em: new Date().toISOString(),
    nota_geral: notaGeral(notas),
    limites: NOTAS,
    regiao: {
      funcao_atual: regiaoAtual,
      funcoes: projetos.find(p => p.nome === "love-platform")?.regiao_funcoes || regiaoAtual,
      banco: regiaoBanco.regiao,
      banco_erro: regiaoBanco.erro || "",
      ideal,
      nomes: NOME_REGIAO
    },
    sites, banco, projetos, uso,
    melhorias: lista
  };
}

/* Aplica uma melhoria: refaz o diagnóstico (a regra tem que continuar valendo)
   e manda a mudança para cada projeto envolvido. */
async function aplicar(req, res, db) {
  if (!process.env.VERCEL_API_TOKEN) return res.status(400).json({ error: "Falta VERCEL_API_TOKEN no projeto love-platform da Vercel" });
  const corpo = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const ids = Array.isArray(corpo.aplicar) ? corpo.aplicar : [corpo.aplicar].filter(Boolean);
  if (!ids.length) return res.status(400).json({ error: "Diga qual melhoria aplicar" });

  const atual = await diagnostico(db);
  const resultados = [];
  for (const id of ids) {
    const m = atual.melhorias.find(x => x.id === id && x.aplicavel);
    if (!m) { resultados.push({ id, ok: false, erro: "Essa melhoria não está mais pendente" }); continue; }
    for (const projeto of m.projetos) {
      /* A Vercel recusa alguns campos juntos ("Cannot specify ..."): tenta cada forma da mudança até uma passar. */
      const tentativas = Array.isArray(m.mudanca) ? m.mudanca : [m.mudanca];
      let ok = false, erro = "";
      for (const corpoPatch of tentativas) {
        const r = await vercel(`/v9/projects/${encodeURIComponent(projeto)}`, { method: "PATCH", body: JSON.stringify(corpoPatch) });
        if (r.ok) { ok = true; erro = ""; break; }
        const bruto = await r.text();
        let msg = bruto;
        try { const j = JSON.parse(bruto); msg = j?.error?.message || j?.message || bruto; } catch (_) {}
        erro = `Vercel respondeu ${r.status}: ${String(msg).slice(0, 300)}`;
        if (r.status === 401 || r.status === 403 || r.status === 404) break;
      }
      resultados.push({ id, projeto, ok, erro });
    }
  }
  return res.status(200).json({ resultados });
}
