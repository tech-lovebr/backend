// Vercel Serverless Function — envia por e-mail o convite de organizador.
// Endpoint: POST /api/convidar-organizador
// Body (JSON): { token: string }
//
// O convite em si já foi criado pela plataforma (função convidar_organizador,
// migration 054) com um token aleatório. Aqui só se monta e envia o e-mail
// com o link de aceite — por isso não precisa de segredo no navegador: sem
// um token válido e pendente não há o que enviar. Os dados do evento e de
// quem convidou são lidos com a service role key.
//
// Variáveis de ambiente (as mesmas de api/enviar-email.js):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, EMAIL_FROM

const { createClient } = require("@supabase/supabase-js");

const PAPEIS = {
  anfitriao: "Anfitrião",
  designer: "Designer",
  assessoria: "Assessoria",
  personalizado: "Colaborador",
};

function escapar(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function htmlDoEmail({ anfitriao, evento, papel, link }) {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0; padding:0; background-color:#f8fafc; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc; padding: 24px 0;">
        <tr><td align="center">
          <table width="560" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff; border-radius:8px; border:1px solid #e2e8f0; overflow:hidden;">
            <tr><td style="padding: 24px; text-align:center; border-bottom:1px solid #f1f5f9;">
              <span style="font-size:22px; font-weight:700; color:#0f172a; letter-spacing:-0.5px;">Love</span>
            </td></tr>
            <tr><td style="padding: 32px 24px; color:#334155; font-size:15px; line-height:1.6;">
              <h2 style="margin-top:0; color:#0f172a; font-size:18px;">Você foi convidado(a) para organizar um evento</h2>
              <p><strong>${escapar(anfitriao)}</strong> convidou você para ajudar na organização de <strong>${escapar(evento)}</strong> na Love, como <strong>${escapar(papel)}</strong>.</p>
              <p>Para aceitar, entre com a sua conta da Love (de anfitrião ou de fornecedor) usando este mesmo e-mail.</p>
              <div style="text-align:center; margin: 28px 0;">
                <a href="${escapar(link)}" style="background-color:#183b54; color:#ffffff; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight:600; display:inline-block;">Aceitar convite</a>
              </div>
              <p style="font-size:13px; color:#64748b;">Se o botão não funcionar, copie este link no navegador:<br><a href="${escapar(link)}" style="color:#183b54;">${escapar(link)}</a></p>
            </td></tr>
            <tr><td style="padding: 16px 24px; background-color:#f8fafc; text-align:center; font-size:12px; color:#94a3b8; border-top:1px solid #f1f5f9;">
              Dúvidas? Responda a este e-mail ou escreva para contato@love.com.br.<br>© 2026 Love. Todos os direitos reservados.
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>`;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, erro: "metodo_nao_permitido" });
  }
  const { token } = req.body || {};
  if (!token || !/^[0-9a-f-]{36}$/i.test(String(token))) {
    return res.status(400).json({ ok: false, erro: "token_invalido" });
  }

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: conv, error } = await supabaseAdmin
    .from("eventos_organizadores")
    .select("id, email, papel, status, evento_id, convidado_por")
    .eq("token", token)
    .maybeSingle();
  if (error || !conv) return res.status(404).json({ ok: false, erro: "convite_nao_encontrado" });
  if (conv.status !== "pendente") return res.status(200).json({ ok: true, enviado: false, motivo: conv.status });

  const [{ data: evento }, { data: anfitriao }] = await Promise.all([
    supabaseAdmin.from("eventos").select("titulo, cliente_id").eq("id", conv.evento_id).maybeSingle(),
    supabaseAdmin.from("clientes").select("full_name, couple_name").eq("id", conv.convidado_por).maybeSingle(),
  ]);

  const host = req.headers["x-forwarded-host"] || req.headers.host || "love.com.br";
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0];
  const link = `${proto}://${host}/organizador?token=${token}`;
  const nomeAnfitriao = (anfitriao && (anfitriao.full_name || anfitriao.couple_name)) || "Um anfitrião";
  const nomeEvento = (evento && evento.titulo) || "um evento";
  const papel = PAPEIS[conv.papel] || "Colaborador";

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.EMAIL_FROM) {
    return res.status(200).json({ ok: true, enviado: false, motivo: "email_nao_configurado", link });
  }

  try {
    const { enviarEmail } = require("./_ses");
    const r = await enviarEmail({
      para: conv.email,
      assunto: `${nomeAnfitriao} convidou você para organizar ${nomeEvento}`,
      texto: `${nomeAnfitriao} convidou você para organizar ${nomeEvento} na Love, como ${papel}. Aceite em: ${link}`,
      html: htmlDoEmail({ anfitriao: nomeAnfitriao, evento: nomeEvento, papel, link }),
      template: "Convite de organizador",
      categoria: "Convites",
    });
    if (!r.ok) throw new Error(r.erro);
    return res.status(200).json({ ok: true, enviado: true, link });
  } catch (e) {
    console.error("Erro ao enviar convite de organizador:", e);
    return res.status(200).json({ ok: true, enviado: false, motivo: "falha_envio", link });
  }
};
