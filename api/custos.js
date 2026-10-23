// Vercel Serverless Function — custos de tecnologia para o Admin (Settings).
// Endpoint: GET /api/custos   (chamado de admin.love.com.br)
// Header:   Authorization: Bearer <access_token do admin logado>
//
// Devolve, mês a mês (últimos 6 meses), o que cada serviço cobrou:
//   - Vercel (servidor): API de cobrança da Vercel (/v1/billing/charges);
//   - Supabase (banco de dados): plano da organização pela Management API —
//     a Supabase não tem API de fatura, então vale o preço do plano (ou o
//     valor fixo em SUPABASE_CUSTO_MENSAL_USD, quando informado);
//   - Amazon AWS (e-mail): AWS Cost Explorer, fatura da conta inteira por
//     serviço (SES, SNS, impostos). O usuário IAM precisa de ce:GetCostAndUsage.
// E a cotação do dia (USD e EUR em reais) para converter tudo.
//
// Variáveis de ambiente:
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (conferir o admin)
//   VERCEL_API_TOKEN, VERCEL_TEAM_ID                      (Vercel)
//   SUPABASE_ACCESS_TOKEN, SUPABASE_ORG_SLUG (opcional), SUPABASE_CUSTO_MENSAL_USD (opcional)
//   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY              (já usadas pelo SES)

const crypto = require("crypto");
const { supabaseAdmin } = require("./_ses");

const ORIGENS_PERMITIDAS = ["https://admin.love.com.br", "http://localhost:8090", "http://127.0.0.1:8090"];
const MESES = 12;
const PRECO_PLANO_SUPABASE = { free: 0, pro: 25, team: 599 };
// Plano atual da Love na Supabase (decisão de 2026-10-23: fica no Free por
// enquanto). Vale quando a API não deixa ler o plano. Ao mudar para o Pro,
// troque aqui para "pro" ou informe SUPABASE_CUSTO_MENSAL_USD na Vercel.
const PLANO_SUPABASE_ATUAL = "free";

// O Cost Explorer cobra US$ 0,01 por consulta: guarda a resposta por 6 horas
// enquanto a função estiver quente.
let CACHE = null;
const VALIDADE_CACHE = 6 * 60 * 60 * 1000;

function cors(req, res) {
  const origem = req.headers.origin || "";
  if (ORIGENS_PERMITIDAS.includes(origem)) {
    res.setHeader("Access-Control-Allow-Origin", origem);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
}

/** "2026-10" dos últimos N meses, do mais antigo ao atual. */
function ultimosMeses() {
  const hoje = new Date();
  const lista = [];
  for (let i = MESES - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - i, 1));
    lista.push(d.toISOString().slice(0, 7));
  }
  return lista;
}

function mesesZerados(meses) {
  return Object.fromEntries(meses.map(m => [m, 0]));
}

/* ------------------------------------------------------------ Cotação */

async function cotacoes() {
  try {
    const r = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL");
    const j = await r.json();
    return { BRL: 1, USD: Number(j.USDBRL?.bid) || null, EUR: Number(j.EURBRL?.bid) || null };
  } catch {
    return { BRL: 1, USD: null, EUR: null };
  }
}

/* ------------------------------------------------------------- Vercel */

async function custoVercel(meses) {
  const base = { fonte: "vercel", nome: "Vercel", categoria: "Servidor", tipo: "recorrente", moeda: "USD" };
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) return { ...base, status: "nao_conectado", meses: mesesZerados(meses) };

  const de = `${meses[0]}-01T00:00:00.000Z`;
  const ate = new Date().toISOString();
  const params = new URLSearchParams({ from: de, to: ate });
  if (process.env.VERCEL_TEAM_ID) params.set("teamId", process.env.VERCEL_TEAM_ID);

  try {
    const r = await fetch(`https://api.vercel.com/v1/billing/charges?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const texto = await r.text();
    if (!r.ok) throw new Error(`Vercel respondeu ${r.status}: ${texto.slice(0, 160)}`);

    // Vem em JSON Lines (um registro FOCUS por linha); aceita também array.
    let registros;
    try {
      const j = JSON.parse(texto);
      registros = Array.isArray(j) ? j : (j.charges || j.data || []);
    } catch {
      registros = texto.split("\n").filter(l => l.trim()).map(l => JSON.parse(l));
    }

    // Soma por mês e abre por serviço (Build CPU Minutes, Function Storage...),
    // por projeto e por dia, para o detalhe e a previsão no Admin.
    const porMes = mesesZerados(meses);
    const servicos = {};
    const projetos = {};
    const dias = {};
    let moeda = "USD";
    registros.forEach(c => {
      const inicio = String(c.ChargePeriodStart || c.BillingPeriodStart || "");
      const mes = inicio.slice(0, 7);
      const valor = Number(c.BilledCost ?? c.EffectiveCost ?? 0) || 0;
      if (c.BillingCurrency) moeda = c.BillingCurrency;
      if (!(mes in porMes)) return;
      porMes[mes] += valor;
      const nome = c.ServiceName || c.ChargeDescription || "Outros";
      const chave = `${mes}|${nome}`;
      if (!servicos[chave]) servicos[chave] = { mes, servico: nome, valor: 0, lista: 0, quantidade: 0, unidade: c.PricingUnit || c.ConsumedUnit || "", tipo: c.ChargeCategory || "" };
      servicos[chave].valor += valor;
      servicos[chave].lista += Number(c.ListCost ?? c.EffectiveCost ?? valor) || 0;
      servicos[chave].quantidade += Number(c.PricingQuantity ?? c.ConsumedQuantity ?? 0) || 0;
      const projeto = c.Tags?.ProjectName || c.Tags?.projectName || c.Tags?.ProjectId || c.ResourceName || "";
      if (projeto && mes === meses[meses.length - 1]) projetos[projeto] = (projetos[projeto] || 0) + valor;
      const dia = inicio.slice(0, 10);
      if (dia) dias[dia] = (dias[dia] || 0) + valor;
    });
    const exemplo = registros[0] ? Object.keys(registros[0]) : [];
    return {
      ...base, moeda, status: "ativo", meses: porMes,
      servicos: Object.values(servicos).sort((a, b) => b.valor - a.valor),
      projetos, dias, campos: exemplo,
      exemplo_registro: registros.find(c => (c.ServiceName || "").includes("Build")) || registros[0] || null
    };
  } catch (e) {
    return { ...base, status: "erro", erro: String(e.message || e), meses: mesesZerados(meses) };
  }
}

/* ----------------------------------------------------------- Supabase */

async function custoSupabase(meses) {
  const base = { fonte: "supabase", nome: "Supabase", categoria: "Banco de dados", tipo: "recorrente", moeda: "USD" };
  const fixo = process.env.SUPABASE_CUSTO_MENSAL_USD;
  const token = process.env.SUPABASE_ACCESS_TOKEN;

  const comValor = (valor, extra = {}) => ({
    ...base, ...extra, status: "ativo",
    meses: Object.fromEntries(meses.map(m => [m, valor]))
  });

  if (fixo !== undefined && fixo !== "") return comValor(Number(fixo) || 0, { detalhe: "Valor fixo informado" });
  const planoInformado = () => comValor(PRECO_PLANO_SUPABASE[PLANO_SUPABASE_ATUAL], { detalhe: `Plano ${PLANO_SUPABASE_ATUAL}` });
  if (!token) return planoInformado();

  try {
    const cabecalho = { headers: { Authorization: `Bearer ${token}` } };
    let slug = process.env.SUPABASE_ORG_SLUG;
    if (!slug) {
      const r = await fetch("https://api.supabase.com/v1/organizations", cabecalho);
      if (!r.ok) throw new Error(`Supabase respondeu ${r.status}`);
      const orgs = await r.json();
      slug = Array.isArray(orgs) ? (orgs[0]?.slug || orgs[0]?.id) : null;
      if (!slug) {
        // Alguns tokens não listam organizações: pega a do projeto.
        const rp = await fetch("https://api.supabase.com/v1/projects", cabecalho);
        const projetos = rp.ok ? await rp.json() : [];
        slug = Array.isArray(projetos) ? (projetos[0]?.organization_slug || projetos[0]?.organization_id) : null;
        if (!slug) throw new Error(`Token sem acesso à organização (organizações: ${Array.isArray(orgs) ? orgs.length : "?"}, projetos: ${Array.isArray(projetos) ? projetos.length : rp.status})`);
      }
    }
    const r = await fetch(`https://api.supabase.com/v1/organizations/${encodeURIComponent(slug)}`, cabecalho);
    // Token sem permissão de ver a organização: usa o plano informado acima.
    if (r.status === 401 || r.status === 403) return planoInformado();
    if (!r.ok) throw new Error(`Supabase respondeu ${r.status}`);
    const org = await r.json();
    const plano = String(org.plan || "").toLowerCase();
    if (!(plano in PRECO_PLANO_SUPABASE)) {
      throw new Error(`Plano "${org.plan}" sem preço fixo; informe SUPABASE_CUSTO_MENSAL_USD`);
    }
    // Add-ons pagos de cada projeto (compute, IPv4, PITR, domínio...).
    // Preço por hora vira mês com 730 h. O plano pago já cobre US$ 10 de compute por projeto.
    let addons = 0;
    const nomes = [];
    try {
      const rp = await fetch("https://api.supabase.com/v1/projects", cabecalho);
      const projetos = rp.ok ? await rp.json() : [];
      for (const p of projetos.filter(p => !org.id || p.organization_id === org.id || p.organization_slug === slug)) {
        const ra = await fetch(`https://api.supabase.com/v1/projects/${p.id || p.ref}/billing/addons`, cabecalho);
        if (!ra.ok) continue;
        const ja = await ra.json();
        let doProjeto = 0;
        let compute = 0;
        (ja.selected_addons || []).forEach(a => {
          const preco = a.variant?.price || {};
          const valor = Number(preco.amount) || 0;
          const mensal = preco.interval === "hourly" ? valor * 730 : valor;
          if (a.type === "compute_instance") compute += mensal;
          else doProjeto += mensal;
          if (mensal > 0) nomes.push(a.variant?.name || a.type);
        });
        doProjeto += plano === "free" ? compute : Math.max(0, compute - 10);
        addons += doProjeto;
      }
    } catch { /* sem add-ons: fica só o plano */ }
    const total = Math.round((PRECO_PLANO_SUPABASE[plano] + addons) * 100) / 100;
    const detalhe = `Plano ${plano}` + (addons > 0 ? ` + add-ons (${nomes.join(", ")})` : "");
    return comValor(total, { detalhe });
  } catch (e) {
    return { ...base, status: "erro", erro: String(e.message || e), meses: mesesZerados(meses) };
  }
}

/* --------------------------------------------- Amazon SES (Cost Explorer) */

function hmac(chave, texto) {
  return crypto.createHmac("sha256", chave).update(texto, "utf8").digest();
}
function sha256(texto) {
  return crypto.createHash("sha256").update(texto, "utf8").digest("hex");
}

/** Chamada assinada (SigV4) ao Cost Explorer, sem SDK extra. */
async function costExplorer(alvo, corpo) {
  const host = "ce.us-east-1.amazonaws.com";
  const regiao = "us-east-1";
  const servico = "ce";
  const agora = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dia = agora.slice(0, 8);
  const payload = JSON.stringify(corpo);

  const cabecalhos = {
    "content-type": "application/x-amz-json-1.1",
    host,
    "x-amz-date": agora,
    "x-amz-target": `AWSInsightsIndexService.${alvo}`
  };
  const nomes = Object.keys(cabecalhos).sort();
  const canonico = [
    "POST", "/", "",
    nomes.map(n => `${n}:${cabecalhos[n]}`).join("\n") + "\n",
    nomes.join(";"),
    sha256(payload)
  ].join("\n");

  const escopo = `${dia}/${regiao}/${servico}/aws4_request`;
  const paraAssinar = ["AWS4-HMAC-SHA256", agora, escopo, sha256(canonico)].join("\n");
  const kData = hmac(`AWS4${process.env.AWS_SECRET_ACCESS_KEY}`, dia);
  const kAssinatura = hmac(hmac(hmac(kData, regiao), servico), "aws4_request");
  const assinatura = crypto.createHmac("sha256", kAssinatura).update(paraAssinar, "utf8").digest("hex");

  const r = await fetch(`https://${host}/`, {
    method: "POST",
    headers: {
      ...cabecalhos,
      Authorization: `AWS4-HMAC-SHA256 Credential=${process.env.AWS_ACCESS_KEY_ID}/${escopo}, SignedHeaders=${nomes.join(";")}, Signature=${assinatura}`
    },
    body: payload
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || j.Message || `AWS respondeu ${r.status}`);
  return j;
}

async function custoAws(meses) {
  const base = { fonte: "aws", nome: "Amazon AWS", categoria: "E-mail", tipo: "recorrente", moeda: "USD" };
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return { ...base, status: "nao_conectado", meses: mesesZerados(meses) };
  }
  try {
    const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const j = await costExplorer("GetCostAndUsage", {
      TimePeriod: { Start: `${meses[0]}-01`, End: amanha },
      Granularity: "MONTHLY",
      Metrics: ["UnblendedCost"],
      GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }]
    });
    // Fatura inteira da conta (SES, SNS, impostos...), somada por mês.
    const porMes = mesesZerados(meses);
    const doMesAtual = {};
    let moeda = "USD";
    (j.ResultsByTime || []).forEach(p => {
      const mes = String(p.TimePeriod?.Start || "").slice(0, 7);
      (p.Groups || []).forEach(g => {
        const custo = g.Metrics?.UnblendedCost;
        const valor = Number(custo?.Amount) || 0;
        if (custo?.Unit) moeda = custo.Unit;
        if (mes in porMes) porMes[mes] += valor;
        if (mes === meses[meses.length - 1] && valor >= 0.005) {
          const nome = String(g.Keys?.[0] || "").replace(/^Amazon |^AWS /, "").replace("Simple Email Service", "SES").replace("Simple Notification Service", "SNS");
          doMesAtual[nome] = (doMesAtual[nome] || 0) + valor;
        }
      });
    });
    const servicos = Object.entries(doMesAtual).sort((a, b) => b[1] - a[1]).map(([n, v]) => `${n} US$ ${v.toFixed(2)}`);
    const detalhe = servicos.length ? servicos.join(" · ") : "Sem cobrança no mês";
    return { ...base, moeda, status: "ativo", detalhe, meses: porMes };
  } catch (e) {
    return { ...base, status: "erro", erro: String(e.message || e), meses: mesesZerados(meses) };
  }
}

/* ------------------------------------------------------------ Handler */

module.exports = async (req, res) => {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });

  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Sem sessão" });

  try {
    return await responder(req, res, token);
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
};

async function responder(req, res, token) {
  const supabase = supabaseAdmin();
  if (!supabase) return res.status(500).json({ error: "Falta SUPABASE_SECRET_KEY no projeto love-platform da Vercel" });
  const { data: quem, error: erroSessao } = await supabase.auth.getUser(token);
  if (erroSessao || !quem?.user) return res.status(401).json({ error: "Sessão inválida" });
  const { data: admin } = await supabase
    .from("admins").select("id, active").eq("id", quem.user.id).maybeSingle();
  if (!admin || admin.active === false) return res.status(403).json({ error: "Acesso só para admins" });

  const forcar = String(req.query?.atualizar || "") === "1";
  if (!forcar && CACHE && Date.now() - CACHE.em < VALIDADE_CACHE) return res.status(200).json(CACHE.dados);

  const meses = ultimosMeses();
  const [taxas, vercel, supa, aws] = await Promise.all([
    cotacoes(), custoVercel(meses), custoSupabase(meses), custoAws(meses)
  ]);

  const dados = { meses, cotacoes: taxas, itens: [vercel, supa, aws], atualizado_em: new Date().toISOString() };
  // Com alguma integração em erro, não guarda: a próxima consulta tenta de novo.
  if (!dados.itens.some(i => i.status === "erro")) CACHE = { em: Date.now(), dados };
  return res.status(200).json(dados);
}
