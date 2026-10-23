// Vercel Serverless Function — eventos do Amazon SES chegando pelo SNS.
// Endpoint: POST /api/ses-eventos   (chamado pela AWS, não pelo navegador)
//
// O Admin liga isto pelo botão "Conectar Amazon SES" (POST /api/emails,
// acao "conectar"): conjunto de configuração "love-eventos" no SES → tópico
// SNS "love-ses-eventos" → esta URL.
//
// O que faz:
//   - confere a assinatura da mensagem (certificado da própria AWS);
//   - SubscriptionConfirmation: confirma a inscrição sozinho;
//   - Notification: atualiza a linha do e-mail em email_envios (entregue,
//     bounce, denúncia, abertura, clique...). E-mail que não passou pelas
//     nossas funções (login do Supabase via SMTP) ganha linha no evento Send.
//
// Variáveis: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const crypto = require("crypto");
const { supabaseAdmin } = require("./_ses");

const CERTIFICADOS = new Map();

async function corpoBruto(req) {
  if (typeof req.body === "string") return req.body;
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return JSON.stringify(req.body);
  const partes = [];
  for await (const p of req) partes.push(p);
  return Buffer.concat(partes).toString("utf8");
}

/** Assinatura SNS (versões 1 = SHA1 e 2 = SHA256). */
async function assinaturaValida(m) {
  const url = new URL(m.SigningCertURL || "");
  if (url.protocol !== "https:" || !/^sns\.[a-z0-9-]+\.amazonaws\.com$/.test(url.hostname)) return false;

  let pem = CERTIFICADOS.get(url.href);
  if (!pem) {
    pem = await (await fetch(url.href)).text();
    CERTIFICADOS.set(url.href, pem);
  }

  const campos = m.Type === "Notification"
    ? ["Message", "MessageId", "Subject", "Timestamp", "TopicArn", "Type"]
    : ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"];
  const texto = campos
    .filter(c => m[c] !== undefined && m[c] !== null)
    .map(c => `${c}\n${m[c]}\n`)
    .join("");

  const algoritmo = m.SignatureVersion === "2" ? "RSA-SHA256" : "RSA-SHA1";
  return crypto.createVerify(algoritmo).update(texto, "utf8").verify(pem, m.Signature, "base64");
}

// Ordem de força: um status mais forte não volta para um mais fraco.
const FORCA = { enviado: 1, atrasado: 2, entregue: 3, rejeitado: 4, falhou: 4, bounce: 5, denuncia: 6 };

function categoriaPorAssunto(assunto) {
  const a = String(assunto || "").toLowerCase();
  if (/senha|password|redefin|recupera/.test(a)) return "Segurança e senha";
  if (/confirm|verifi|código|codigo|acesso|login|magic/.test(a)) return "Autenticação";
  return "Sistema";
}

async function aplicarEvento(db, ev) {
  const tipo = String(ev.eventType || ev.notificationType || "").toLowerCase();
  const mail = ev.mail || {};
  const messageId = mail.messageId;
  if (!messageId) return;

  const { data: atual } = await db.from("email_envios").select("*").eq("message_id", messageId).maybeSingle();
  const linha = atual || {
    message_id: messageId,
    remetente: mail.source || (mail.commonHeaders && mail.commonHeaders.from && mail.commonHeaders.from[0]) || null,
    destinatario: (mail.destination || []).join(", ") || "—",
    assunto: mail.commonHeaders && mail.commonHeaders.subject || null,
    template: mail.commonHeaders && mail.commonHeaders.subject || null,
    categoria: categoriaPorAssunto(mail.commonHeaders && mail.commonHeaders.subject),
    status: "enviado",
    provedor: "Amazon SES",
    eventos: [],
    created_at: mail.timestamp || new Date().toISOString(),
  };

  const mudar = { eventos: [...(linha.eventos || []), { tipo, em: new Date().toISOString() }].slice(-30) };
  const subir = (status, extra = {}) => {
    if ((FORCA[status] || 0) >= (FORCA[linha.status] || 0)) mudar.status = status;
    Object.assign(mudar, extra);
  };

  if (tipo === "send") subir("enviado");
  if (tipo === "delivery") {
    subir("entregue", { entregue_em: ev.delivery && ev.delivery.timestamp || new Date().toISOString() });
    // Tempo que o SES levou do recebimento até o servidor do destinatário aceitar.
    if (ev.delivery && ev.delivery.processingTimeMillis != null && !linha.latencia_ms) {
      mudar.latencia_ms = ev.delivery.processingTimeMillis;
    }
  }
  if (tipo === "deliverydelay") subir("atrasado");
  if (tipo === "bounce") {
    const b = ev.bounce || {};
    subir("bounce", { erro: [b.bounceType, b.bounceSubType, b.bouncedRecipients && b.bouncedRecipients[0] && b.bouncedRecipients[0].diagnosticCode].filter(Boolean).join(" · ") || "Bounce" });
  }
  if (tipo === "complaint") subir("denuncia", { erro: "O destinatário marcou como spam" });
  if (tipo === "reject") subir("rejeitado", { erro: ev.reject && ev.reject.reason || "Rejeitado pelo SES" });
  if (tipo === "renderingfailure") subir("falhou", { erro: ev.failure && ev.failure.errorMessage || "Falha ao montar o e-mail" });
  if (tipo === "open" && !linha.aberto_em) mudar.aberto_em = ev.open && ev.open.timestamp || new Date().toISOString();
  if (tipo === "click" && !linha.clicado_em) mudar.clicado_em = ev.click && ev.click.timestamp || new Date().toISOString();

  if (atual) {
    await db.from("email_envios").update(mudar).eq("id", atual.id);
  } else {
    const { eventos, ...resto } = linha;
    await db.from("email_envios").upsert({ ...resto, ...mudar }, { onConflict: "message_id" });
  }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  let m;
  try {
    m = JSON.parse(await corpoBruto(req));
  } catch {
    return res.status(400).json({ error: "Corpo inválido" });
  }

  try {
    if (!(await assinaturaValida(m))) return res.status(403).json({ error: "Assinatura inválida" });
  } catch (e) {
    return res.status(403).json({ error: "Assinatura inválida" });
  }

  if (m.Type === "SubscriptionConfirmation") {
    const url = new URL(m.SubscribeURL);
    if (!/^sns\.[a-z0-9-]+\.amazonaws\.com$/.test(url.hostname)) return res.status(400).json({ error: "URL inesperada" });
    await fetch(url.href);
    return res.status(200).json({ ok: true, confirmado: true });
  }

  if (m.Type !== "Notification") return res.status(200).json({ ok: true });

  const db = supabaseAdmin();
  if (!db) return res.status(500).json({ error: "Supabase não configurado" });

  try {
    const evento = JSON.parse(m.Message);
    await aplicarEvento(db, evento);
  } catch (e) {
    console.error("ses-eventos:", e);
  }
  return res.status(200).json({ ok: true });
};

