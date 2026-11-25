// Vercel Serverless Function — gateways de pagamento para o Admin
// (Operacional › Gateways).
// Endpoint: GET /api/gateways   Header: Authorization: Bearer <access_token de um admin>
//
// Devolve os gateways integrados, qual é o principal e quais são de
// contingência (GATEWAYS_ATIVOS, ver api/_gateways.js), se cada um está
// configurado e respondendo, e as taxas que o Asaas cobrou da conta principal
// mês a mês. Nunca devolve chave nem segredo, só se existe.

const { supabaseAdmin } = require("./_ses");
const { asaas } = require("./_asaas");
const { taxasAsaas, ambienteAsaas } = require("./_asaas-taxas");
const { gatewaysAtivos, gatewaysDisponiveis } = require("./_gateways");

const ORIGENS_PERMITIDAS = ["https://admin.love.com.br", "http://localhost:8090", "http://127.0.0.1:8090"];
const MESES = 12;

function cors(req, res) {
  const origem = req.headers.origin || "";
  if (ORIGENS_PERMITIDAS.includes(origem)) {
    res.setHeader("Access-Control-Allow-Origin", origem);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
}

function ultimosMeses() {
  const hoje = new Date();
  return Array.from({ length: MESES }, (_, i) => {
    const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - (MESES - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}

const NOMES = { asaas: "Asaas" };

async function situacaoAsaas(meses) {
  const configuracao = {
    chave: !!process.env.ASAAS_API_KEY,
    webhook: !!process.env.ASAAS_WEBHOOK_TOKEN,
    cifra: !!process.env.ASAAS_CHAVE_CIFRA,
  };
  const base = { ambiente: ambienteAsaas(), configuracao };
  if (!configuracao.chave) return { ...base, conexao: "nao_conectado", taxas: null };

  const [saldo, taxas] = await Promise.all([
    asaas("/finance/balance").then(j => ({ ok: true, valor: Number(j && j.balance) || 0 }), e => ({ ok: false, erro: String(e.message || e).slice(0, 200) })),
    taxasAsaas(meses).catch(e => ({ erro: String(e.message || e).slice(0, 200) })),
  ]);
  return {
    ...base,
    conexao: saldo.ok ? "ok" : "erro",
    erro: saldo.ok ? null : saldo.erro,
    saldo: saldo.ok ? saldo.valor : null,
    taxas,
  };
}

module.exports = async (req, res) => {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });

  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const db = supabaseAdmin();
  if (!db) return res.status(500).json({ error: "Servidor sem configuração" });
  if (!token) return res.status(401).json({ error: "Sem sessão" });

  try {
    const { data: quem, error } = await db.auth.getUser(token);
    if (error || !quem?.user) return res.status(401).json({ error: "Sessão inválida" });
    const { data: admin } = await db.from("admins").select("id, active").eq("id", quem.user.id).maybeSingle();
    if (!admin || admin.active === false) return res.status(403).json({ error: "Acesso só para admins" });

    const meses = ultimosMeses();
    const ativos = gatewaysAtivos();
    const gateways = await Promise.all(gatewaysDisponiveis().map(async id => {
      const papel = ativos[0] === id ? "principal" : ativos.includes(id) ? "contingencia" : "desligado";
      const situacao = id === "asaas" ? await situacaoAsaas(meses) : { conexao: "nao_conectado" };
      return { id, nome: NOMES[id] || id, papel, ordem: ativos.indexOf(id), ...situacao };
    }));

    return res.status(200).json({ meses, ativos, gateways, atualizado_em: new Date().toISOString() });
  } catch (e) {
    console.error("gateways:", e.message);
    return res.status(500).json({ error: "Não foi possível ler os gateways" });
  }
};
