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
// Plano Pro da Vercel: US$ 20 por mês, que já vêm como crédito de consumo.
const ASSINATURA_VERCEL_USD = 20;
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

    // Cada registro é um dia de um serviço num projeto. BilledCost é o que
    // vira fatura (já descontado o crédito do plano); EffectiveCost é o
    // consumo antes do crédito. "Pro" é a assinatura, rateada por dia.
    const porMes = mesesZerados(meses);
    let moeda = "USD";
    let primeiroDia = null;
    const linhas = registros.map(c => {
      if (c.BillingCurrency) moeda = c.BillingCurrency;
      const dia = String(c.ChargePeriodStart || c.BillingPeriodStart || "").slice(0, 10);
      if (dia && (!primeiroDia || dia < primeiroDia)) primeiroDia = dia;
      return {
        dia,
        servico: c.ServiceName || c.ChargeDescription || "Outros",
        cobrado: Number(c.BilledCost) || 0,
        consumo: Number(c.EffectiveCost ?? c.BilledCost) || 0,
        uso: Number(c.ConsumedQuantity) || 0,
        unidade: c.ConsumedUnit || "",
        projeto: c.Tags?.ProjectName || c.Tags?.ProjectId || ""
      };
    });
    const ehAssinatura = l => l.servico === "Pro";

    // Mês do calendário: cobrado + assinatura rateada.
    // Além do total, guarda o detalhe por serviço e quanto passou do crédito
    // do plano — é o que o Admin abre ao clicar na categoria e o que ele
    // chama de "potencial de redução" (o extra só existe por configuração).
    const porMesServico = {};
    const extraPorMes = mesesZerados(meses);
    linhas.forEach(l => {
      const mes = l.dia.slice(0, 7);
      if (!(mes in porMes)) return;
      porMes[mes] += ehAssinatura(l) ? l.consumo : l.cobrado;
      if (ehAssinatura(l)) return;
      extraPorMes[mes] += l.cobrado;
      if (!porMesServico[mes]) porMesServico[mes] = {};
      const sv = porMesServico[mes][l.servico]
        || (porMesServico[mes][l.servico] = { servico: l.servico, consumo: 0, cobrado: 0, uso: 0, unidade: l.unidade });
      sv.consumo += l.consumo; sv.cobrado += l.cobrado; sv.uso += l.uso;
    });

    // Lista ordenada por consumo, pronta para a tela.
    const mesesServicos = Object.fromEntries(Object.entries(porMesServico).map(([mes, mapa]) => [
      mes,
      Object.values(mapa).filter(sv => sv.consumo > 0.0005 || sv.cobrado > 0.0005).sort((x, y) => y.consumo - x.consumo)
    ]));

    // Detalhe por DIA, para o Admin responder "onde gastei hoje?" sem
    // estimativa. Só uma janela recente: o ano inteiro dia a dia seria quase
    // um megabyte de JSON em toda carga da tela, e período longo se resolve
    // bem com o detalhe mensal.
    const DIAS_DETALHADOS = 92;
    const corteDetalhe = new Date(Date.now() - DIAS_DETALHADOS * 86400000).toISOString().slice(0, 10);
    const porDiaServico = {};
    linhas.forEach(l => {
      if (ehAssinatura(l) || l.dia < corteDetalhe) return;
      if (!(l.consumo || l.cobrado || l.uso)) return;
      if (!porDiaServico[l.dia]) porDiaServico[l.dia] = {};
      const sv = porDiaServico[l.dia][l.servico]
        || (porDiaServico[l.dia][l.servico] = { servico: l.servico, consumo: 0, cobrado: 0, uso: 0, unidade: l.unidade });
      sv.consumo += l.consumo; sv.cobrado += l.cobrado; sv.uso += l.uso;
    });
    const diasServicos = Object.fromEntries(Object.entries(porDiaServico)
      .map(([dia, mapa]) => [dia, Object.values(mapa)]));

    // Ciclo de cobrança: começa todo mês no dia em que o plano começou.
    const hoje = new Date().toISOString().slice(0, 10);
    const diaDoCiclo = Number((primeiroDia || hoje).slice(8, 10));
    const [a, m] = hoje.split("-").map(Number);
    let inicioCiclo = new Date(Date.UTC(a, m - 1, diaDoCiclo));
    if (inicioCiclo.toISOString().slice(0, 10) > hoje) inicioCiclo = new Date(Date.UTC(a, m - 2, diaDoCiclo));
    const fimCiclo = new Date(Date.UTC(inicioCiclo.getUTCFullYear(), inicioCiclo.getUTCMonth() + 1, diaDoCiclo));
    const deCiclo = inicioCiclo.toISOString().slice(0, 10);
    const ateCiclo = fimCiclo.toISOString().slice(0, 10);
    const noCiclo = linhas.filter(l => l.dia >= deCiclo && l.dia < ateCiclo);

    // Agrega um intervalo de dias: totais, por servico e por projeto.
    const agregar = linhasDoIntervalo => {
      const servicos = {};
      const projetos = {};
      const diasUso = {};
      let consumo = 0;
      let extra = 0;
      let ultimoDia = null;
      linhasDoIntervalo.forEach(l => {
        if ((l.consumo || l.cobrado) && (!ultimoDia || l.dia > ultimoDia)) ultimoDia = l.dia;
        if (ehAssinatura(l)) return;
        consumo += l.consumo;
        extra += l.cobrado;
        if (!servicos[l.servico]) servicos[l.servico] = { servico: l.servico, consumo: 0, cobrado: 0, uso: 0, unidade: l.unidade };
        const sv = servicos[l.servico];
        sv.consumo += l.consumo; sv.cobrado += l.cobrado; sv.uso += l.uso;
        if (l.projeto) {
          if (!projetos[l.projeto]) projetos[l.projeto] = { projeto: l.projeto, consumo: 0, minutos_build: 0 };
          projetos[l.projeto].consumo += l.consumo;
          if (l.servico === "Build CPU Minutes") projetos[l.projeto].minutos_build += l.uso;
        }
        diasUso[l.dia] = (diasUso[l.dia] || 0) + l.consumo;
      });
      return { consumo, extra, servicos, projetos, dias: diasUso, ultimoDia };
    };

    const atual = agregar(noCiclo);
    const ultimoDia = atual.ultimoDia || deCiclo;

    // Base de comparacao, sempre recortada nos mesmos dias decorridos: comparar
    // um ciclo pela metade com um periodo inteiro mostraria queda onde nao houve.
    const diasDecorridos = Math.round((new Date(`${ultimoDia}T12:00:00Z`) - new Date(`${deCiclo}T12:00:00Z`)) / 86400000) + 1;
    // Dia 31 num mes de 30 transbordaria para o mes seguinte: prende no ultimo dia.
    const ultimoDiaDoMes = (ano, mes) => new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
    const recorte = (deISO, dias) => {
      const ate = new Date(new Date(`${deISO}T00:00:00Z`).getTime() + dias * 86400000).toISOString().slice(0, 10);
      return { de: deISO, ate, dias, linhas: linhas.filter(l => l.dia >= deISO && l.dia < ate) };
    };
    const temGasto = r => r.linhas.some(l => !ehAssinatura(l) && (l.consumo || l.cobrado));

    // 1a opcao: o ciclo anterior. 2a: o mes de calendario anterior - serve
    // quando o ciclo nao comeca no dia 1 e a conta e nova demais para ter um
    // ciclo fechado atras.
    const anoCiclo = inicioCiclo.getUTCFullYear();
    const mesCiclo = inicioCiclo.getUTCMonth() - 1;
    const deCicloAnterior = new Date(Date.UTC(anoCiclo, mesCiclo, Math.min(diaDoCiclo, ultimoDiaDoMes(anoCiclo, mesCiclo)))).toISOString().slice(0, 10);
    const deMesAnterior = new Date(Date.UTC(a, m - 2, 1)).toISOString().slice(0, 10);

    const candidatos = [
      { tipo: "ciclo", rotulo: "ciclo anterior", ...recorte(deCicloAnterior, diasDecorridos) },
      { tipo: "mes", rotulo: "mês anterior", ...recorte(deMesAnterior, diasDecorridos) }
    ];
    const base = candidatos.find(temGasto) || null;
    const anterior = agregar(base ? base.linhas : []);

    const comparado = (lista, chave, campos) => lista.map(item => {
      const antes = anterior[chave][item[campos.id]];
      const saida = { ...item };
      if (base) campos.valores.forEach(c => { saida[`${c}_antes`] = antes ? antes[c] : 0; });
      return saida;
    });

    const ciclo = {
      inicio: deCiclo, fim: ateCiclo, dados_ate: ultimoDia,
      plano: "Pro", assinatura: ASSINATURA_VERCEL_USD, credito: ASSINATURA_VERCEL_USD,
      consumo: atual.consumo, extra: atual.extra, total: ASSINATURA_VERCEL_USD + atual.extra,
      servicos: comparado(
        Object.values(atual.servicos).filter(sv => sv.consumo > 0.0005 || sv.cobrado > 0.0005).sort((x, y) => y.consumo - x.consumo),
        "servicos", { id: "servico", valores: ["uso", "consumo"] }),
      projetos: comparado(
        Object.values(atual.projetos).filter(p => p.consumo > 0.0005).sort((x, y) => y.consumo - x.consumo),
        "projetos", { id: "projeto", valores: ["minutos_build", "consumo"] }),
      dias: atual.dias,
      dias_decorridos: diasDecorridos,
      // Primeiro dia com cobranca na base da Vercel: explica, na tela, por que
      // as vezes nao ha periodo anterior para comparar.
      primeiro_dia: primeiroDia,
      anterior: base
        ? { tipo: base.tipo, rotulo: base.rotulo, inicio: base.de, fim: base.ate, dias: diasDecorridos, consumo: anterior.consumo, extra: anterior.extra }
        : null
    };
    return {
      ...base, moeda, status: "ativo", meses: porMes,
      meses_servicos: mesesServicos,
      dias_servicos: diasServicos,
      dias_servicos_desde: corteDetalhe,
      meses_extra: extraPorMes,
      assinatura_mensal: ASSINATURA_VERCEL_USD,
      detalhe: `Plano Pro + consumo além do crédito`,
      ciclo
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
  const base = { fonte: "aws", nome: "Amazon", categoria: "E-mail", tipo: "recorrente", moeda: "USD" };
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
    const servicosAws = [];
    let moeda = "USD";
    (j.ResultsByTime || []).forEach(p => {
      const mes = String(p.TimePeriod?.Start || "").slice(0, 7);
      (p.Groups || []).forEach(g => {
        const custo = g.Metrics?.UnblendedCost;
        const valor = Number(custo?.Amount) || 0;
        if (custo?.Unit) moeda = custo.Unit;
        if (mes in porMes) porMes[mes] += valor;
        if (mes in porMes && valor >= 0.0005) servicosAws.push({ mes, servico: String(g.Keys?.[0] || ""), valor });
        if (mes === meses[meses.length - 1] && valor >= 0.005) {
          const nome = String(g.Keys?.[0] || "").replace(/^Amazon |^AWS /, "").replace("Simple Email Service", "SES").replace("Simple Notification Service", "SNS");
          doMesAtual[nome] = (doMesAtual[nome] || 0) + valor;
        }
      });
    });
    const servicos = Object.entries(doMesAtual).sort((a, b) => b[1] - a[1]).map(([n, v]) => `${n} US$ ${v.toFixed(2)}`);
    const detalhe = servicos.length ? servicos.join(" · ") : "Sem cobrança no mês";
    return { ...base, moeda, status: "ativo", detalhe, meses: porMes, servicos: servicosAws };
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
