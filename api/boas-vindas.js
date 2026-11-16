// Vercel Serverless Function — e-mail de boas-vindas de quem criou a conta
// com o Google.
// Endpoint: POST /api/boas-vindas
// Header:   Authorization: Bearer <access_token da pessoa que acabou de entrar>
//
// Quem se cadastra com e-mail e senha recebe o "Confirm sign up" do próprio
// Supabase (template em docs/emails/confirmar-cadastro.html). Quem entra pelo
// Google não recebe nada do Supabase — por isso a plataforma chama esta
// função logo depois de criar o cadastro de anfitrião (garantir_cliente_google).
//
// Só envia se: o token for válido, a conta for do Google, tiver sido criada
// nas últimas 48 h e ainda não tiver recebido boas-vindas (email_envios,
// template "Boas-vindas Google"). Assim chamar de novo não repete o e-mail.
//
// Variáveis: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AWS_REGION,
//   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, EMAIL_FROM

const { enviarEmail, supabaseAdmin } = require("./_ses");
const { emailLove, escapar } = require("./_email-love");

const TEMPLATE = "Boas-vindas Google";
const JANELA_MS = 48 * 60 * 60 * 1000;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Sem token" });

  const admin = supabaseAdmin();
  if (!admin) return res.status(500).json({ error: "Supabase não configurado" });

  const { data: dadosUsuario, error: erroUsuario } = await admin.auth.getUser(token);
  const usuario = dadosUsuario && dadosUsuario.user;
  if (erroUsuario || !usuario || !usuario.email) return res.status(401).json({ error: "Sessão inválida" });

  const app = usuario.app_metadata || {};
  const doGoogle = app.provider === "google" || (app.providers || []).includes("google");
  if (!doGoogle) return res.status(200).json({ enviado: false, motivo: "conta sem Google" });
  if (Date.now() - new Date(usuario.created_at).getTime() > JANELA_MS) {
    return res.status(200).json({ enviado: false, motivo: "conta antiga" });
  }

  const { data: jaEnviado } = await admin.from("email_envios")
    .select("id").eq("template", TEMPLATE).ilike("destinatario", usuario.email).neq("status", "falhou").limit(1);
  if (jaEnviado && jaEnviado.length) return res.status(200).json({ enviado: false, motivo: "já enviado" });

  const meta = usuario.user_metadata || {};
  const { data: cliente } = await admin.from("clientes").select("first_name").eq("id", usuario.id).maybeSingle();
  const nome = (cliente && cliente.first_name) || meta.given_name || String(meta.full_name || meta.name || "").split(/\s+/)[0] || "";

  const titulo = nome ? `Que bom ter você aqui, ${nome}` : "Que bom ter você aqui";
  const html = emailLove({
    preview: "Sua conta na Love está pronta. Vamos planejar o seu grande dia?",
    titulo,
    corpo: `
      <p style="margin:0 0 14px;">Sua conta na Love foi criada com o Google e já está pronta para usar.</p>
      <p style="margin:0;">Agora você pode criar o site do seu evento, enviar os convites, acompanhar as confirmações de presença e receber presentes, tudo num lugar só.</p>`,
    botao: { texto: "Acessar minha conta", link: "https://love.com.br/" },
    nota: `Você recebeu este e-mail porque entrou na Love com a conta Google ${escapar(usuario.email)}. Se não foi você, responda a esta mensagem.`,
  });

  const r = await enviarEmail({
    para: usuario.email,
    assunto: nome ? `Bem-vindo(a) à Love, ${nome}` : "Bem-vindo(a) à Love",
    html,
    template: TEMPLATE,
    categoria: "Boas-vindas",
  });
  if (!r || !r.ok) return res.status(502).json({ enviado: false, erro: (r && r.erro) || "Falha no envio" });
  return res.status(200).json({ enviado: true });
};
