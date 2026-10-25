// Vercel Serverless Function — traz os e-mails de contato@love.com.br para o
// Atendimento do Admin (ver api/_email-suporte.js).
// Endpoint: POST /api/atendimento-email
//   Header: Authorization: Bearer <access_token de um admin>
//   → { ok, configurado, novos, respostas }
// O Admin chama ao abrir Atendimento e a cada 30 segundos com a tela aberta.
// Um cron também pode chamar com Authorization: Bearer <CRON_SECRET>.

const { supabaseAdmin } = require("./_ses");
const { buscarEmailsNovos, configurado } = require("./_email-suporte");

const ORIGENS_PERMITIDAS = ["https://admin.love.com.br", "http://localhost:8090", "http://127.0.0.1:8090"];

function cors(req, res) {
  const origem = req.headers.origin || "";
  if (ORIGENS_PERMITIDAS.includes(origem)) {
    res.setHeader("Access-Control-Allow-Origin", origem);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
}

module.exports = async (req, res) => {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST" && req.method !== "GET") return res.status(405).json({ ok: false });

  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const db = supabaseAdmin();
  if (!db) return res.status(500).json({ ok: false, erro: "servidor_sem_configuracao" });
  if (!token) return res.status(401).json({ ok: false, erro: "sem_sessao" });

  const cron = process.env.CRON_SECRET && token === process.env.CRON_SECRET;
  if (!cron) {
    const { data: quem, error } = await db.auth.getUser(token);
    if (error || !quem?.user) return res.status(401).json({ ok: false, erro: "sessao_invalida" });
    const { data: admin } = await db.from("admins").select("id, active").eq("id", quem.user.id).maybeSingle();
    if (!admin || admin.active === false) return res.status(403).json({ ok: false, erro: "so_admin" });
  }

  if (!configurado()) return res.status(200).json({ ok: true, configurado: false, novos: 0, respostas: 0 });
  try {
    const r = await buscarEmailsNovos(db);
    return res.status(200).json({ ok: true, ...r });
  } catch (e) {
    console.error("atendimento-email:", e.message);
    const senhaErrada = /auth|credentials|invalid/i.test(e.message || "");
    return res.status(200).json({ ok: false, configurado: true, erro: senhaErrada ? "senha_recusada" : "falha_imap" });
  }
};
