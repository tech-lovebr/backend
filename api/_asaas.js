// Asaas (gateway de pagamento) — funções comuns das rotas /api/asaas*.
// O arquivo começa com "_" para a Vercel não publicar como rota.
//
// Variáveis de ambiente (projeto love-platform na Vercel):
//   ASAAS_API_KEY        chave da conta principal da Love (sandbox: $aact_hmlg_…)
//   ASAAS_BASE_URL       opcional; padrão = sandbox (https://api-sandbox.asaas.com/v3).
//                        Produção: https://api.asaas.com/v3
//   ASAAS_WEBHOOK_TOKEN  segredo (32+ caracteres) que o Asaas manda no header
//                        asaas-access-token dos webhooks
//   ASAAS_CHAVE_CIFRA    segredo usado para cifrar as chaves das contas dos
//                        anfitriões no banco (nunca mudar depois de usar)
//   SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY), NEXT_PUBLIC_SUPABASE_URL

const crypto = require("crypto");
const { supabaseAdmin } = require("./_ses");

const BASE = (process.env.ASAAS_BASE_URL || "https://api-sandbox.asaas.com/v3").replace(/\/+$/, "");
const USER_AGENT = "Love/1.0 (love.com.br)";

/** Chamada à API do Asaas. `chave` = conta principal (padrão) ou a da subconta. */
async function asaas(caminho, { metodo = "GET", corpo, chave } = {}) {
  const apiKey = chave || process.env.ASAAS_API_KEY;
  if (!apiKey) {
    const e = new Error("ASAAS_API_KEY não configurada");
    e.codigo = "sem_chave";
    throw e;
  }
  const r = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers: {
      access_token: apiKey,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await r.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = { bruto: texto }; }
  if (!r.ok) {
    const msg = (dados && Array.isArray(dados.errors) && dados.errors.map(x => x.description).join(" ")) || `HTTP ${r.status}`;
    const e = new Error(msg);
    e.status = r.status;
    e.detalhes = dados;
    throw e;
  }
  return dados;
}

/* ---------------------------------------------- Cifra das chaves (AES-GCM) */

function chaveDaCifra() {
  const segredo = process.env.ASAAS_CHAVE_CIFRA;
  if (!segredo) throw new Error("ASAAS_CHAVE_CIFRA não configurada");
  return crypto.createHash("sha256").update(segredo).digest();
}

function cifrar(texto) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", chaveDaCifra(), iv);
  const dados = Buffer.concat([c.update(String(texto), "utf8"), c.final()]);
  return [iv, c.getAuthTag(), dados].map(b => b.toString("base64")).join(".");
}

function decifrar(guardado) {
  const [iv, tag, dados] = String(guardado).split(".").map(p => Buffer.from(p, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", chaveDaCifra(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(dados), d.final()]).toString("utf8");
}

/* ------------------------------------------------------- Quem está logado */

/** Confere o access_token do Supabase (header Authorization: Bearer …). */
async function usuarioDaRequisicao(req) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const db = supabaseAdmin();
  if (!token || !db) return { db, usuario: null };
  const { data, error } = await db.auth.getUser(token);
  return { db, usuario: error ? null : data.user };
}

/** Chave da subconta do anfitrião (decifrada), ou null. */
async function chaveDaConta(db, clienteId) {
  const { data } = await db.from("contas_recebimento_segredos").select("api_key_cifrada").eq("cliente_id", clienteId).maybeSingle();
  return data ? decifrar(data.api_key_cifrada) : null;
}

/** Situação do Asaas (GET /myAccount/status) → status da Love. */
function statusDaLove(s) {
  if (!s) return "em_analise";
  if (s.general === "APPROVED") return "aprovada";
  if (s.general === "REJECTED" || s.documentation === "REJECTED") return "recusada";
  if (s.documentation === "PENDING" || s.documentation === "REJECTED") return "documentos";
  return "em_analise";
}

/**
 * Pagamento confirmado no Asaas → presentes pagos na Love.
 * Usa o id da cobrança guardado em presentes_contribuicoes.gateway_ref.
 */
/** Divide um total em centavos na proporção dos pesos (a sobra do arredondamento vai no último). */
function dividir(pesos, total) {
  const soma = pesos.reduce((s, v) => s + v, 0) || 1;
  const emCentavos = Math.round(total * 100);
  const partes = pesos.map(v => Math.floor(emCentavos * v / soma));
  partes[partes.length - 1] += emCentavos - partes.reduce((s, v) => s + v, 0);
  return partes.map(c => c / 100);
}

async function confirmarPagamento(db, pagamentoId) {
  const { data: itens } = await db.from("presentes_contribuicoes").select("id, status, valor, repasse").eq("gateway_ref", pagamentoId);
  let confirmados = 0;
  for (const c of itens || []) {
    if (c.status === "pago") continue;
    const { error } = await db.rpc("confirmar_contribuicao", { p_id: c.id, p_gateway_ref: pagamentoId });
    if (!error) confirmados++;
  }
  // Comissão da Love = líquido do Asaas (já sem a tarifa) − repasse ao anfitrião.
  if (confirmados && itens.every(c => c.repasse != null)) {
    try {
      const pagamento = await asaas(`/payments/${pagamentoId}`);
      const liquido = Number(pagamento.netValue);
      if (liquido > 0) {
        const repasse = itens.reduce((s, c) => s + Number(c.repasse), 0);
        const comissoes = dividir(itens.map(c => Number(c.valor)), Math.max(0, liquido - repasse));
        for (let i = 0; i < itens.length; i++) {
          await db.from("presentes_contribuicoes").update({ comissao_love: comissoes[i] }).eq("id", itens[i].id);
        }
      }
    } catch (e) {
      console.error("comissao liquida:", e.message);
    }
  }
  return confirmados;
}

module.exports = { asaas, cifrar, decifrar, usuarioDaRequisicao, chaveDaConta, statusDaLove, confirmarPagamento, dividir, BASE };
