// Envio pelo Amazon SES com registro no livro-razão (tabela email_envios).
// Arquivo com "_" na frente: a Vercel não publica como endpoint, só é
// importado pelas funções (enviar-email, atendimento-responder,
// convidar-organizador, emails).
//
// Cada envio grava remetente, destinatário, assunto, template, categoria,
// um trecho do texto e a latência da chamada ao SES. Entregue, bounce,
// denúncia, abertura e clique chegam depois pela /api/ses-eventos.

const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const { SESv2Client, SendEmailCommand: SendEmailV2Command } = require("@aws-sdk/client-sesv2");
const { linkDescadastro, estaDescadastrado, comRodapeDeDescadastro } = require("./_descadastro");
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

// Marketing usa a API v2 do SES, que aceita os cabeçalhos List-Unsubscribe.
let clienteV2 = null;
function sesV2() {
  if (!clienteV2) {
    clienteV2 = new SESv2Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return clienteV2;
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
 *           de?: string, responderPara?: string|string[], template?: string, categoria?: string,
 *           marketing?: boolean }} e
 * marketing: um destinatário por envio; pula quem se descadastrou e leva o
 * link "Descadastrar" no rodapé e no cabeçalho List-Unsubscribe.
 */
async function enviarEmail(e) {
  const de = e.de || process.env.EMAIL_FROM || "Love <contato@love.com.br>";
  const destinatarios = (Array.isArray(e.para) ? e.para : [e.para]).filter(Boolean);
  let html = e.html;
  /** @type {string|null} */ let descadastro = null;
  if (e.marketing) {
    if (destinatarios.length !== 1) return { ok: false, erro: "E-mail de marketing vai para um destinatário por vez" };
    if (await estaDescadastrado(supabaseAdmin(), destinatarios[0])) return { ok: false, descadastrado: true, erro: "descadastrado" };
    descadastro = linkDescadastro(destinatarios[0]);
    html = comRodapeDeDescadastro(html, descadastro);
  }
  const texto = (e.texto || textoDoHtml(html)) + (descadastro ? `\n\nDescadastrar: ${descadastro}` : "");
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
    const r = descadastro ? await sesV2().send(new SendEmailV2Command({
      FromEmailAddress: de,
      Destination: { ToAddresses: destinatarios },
      ReplyToAddresses: e.responderPara ? [].concat(e.responderPara) : undefined,
      Content: {
        Simple: {
          Subject: { Data: e.assunto, Charset: "UTF-8" },
          Body: {
            Html: { Data: html, Charset: "UTF-8" },
            Text: { Data: texto, Charset: "UTF-8" },
          },
          Headers: [
            { Name: "List-Unsubscribe", Value: `<${descadastro}>` },
            { Name: "List-Unsubscribe-Post", Value: "List-Unsubscribe=One-Click" },
          ],
        },
      },
    })) : await ses().send(new SendEmailCommand({
      Source: de,
      Destination: { ToAddresses: destinatarios },
      ReplyToAddresses: e.responderPara ? [].concat(e.responderPara) : undefined,
      Message: {
        Subject: { Data: e.assunto, Charset: "UTF-8" },
        Body: {
          Html: { Data: html, Charset: "UTF-8" },
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
