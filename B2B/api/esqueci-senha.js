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
//   SUPABASE_URL, SUPABASE_SECRET_KEY
//   AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, EMAIL_FROM

const { createClient } = require("@supabase/supabase-js");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

// Mesmo banco do site do Hub (js/supabase-init.js): a variável SUPABASE_URL
// pode apontar para outro projeto, e aí a conta não é encontrada e nada sai.
const SUPABASE_URL_HUB = "https://krpgtixwmxwhtjchcufl.supabase.co";
const supabaseAdmin = createClient(
  SUPABASE_URL_HUB,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sesClient = new SESClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Registro no livro-razão de e-mails (tabela email_envios, aba E-mails do Admin):
// enviado, falhou ou "sem conta" — assim dá para ver por que um link não chegou.
async function registrar(linha) {
  try {
    const base = { remetente: process.env.EMAIL_FROM || "Love <contato@love.com.br>", assunto: "Redefinir sua senha — Love", template: "Hub · Esqueci minha senha", categoria: "Sistema", provedor: "Amazon SES" };
    const l = { ...base, ...linha };
    if (l.message_id) await supabaseAdmin.from("email_envios").upsert(l, { onConflict: "message_id" });
    else await supabaseAdmin.from("email_envios").insert(l);
  } catch (e) { console.error("esqueci-senha: falha ao registrar em email_envios", e); }
}

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
    options: { redirectTo: "https://hub.love.com.br/resetar-senha" },
  });

  if (error || !data?.properties?.action_link) {
    // E-mail sem conta: resposta genérica (não revela quem está cadastrado).
    const semConta = error && (error.status === 404 || /not.?found/i.test(error.message || ""));
    await registrar({ destinatario: email, status: "falhou", erro: semConta ? "Sem conta com este e-mail" : "generateLink: " + (error?.message || "sem link") });
    if (!error || semConta) return res.status(200).json(genericResponse);
    // Falha nossa (chave, configuração): o login cai no envio do próprio Supabase.
    console.error("esqueci-senha: generateLink falhou:", error);
    return res.status(500).json({ error: "Falha ao gerar o link", detalhe: error.message || String(error) });
  }

  try {
    const inicio = Date.now();
    const r = await sesClient.send(new SendEmailCommand({
      Source: process.env.EMAIL_FROM || "Love <contato@love.com.br>",
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: "Redefinir sua senha — Love", Charset: "UTF-8" },
        Body: { Html: { Charset: "UTF-8", Data: buildHtml(data.properties.action_link) } },
      },
    }));
    await registrar({ destinatario: email, status: "enviado", message_id: r.MessageId, latencia_ms: Date.now() - inicio, trecho: "Recebemos um pedido para redefinir a senha da sua conta no Love Hub." });
  } catch (err) {
    console.error("Falha ao enviar e-mail de redefinição de senha:", err);
    await registrar({ destinatario: email, status: "falhou", erro: "SES: " + (err?.message || err?.name || String(err)) });
    return res.status(502).json({ error: "Falha ao enviar o e-mail", detalhe: err?.name || err?.message || "SES" });
  }

  return res.status(200).json(genericResponse);
};
