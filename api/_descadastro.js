// Descadastro dos e-mails de marketing (Marketing e Novidades).
// Arquivo com "_" na frente: a Vercel não publica como endpoint.
//
// Cada e-mail de marketing leva um link assinado para /api/descadastrar
// (rodapé e cabeçalho List-Unsubscribe, que o Gmail mostra como
// "Cancelar inscrição"). Quem se descadastra entra em email_descadastros
// (migration 109) e não recebe mais marketing; os e-mails do sistema
// (presentes, confirmações, senha) continuam.

const crypto = require("crypto");

const SITE = () => process.env.SITE_URL || "https://love.com.br";
const segredo = () => process.env.DESCADASTRO_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
const normal = (email) => String(email || "").trim().toLowerCase();

/** Assinatura do e-mail (ninguém descadastra outra pessoa só trocando o endereço). */
function assinatura(email) {
  return crypto.createHmac("sha256", segredo()).update(`descadastro:${normal(email)}`).digest("base64url").slice(0, 32);
}

function assinaturaConfere(email, t) {
  const a = Buffer.from(assinatura(email));
  const b = Buffer.from(String(t || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function linkDescadastro(email) {
  const e = Buffer.from(normal(email)).toString("base64url");
  return `${SITE()}/api/descadastrar?e=${encodeURIComponent(e)}&t=${assinatura(email)}`;
}

/** E-mail do link (?e=) de volta ao endereço. */
function emailDoLink(e) {
  try { return normal(Buffer.from(String(e || ""), "base64url").toString("utf8")); } catch (_) { return ""; }
}

async function estaDescadastrado(db, email) {
  if (!db) return false;
  const { data, error } = await db.from("email_descadastros").select("email").eq("email", normal(email)).maybeSingle();
  if (error) return false; // sem a migration 109 ainda: segue enviando
  return Boolean(data);
}

/** Linha "Não quero mais receber" no fim do e-mail. */
function comRodapeDeDescadastro(html, link) {
  const linha = `
  <table width="100%" border="0" cellspacing="0" cellpadding="0"><tr>
    <td align="center" style="padding:4px 24px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;line-height:1.5;color:#94a3b8;">
      Não quer mais receber ofertas e novidades da Love? <a href="${link}" style="color:#64748b;text-decoration:underline;">Descadastrar</a>
    </td>
  </tr></table>`;
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${linha}</body>`) : html + linha;
}

module.exports = { normal, assinaturaConfere, linkDescadastro, emailDoLink, estaDescadastrado, comRodapeDeDescadastro };
