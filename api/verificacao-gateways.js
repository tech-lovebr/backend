// Vercel Serverless Function — Admin aprovou a identidade do anfitrião:
// manda os dados e documentos aprovados para os gateways (hoje o Asaas).
// A pessoa envia uma vez só; cada gateway recebe a mesma cópia.
// Endpoint: POST /api/verificacao-gateways   { cliente_id }
// Header:   Authorization: Bearer <access_token de um admin>
// Chamado pelo Admin (admin.love.com.br › Verificações). Ver api/_gateways.js.

const { supabaseAdmin } = require("./_ses");
const { enviarParaGateways } = require("./_gateways");

const ORIGENS_PERMITIDAS = ["https://admin.love.com.br", "http://localhost:8090", "http://127.0.0.1:8090"];

function cors(req, res) {
  const origem = req.headers.origin || "";
  if (ORIGENS_PERMITIDAS.includes(origem)) {
    res.setHeader("Access-Control-Allow-Origin", origem);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
}

module.exports = async (req, res) => {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, erro: "metodo_nao_permitido" });

  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const db = supabaseAdmin();
  if (!db) return res.status(500).json({ ok: false, erro: "servidor_sem_configuracao" });
  if (!token) return res.status(401).json({ ok: false, erro: "sem_sessao" });

  try {
    const { data: quem, error } = await db.auth.getUser(token);
    if (error || !quem?.user) return res.status(401).json({ ok: false, erro: "sessao_invalida" });
    const { data: admin } = await db.from("admins").select("id, active").eq("id", quem.user.id).maybeSingle();
    if (!admin || admin.active === false) return res.status(403).json({ ok: false, erro: "so_admin" });

    const clienteId = String((req.body || {}).cliente_id || "");
    if (!/^[0-9a-f-]{36}$/i.test(clienteId)) return res.status(400).json({ ok: false, erro: "cliente_invalido" });

    const resultado = await enviarParaGateways(db, clienteId);
    return res.status(200).json({ ok: true, ...resultado });
  } catch (e) {
    console.error("verificacao-gateways:", e.message);
    return res.status(500).json({ ok: false, erro: "falha" });
  }
};
