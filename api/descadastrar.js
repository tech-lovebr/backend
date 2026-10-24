// Vercel Serverless Function — descadastro dos e-mails de marketing.
// Endpoint: /api/descadastrar?e=<e-mail em base64url>&t=<assinatura>
//
//   GET  → página "Descadastrar <e-mail>?" com o botão de confirmar
//          (assim, robôs que abrem links não descadastram ninguém).
//   POST → descadastra: grava em email_descadastros (migration 109) e,
//          se o e-mail for de um anfitrião, desliga Ofertas, Benefícios e
//          Viagens em Configurações › Preferências. Também atende o
//          "Cancelar inscrição" do Gmail (List-Unsubscribe-Post, um clique).
//
// Variáveis: SUPABASE_SERVICE_ROLE_KEY (assina e grava), DESCADASTRO_SECRET (opcional).

const { supabaseAdmin } = require("./_ses");
const { assinaturaConfere, emailDoLink } = require("./_descadastro");

const esc = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function pagina(titulo, texto, extra = "") {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex">
  <title>${esc(titulo)} · Love</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px 16px; background: #F4F4F5; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #18181B; }
    .caixa { width: 100%; max-width: 440px; background: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 10px; padding: 32px 28px; text-align: center; }
    .logo { font-size: 26px; font-weight: 700; letter-spacing: -0.04em; color: #183b54; margin-bottom: 24px; }
    h1 { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.025em; }
    p { margin: 12px 0 0; font-size: 14px; line-height: 1.6; color: #52525B; }
    b { color: #18181B; font-weight: 600; }
    form { margin: 24px 0 0; }
    button { width: 100%; height: 42px; border: 0; border-radius: 8px; background: #183b54; color: #FFFFFF; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
    button:hover { background: #122c3f; }
    a { color: #183b54; }
    .nota { font-size: 12px; color: #A1A1AA; }
  </style>
</head>
<body>
  <main class="caixa">
    <div class="logo">love</div>
    <h1>${esc(titulo)}</h1>
    <p>${texto}</p>
    ${extra}
  </main>
</body>
</html>`;
}

async function descadastrar(db, email) {
  const { error } = await db.from("email_descadastros").upsert({ email, origem: "link" }, { onConflict: "email" });
  if (error) throw error;
  // Anfitrião: desliga também os toggles de e-mail em Preferências.
  const { data: cliente } = await db.from("clientes").select("id").ilike("email", email.replace(/[%_\\]/g, "\\$&")).maybeSingle();
  if (!cliente) return;
  const { data } = await db.auth.admin.getUserById(cliente.id);
  const meta = (data && data.user && data.user.user_metadata) || {};
  const preferencias = { ...(meta.preferencias || {}), ofertas: false, beneficios: false, viagens: false };
  await db.auth.admin.updateUserById(cliente.id, { user_metadata: { ...meta, preferencias } });
}

module.exports = async (req, res) => {
  const email = emailDoLink(req.query.e);
  const valido = email && assinaturaConfere(email, req.query.t);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (!valido) {
    return res.status(400).send(pagina("Link inválido", "Este link de descadastro não é válido ou foi copiado pela metade. Abra de novo pelo botão no fim do e-mail, ou desative as comunicações em <b>Configurações › Preferências</b> na sua conta."));
  }

  if (req.method === "GET") {
    return res.status(200).send(pagina(
      "Descadastrar dos e-mails da Love",
      `Você não vai mais receber ofertas, benefícios, viagens e novidades da Love em <b>${esc(email)}</b>.`,
      `<form method="post"><button type="submit">Confirmar descadastro</button></form>
       <p class="nota">Os avisos do seu evento, como presentes, confirmações de presença e segurança da conta, continuam chegando.</p>`
    ));
  }

  if (req.method !== "POST") return res.status(405).send(pagina("Método não permitido", "Use o botão da página de descadastro."));

  const db = supabaseAdmin();
  if (!db) return res.status(500).send(pagina("Não foi possível descadastrar agora", "Tente de novo em alguns minutos."));
  try {
    await descadastrar(db, email);
  } catch (e) {
    console.error("descadastrar:", e && e.message);
    return res.status(500).send(pagina("Não foi possível descadastrar agora", "Tente de novo em alguns minutos."));
  }
  return res.status(200).send(pagina(
    "Pronto, descadastro feito",
    `<b>${esc(email)}</b> não vai mais receber ofertas e novidades da Love. Se mudar de ideia, é só religar em <b>Configurações › Preferências</b> na sua conta.`,
    `<p class="nota"><a href="https://love.com.br">Voltar para a Love</a></p>`
  ));
};
