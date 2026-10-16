// Vercel Serverless Function — responde um chamado do Atendimento do Admin.
// Endpoint: POST /api/atendimento-responder   (chamado de admin.love.com.br)
// Header:   Authorization: Bearer <access_token do admin logado>
// Body:     { ticket_id, body_html, assunto?, resposta_pronta_id?, status? }
//
// O que faz, nesta ordem:
//   1. confere que quem chama é um admin ativo (tabela admins);
//   2. grava a resposta em ticket_messages (é ela que aparece no inbox);
//   3. envia por e-mail ao solicitante, com o protocolo no assunto;
//   4. avisa na plataforma (notificação individual) quando o chamado é de
//      alguém com conta — anfitrião ou empresa;
//   5. muda o status (padrão: aguardando_cliente) e conta o uso da resposta
//      pronta escolhida.
//
// Etapa 2 troca o envio do passo 3 pelo SMTP da caixa do Gmail, para a
// resposta ficar na mesma conversa da caixa de suporte. Por ora sai pelo SES,
// com Responder-para na caixa de suporte.
//
// Variáveis de ambiente:
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, EMAIL_FROM
//   SUPORTE_EMAIL (opcional; padrão contato@love.com.br) — Responder-para

const { createClient } = require("@supabase/supabase-js");

const ORIGENS_PERMITIDAS = ["https://admin.love.com.br", "http://localhost:8090", "http://127.0.0.1:8090"];
const STATUS_VALIDOS = ["aberto", "em_andamento", "aguardando_cliente", "resolvido", "fechado", "spam"];

function cors(req, res) {
  const origem = req.headers.origin || "";
  if (ORIGENS_PERMITIDAS.includes(origem)) {
    res.setHeader("Access-Control-Allow-Origin", origem);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
}

function escapar(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Texto puro do HTML, para a versão sem formatação do e-mail e para a notificação.
function textoDoHtml(html) {
  return String(html || "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Só o que o editor do Admin produz: sem script, estilo nem eventos.
function limparHtml(html) {
  return String(html || "")
    .replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

function layoutDoEmail({ corpoHtml, protocolo, suporte }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc; padding:24px 0;">
    <tr><td align="center">
      <table width="560" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff; border-radius:8px; border:1px solid #e2e8f0; overflow:hidden;">
        <tr><td style="padding:24px; text-align:center; border-bottom:1px solid #f1f5f9;">
          <span style="font-size:22px; font-weight:700; color:#0f172a; letter-spacing:-0.5px;">Love</span>
        </td></tr>
        <tr><td style="padding:28px 24px; color:#334155; font-size:15px; line-height:1.6;">
          ${corpoHtml}
        </td></tr>
        <tr><td style="padding:16px 24px; background-color:#f8fafc; text-align:center; font-size:12px; color:#94a3b8; border-top:1px solid #f1f5f9;">
          Protocolo ${escapar(protocolo)} · Para continuar a conversa, é só responder este e-mail.<br>
          ${escapar(suporte)} · © ${new Date().getFullYear()} Love
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = async (req, res) => {
  try {
    return await responder(req, res);
  } catch (e) {
    console.error("Atendimento: erro inesperado", e);
    return res.status(500).json({ ok: false, erro: "erro_inesperado", detalhe: String((e && e.message) || e) });
  }
};

async function responder(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, erro: "metodo_nao_permitido" });

  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ ok: false, erro: "sem_sessao" });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !chave) return res.status(500).json({ ok: false, erro: "servidor_nao_configurado" });

  const supabase = createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Quem chama precisa ser admin ativo.
  const { data: quem, error: erroSessao } = await supabase.auth.getUser(token);
  if (erroSessao || !quem || !quem.user) return res.status(401).json({ ok: false, erro: "sessao_invalida" });

  const { data: admin } = await supabase
    .from("admins").select("id, name, active").eq("id", quem.user.id).maybeSingle();
  if (!admin || admin.active === false) return res.status(403).json({ ok: false, erro: "sem_permissao" });

  const { ticket_id, body_html, assunto, resposta_pronta_id, status } = req.body || {};
  if (!ticket_id || !/^[0-9a-f-]{36}$/i.test(String(ticket_id))) return res.status(400).json({ ok: false, erro: "ticket_invalido" });

  const html = limparHtml(body_html);
  const texto = textoDoHtml(html);
  if (!texto) return res.status(400).json({ ok: false, erro: "resposta_vazia" });

  const novoStatus = STATUS_VALIDOS.includes(status) ? status : "aguardando_cliente";

  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, protocolo, assunto, nome, email, user_id, origem, canal")
    .eq("id", ticket_id)
    .maybeSingle();
  if (!ticket) return res.status(404).json({ ok: false, erro: "ticket_nao_encontrado" });

  // 2. Grava a resposta.
  const { data: msg, error: erroMsg } = await supabase
    .from("ticket_messages")
    .insert({
      ticket_id: ticket.id,
      author_role: "admin",
      author_id: admin.id,
      author_name: admin.name || "Equipe Love",
      body: texto,
      body_html: html,
      canal: ticket.canal === "chat" ? "chat" : "email",
      resposta_pronta_id: resposta_pronta_id || null,
    })
    .select("id")
    .single();
  if (erroMsg) return res.status(500).json({ ok: false, erro: "falha_ao_gravar", detalhe: erroMsg.message });

  // 3. E-mail ao solicitante.
  const suporte = process.env.SUPORTE_EMAIL || "contato@love.com.br";
  const assuntoEmail = `${assunto && String(assunto).trim() ? String(assunto).trim() : `Re: ${ticket.assunto || "Seu chamado"}`} [${ticket.protocolo}]`;
  let email = { enviado: false, motivo: null };

  if (!ticket.email) {
    email.motivo = "sem_email";
  } else if (!process.env.AWS_ACCESS_KEY_ID || !process.env.EMAIL_FROM) {
    email.motivo = "email_nao_configurado";
  } else {
    try {
      const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
      const ses = new SESClient({
        region: process.env.AWS_REGION || "us-east-1",
        credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY },
      });
      const r = await ses.send(new SendEmailCommand({
        Source: process.env.EMAIL_FROM,
        Destination: { ToAddresses: [ticket.email] },
        ReplyToAddresses: [suporte],
        Message: {
          Subject: { Data: assuntoEmail, Charset: "UTF-8" },
          Body: {
            Text: { Data: `${texto}\n\nProtocolo ${ticket.protocolo}`, Charset: "UTF-8" },
            Html: { Data: layoutDoEmail({ corpoHtml: html, protocolo: ticket.protocolo, suporte }), Charset: "UTF-8" },
          },
        },
      }));
      email = { enviado: true, motivo: null, id: r && r.MessageId };
    } catch (e) {
      console.error("Atendimento: falha ao enviar e-mail", e);
      email = { enviado: false, motivo: "falha_envio", detalhe: String(e && e.message || e) };
    }
  }

  await supabase.from("ticket_messages").update({
    enviado_por_email: email.enviado,
    email_status: email.enviado ? "enviado" : email.motivo,
    email_erro: email.detalhe || null,
    email_message_id: email.id || null,
  }).eq("id", msg.id);

  // 4. Aviso na plataforma para quem tem conta.
  let notificado = false;
  if (ticket.user_id) {
    const resumo = texto.length > 380 ? `${texto.slice(0, 377)}…` : texto;
    const { error: erroNotif } = await supabase.from("notificacoes").insert({
      titulo: `Resposta ao seu chamado ${ticket.protocolo}`,
      mensagem: resumo,
      destino: "individual",
      destinatario_id: ticket.user_id,
      autor_id: admin.id,
      autor_nome: "Atendimento Love",
    });
    notificado = !erroNotif;
  }

  // 5. Status da conversa e uso da resposta pronta.
  await supabase.from("tickets")
    .update({ status: novoStatus, nao_lido: false, updated_at: new Date().toISOString() })
    .eq("id", ticket.id);

  if (resposta_pronta_id) {
    const { data: rp } = await supabase.from("respostas_prontas").select("usos").eq("id", resposta_pronta_id).maybeSingle();
    if (rp) await supabase.from("respostas_prontas").update({ usos: (rp.usos || 0) + 1 }).eq("id", resposta_pronta_id);
  }

  return res.status(200).json({ ok: true, mensagem_id: msg.id, status: novoStatus, email, notificado });
}
