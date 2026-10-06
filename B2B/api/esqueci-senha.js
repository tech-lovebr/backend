// Vercel Serverless Function — envia e-mail de redefinição de senha via AWS SES.
// Endpoint: POST /api/esqueci-senha
// Body (JSON): { email: string }
//
// O token de recuperação continua sendo gerado e validado pelo Supabase
// (supabaseAdmin.auth.admin.generateLink), só a entrega do e-mail passa a
// ser pelo nosso SES — mesmo remetente/visual dos outros e-mails transacionais
// (api/enviar-email.js), em vez do mailer padrão do Supabase.
//
// Variáveis de ambiente necessárias (já configuradas no projeto):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, EMAIL_FROM

const { createClient } = require("@supabase/supabase-js");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sesClient = new SESClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function buildHtml(link) {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background-color:#f8fafc; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc; padding: 24px 0;">
        <tr>
          <td align="center">
            <table width="560" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff; border-radius:8px; border:1px solid #e2e8f0; overflow:hidden;">
              <tr>
                <td style="padding: 24px; text-align:center; border-bottom:1px solid #f1f5f9;">
                  <span style="font-size:22px; font-weight:700; color:#0f172a; letter-spacing:-0.5px;">Love</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 32px 24px; color:#334155; font-size:15px; line-height:1.6;">
                  <p>Olá!</p>
                  <p>Recebemos um pedido para redefinir a senha da sua conta no Portal do Parceiro Love. Clique no botão abaixo para criar uma nova senha:</p>
                  <p style="text-align:center; margin: 28px 0;">
                    <a href="${link}" style="background-color:#0f172a; color:#ffffff; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight:600; display:inline-block;">Redefinir minha senha</a>
                  </p>
                  <p style="font-size:13px; color:#94a3b8;">Se você não pediu essa redefinição, pode ignorar este e-mail com segurança — sua senha continua a mesma. Este link expira em 1 hora.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: "E-mail é obrigatório" });
  }

  // Resposta sempre genérica — não revela se o e-mail tem conta ou não.
  const genericResponse = { ok: true, message: "Se esse e-mail estiver cadastrado, você vai receber um link de recuperação." };

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: "https://empresas.love.com.br/resetar-senha.html" },
  });

  if (error || !data?.properties?.action_link) {
    return res.status(200).json(genericResponse);
  }

  try {
    await sesClient.send(new SendEmailCommand({
      Source: process.env.EMAIL_FROM || "Love <contato@love.com.br>",
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: "Redefinir sua senha — Love", Charset: "UTF-8" },
        Body: { Html: { Charset: "UTF-8", Data: buildHtml(data.properties.action_link) } },
      },
    }));
  } catch (err) {
    console.error("Falha ao enviar e-mail de redefinição de senha:", err);
  }

  return res.status(200).json(genericResponse);
};
