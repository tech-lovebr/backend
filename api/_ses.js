// Envio pelo Amazon SES com registro no livro-razão (tabela email_envios).
// Arquivo com "_" na frente: a Vercel não publica como endpoint, só é
// importado pelas funções (enviar-email, atendimento-responder,
// convidar-organizador, emails).
//
// Cada envio grava remetente, destinatário, assunto, template, categoria,
// um trecho do texto e a latência da chamada ao SES. Entregue, bounce,
// denúncia, abertura e clique chegam depois pela /api/ses-eventos.

const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const { createClient } = require("@supabase/supabase-js");

let cliente = null;
function ses() {
  if (!cliente) {
    cliente = new SESClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return cliente;
}

function supabaseAdmin() {
  if (!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://krpgtixwmxwhtjchcufl.supabase.co';
  return createClient(url, (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY), {
    auth: { persistSession: false },
  });
}

function textoDoHtml(html) {
  return String(html || "")
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

/** "Love <contato@love.com.br>" → "contato@love.com.br". */
function enderecoDe(remetente) {
  const m = String(remetente || "").match(/<([^>]+)>/);
  return (m ? m[1] : String(remetente || "")).trim().toLowerCase();
}

async function registrar(linha) {
  const db = supabaseAdmin();
  if (!db) return;
  try {
    if (linha.message_id) {
      // O evento "Send" do SES pode chegar antes deste registro: completa a
      // linha que ele criou em vez de duplicar.
      await db.from("email_envios").upsert(linha, { onConflict: "message_id" });
    } else {
      await db.from("email_envios").insert(linha);
    }
  } catch (e) {
    console.error("email_envios: falha ao registrar", e);
  }
}

/**
 * Envia e registra. Devolve { ok, messageId, erro }.
 * @param {{ para: string|string[], assunto: string, html: string, texto?: string,
 *           de?: string, responderPara?: string|string[], template?: string, categoria?: string }} e
 */
async function enviarEmail(e) {
  const de = e.de || process.env.EMAIL_FROM || "Love <contato@love.com.br>";
  const destinatarios = (Array.isArray(e.para) ? e.para : [e.para]).filter(Boolean);
  const texto = e.texto || textoDoHtml(e.html);
  const base = {
    remetente: de,
    destinatario: destinatarios.join(", "),
    assunto: e.assunto,
    template: e.template || e.assunto,
    categoria: e.categoria || "Sistema",
    trecho: texto.slice(0, 280),
    provedor: "Amazon SES",
  };

  const inicio = Date.now();
  try {
    const r = await ses().send(new SendEmailCommand({
      Source: de,
      Destination: { ToAddresses: destinatarios },
      ReplyToAddresses: e.responderPara ? [].concat(e.responderPara) : undefined,
      Message: {
        Subject: { Data: e.assunto, Charset: "UTF-8" },
        Body: {
          Html: { Data: e.html, Charset: "UTF-8" },
          Text: { Data: texto, Charset: "UTF-8" },
        },
      },
    }));
    const latencia = Date.now() - inicio;
    await registrar({ ...base, message_id: r.MessageId, status: "enviado", latencia_ms: latencia });
    return { ok: true, messageId: r.MessageId, latencia };
  } catch (erro) {
    const latencia = Date.now() - inicio;
    await registrar({ ...base, status: "falhou", erro: String(erro && erro.message || erro), latencia_ms: latencia });
    return { ok: false, erro: String(erro && erro.message || erro) };
  }
}

module.exports = { enviarEmail, textoDoHtml, enderecoDe, supabaseAdmin };
