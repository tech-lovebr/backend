// Caixa de e-mail do suporte (contato@love.com.br, Google Workspace) ligada
// ao Atendimento do Admin. O arquivo começa com "_" para a Vercel não
// publicar como rota.
//
//   • Enviar: a resposta sai pelo SMTP do próprio Gmail (smtp.gmail.com), como
//     contato@love.com.br — fica em "Enviados" e na mesma conversa do Gmail.
//   • Receber: lê a caixa de entrada por IMAP (imap.gmail.com). E-mail novo
//     vira conversa no Atendimento; resposta a uma conversa (protocolo LV… no
//     assunto, ou resposta a um e-mail nosso) entra nela — e uma conversa
//     resolvida volta a Pendente (trigger atualizar_conversa_do_ticket).
//     Só lê: não marca como lido, não move nem apaga nada no Gmail.
//
// Variáveis (Vercel, projeto love-platform):
//   SUPORTE_EMAIL        contato@love.com.br (padrão)
//   SUPORTE_EMAIL_SENHA  senha de app do Google da conta contato@ (16 letras)

const SMTP = { host: "smtp.gmail.com", port: 465, secure: true };
const IMAP = { host: "imap.gmail.com", port: 993, secure: true };
const DIAS_PARA_TRAS = 3;   // janela lida a cada busca (deduplicado pelo Message-ID)
const MAX_POR_BUSCA = 40;

const usuario = () => process.env.SUPORTE_EMAIL || "contato@love.com.br";
const senha = () => String(process.env.SUPORTE_EMAIL_SENHA || "").replace(/\s+/g, "");
const configurado = () => !!senha();

/* ---------------------------------------------------------------- Enviar */

async function enviarPeloGmail({ para, assunto, html, texto, responderA, referencias }) {
  const nodemailer = require("nodemailer");
  const transporte = nodemailer.createTransport({ ...SMTP, auth: { user: usuario(), pass: senha() } });
  const info = await transporte.sendMail({
    from: `Love <${usuario()}>`,
    to: para,
    subject: assunto,
    html,
    text: texto,
    ...(responderA ? { inReplyTo: responderA } : {}),
    ...(referencias && referencias.length ? { references: referencias } : {}),
  });
  return { ok: true, messageId: info.messageId };
}

/* --------------------------------------------------------------- Receber */

const AUTOMATICO = /^(mailer-daemon|postmaster|no-?reply|nao-?responda|notifications?|bounce)/i;

/** Tira a parte citada ("Em ... escreveu:") e a assinatura comum. */
function soATextoNovo(texto) {
  const linhas = String(texto || "").replace(/\r/g, "").split("\n");
  const fim = linhas.findIndex(l =>
    /^\s*>/.test(l) ||
    /^\s*(Em|On)\s.+(escreveu|wrote):\s*$/i.test(l) ||
    /^-{2,}\s*(Mensagem original|Original Message)/i.test(l) ||
    /^\s*(De|From):\s.+@/i.test(l));
  return (fim > 0 ? linhas.slice(0, fim) : linhas).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Conta na Love com esse e-mail: anfitrião ou fornecedor. */
async function quemE(db, email) {
  const { data: c } = await db.from("clientes").select("id").ilike("email", email).limit(1).maybeSingle();
  if (c) return { origem: "cliente", user_id: c.id };
  const { data: f } = await db.from("fornecedores").select("id").ilike("email", email).limit(1).maybeSingle();
  if (f) return { origem: "fornecedor", user_id: f.id };
  return { origem: "site", user_id: null };
}

async function jaEntrou(db, messageId) {
  const { data: m } = await db.from("ticket_messages").select("id").eq("email_message_id", messageId).limit(1).maybeSingle();
  if (m) return true;
  const { data: t } = await db.from("tickets").select("id").eq("email_message_id", messageId).limit(1).maybeSingle();
  return !!t;
}

/** Conversa a que este e-mail responde (protocolo no assunto ou resposta a um e-mail nosso). */
async function conversaDoEmail(db, assunto, ids) {
  const protocolo = String(assunto || "").match(/\bLV\d{6}\b/i);
  if (protocolo) {
    const { data } = await db.from("tickets").select("id").eq("protocolo", protocolo[0].toUpperCase()).maybeSingle();
    if (data) return data.id;
  }
  for (const id of ids) {
    const { data: m } = await db.from("ticket_messages").select("ticket_id").eq("email_message_id", id).limit(1).maybeSingle();
    if (m) return m.ticket_id;
    const { data: t } = await db.from("tickets").select("id").eq("email_message_id", id).limit(1).maybeSingle();
    if (t) return t.id;
  }
  return null;
}

/**
 * Lê os e-mails recentes da caixa de entrada e grava os novos no Atendimento.
 * Devolve { novos, respostas } (quantos viraram conversa / entraram numa).
 */
async function buscarEmailsNovos(db) {
  if (!configurado()) return { configurado: false, novos: 0, respostas: 0 };
  const { ImapFlow } = require("imapflow");
  const { simpleParser } = require("mailparser");
  const cliente = new ImapFlow({ ...IMAP, auth: { user: usuario(), pass: senha() }, logger: false });
  let novos = 0, respostas = 0;

  await cliente.connect();
  const trava = await cliente.getMailboxLock("INBOX", { readOnly: true });
  try {
    const desde = new Date(Date.now() - DIAS_PARA_TRAS * 864e5);
    const uids = (await cliente.search({ since: desde }, { uid: true })) || [];
    for (const uid of uids.slice(-MAX_POR_BUSCA)) {
      const msg = await cliente.fetchOne(uid, { source: true }, { uid: true });
      if (!msg || !msg.source) continue;
      const e = await simpleParser(msg.source);
      const de = e.from && e.from.value && e.from.value[0];
      const email = de && String(de.address || "").toLowerCase();
      const messageId = e.messageId;
      if (!email || !messageId) continue;
      if (email === usuario().toLowerCase() || AUTOMATICO.test(email.split("@")[0])) continue;
      if (await jaEntrou(db, messageId)) continue;

      const texto = soATextoNovo(e.text || "") || "(e-mail sem texto)";
      const referencias = [e.inReplyTo, ...(Array.isArray(e.references) ? e.references : e.references ? [e.references] : [])].filter(Boolean);
      const conversa = await conversaDoEmail(db, e.subject, referencias);

      if (conversa) {
        const { error } = await db.from("ticket_messages").insert({
          ticket_id: conversa, author_role: "usuario", author_name: de.name || email,
          body: texto, canal: "email", email_message_id: messageId,
          created_at: (e.date || new Date()).toISOString(),
        });
        if (!error) respostas++;
      } else {
        const conta = await quemE(db, email);
        const { error } = await db.from("tickets").insert({
          ...conta, canal: "email", status: "aberto", nao_lido: true,
          nome: de.name || email.split("@")[0], email,
          assunto: (e.subject || "(sem assunto)").slice(0, 300),
          mensagem: texto, email_message_id: messageId,
          created_at: (e.date || new Date()).toISOString(),
          last_message_at: (e.date || new Date()).toISOString(),
        });
        if (!error) novos++;
        else console.error("e-mail → ticket:", error.message);
      }
    }
  } finally {
    trava.release();
    await cliente.logout().catch(() => {});
  }
  return { configurado: true, novos, respostas };
}

module.exports = { configurado, enviarPeloGmail, buscarEmailsNovos, usuario };
