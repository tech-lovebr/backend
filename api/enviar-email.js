// Vercel Serverless Function — envia e-mail transacional via AWS SES.
// Endpoint: POST /api/enviar-email
// Body (JSON): { type: 'WELCOME' | 'GUEST_CONFIRMED' | 'GIFT_RECEIVED', to: string, data: object }
// Header obrigatório: x-webhook-secret (precisa bater com EMAIL_WEBHOOK_SECRET)
//
// Variáveis de ambiente necessárias (Vercel → Settings → Environment Variables):
//   AWS_REGION              ex: "us-east-1" (região onde seu domínio está verificado no SES)
//   AWS_ACCESS_KEY_ID
//   AWS_SECRET_ACCESS_KEY
//   EMAIL_FROM              ex: "Love <contato@love.com.br>" (precisa estar verificado no SES)
//   EMAIL_WEBHOOK_SECRET    string aleatória — quem chamar este endpoint precisa enviá-la
//                           no header "x-webhook-secret"

const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const sesClient = new SESClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function buildHtmlTemplate(content) {
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
                  ${content}
                </td>
              </tr>
              <tr>
                <td style="padding: 16px 24px; background-color:#f8fafc; text-align:center; font-size:12px; color:#94a3b8; border-top:1px solid #f1f5f9;">
                  Dúvidas? Responda a este e-mail ou escreva para contato@love.com.br.<br>
                  © 2026 Love. Todos os direitos reservados.
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

function getTemplate(type, data) {
  switch (type) {
    case "WELCOME":
      return {
        subject: `Bem-vindo(a) ao Love, ${data.name}! 🎉`,
        text: `Olá ${data.name}! Sua conta foi criada com sucesso no Love. Acesse: https://love.com.br/dashboard.html`,
        html: buildHtmlTemplate(`
          <h2 style="margin-top:0; color:#0f172a; font-size:18px;">Sua conta foi criada com sucesso!</h2>
          <p>Olá, <strong>${data.name}</strong>.</p>
          <p>Agora você tem acesso completo para gerenciar sua lista de convidados, receber confirmações e organizar seus presentes em um só lugar.</p>
          <div style="text-align:center; margin: 28px 0;">
            <a href="https://love.com.br/dashboard.html" style="background-color:#0f172a; color:#ffffff; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight:600; display:inline-block;">Acessar Minha Conta</a>
          </div>
        `),
      };

    case "GUEST_CONFIRMED":
      return {
        subject: `Nova confirmação: ${data.guestName}`,
        text: `${data.guestName} confirmou presença no seu evento.`,
        html: buildHtmlTemplate(`
          <h2 style="margin-top:0; color:#0f172a; font-size:18px;">Presença Confirmada! 🥂</h2>
          <p>Um convidado acabou de confirmar presença no seu evento:</p>
          <div style="background-color:#f1f5f9; padding:16px; border-radius:6px; margin: 16px 0;">
            <p style="margin:0 0 8px 0;"><strong>Nome:</strong> ${data.guestName}</p>
            <p style="margin:0 0 8px 0;"><strong>Acompanhantes:</strong> ${data.companionsCount || 0}</p>
            ${data.message ? `<p style="margin:0;"><strong>Recado:</strong> "${data.message}"</p>` : ""}
          </div>
          <div style="text-align:center; margin-top: 24px;">
            <a href="https://love.com.br/crm.html" style="background-color:#0f172a; color:#ffffff; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight:600; display:inline-block;">Ver Lista Completa</a>
          </div>
        `),
      };

    case "GIFT_RECEIVED":
      return {
        subject: `Você recebeu um presente de ${data.senderName}! 🎁`,
        text: `Você recebeu o presente "${data.giftName}" de ${data.senderName}.`,
        html: buildHtmlTemplate(`
          <h2 style="margin-top:0; color:#0f172a; font-size:18px;">Parabéns! Você ganhou um presente</h2>
          <p><strong>${data.senderName}</strong> acabou de presentear você:</p>
          <div style="background-color:#f1f5f9; padding:16px; border-radius:6px; margin: 16px 0;">
            <p style="margin:0 0 8px 0;"><strong>Presente:</strong> ${data.giftName}</p>
            <p style="margin:0 0 8px 0;"><strong>Valor:</strong> ${data.amount ? `R$ ${data.amount}` : "Item selecionado"}</p>
            ${data.message ? `<p style="margin:0; font-style:italic;">"${data.message}"</p>` : ""}
          </div>
          <div style="text-align:center; margin-top: 24px;">
            <a href="https://love.com.br/dashboard.html" style="background-color:#0f172a; color:#ffffff; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight:600; display:inline-block;">Acessar Meus Presentes</a>
          </div>
        `),
      };

    default:
      throw new Error(`Tipo de template inválido: ${type}`);
  }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  // Validação de segurança via Secret. Se a variável não estiver configurada,
  // nega por padrão em vez de deixar o endpoint aberto sem segredo nenhum.
  const expectedSecret = process.env.EMAIL_WEBHOOK_SECRET;
  const secretHeader = req.headers["x-webhook-secret"];
  if (!expectedSecret || secretHeader !== expectedSecret) {
    return res.status(401).json({ error: "Acesso não autorizado" });
  }

  const { type, to, data } = req.body;

  if (!type || !to || !data) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes: type, to, data" });
  }

  try {
    const template = getTemplate(type, data);

    const command = new SendEmailCommand({
      Source: process.env.EMAIL_FROM || "Love <contato@love.com.br>",
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: template.subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: template.html,
            Charset: "UTF-8",
          },
          Text: {
            Data: template.text,
            Charset: "UTF-8",
          },
        },
      },
      ReplyToAddresses: ["contato@love.com.br"],
    });

    const result = await sesClient.send(command);
    return res.status(200).json({ success: true, messageId: result.MessageId });
  } catch (error) {
    console.error("Erro no envio pelo SES:", error);
    return res.status(500).json({ error: error.message });
  }
};
