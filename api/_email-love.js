// Moldura dos e-mails da Love (mesma identidade da plataforma): fundo cinza
// claro, caixa branca com borda fina, logo no topo, título em Outfit leve,
// botão azul #183b54 e rodapé discreto. Arquivo com "_" na frente: a Vercel
// não publica como endpoint, só é importado pelas funções.
//
// O mesmo visual está em docs/emails/confirmar-cadastro.html (template
// "Confirm sign up" do Supabase, colado no painel).

const LOGO = "https://love.com.br/assets/love-assinatura-logo.png";

function escapar(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * @param {{ preview?: string, titulo: string, corpo: string, botao?: { texto: string, link: string }, nota?: string }} p
 *   corpo e nota são HTML já pronto (escape o que vier do usuário).
 */
function emailLove({ preview = "", titulo, corpo, botao, nota = "" }) {
  const fonte = "'Outfit', 'Helvetica Neue', Helvetica, Arial, sans-serif";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${escapar(titulo)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500&display=swap" rel="stylesheet">
</head>
<body style="margin:0; padding:0; background-color:#F7F8FA; font-family:${fonte}; -webkit-font-smoothing:antialiased;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapar(preview)}</div>
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#F7F8FA; padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:560px;">
        <tr><td align="center" style="padding:0 0 24px;">
          <img src="${LOGO}" width="118" alt="Love" style="display:block; width:118px; height:auto; border:0;">
        </td></tr>
        <tr><td style="background-color:#FFFFFF; border:1px solid #E4E4E7; border-radius:10px; padding:40px 36px;">
          <h1 style="margin:0 0 16px; font-family:${fonte}; font-size:28px; line-height:1.15; font-weight:300; letter-spacing:-0.025em; color:#16202F;">${escapar(titulo)}</h1>
          <div style="font-family:${fonte}; font-size:15px; line-height:1.65; color:#3F4A5A;">${corpo}</div>
          ${botao ? `<table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:28px 0 8px;"><tr><td style="border-radius:999px; background-color:#183B54;">
            <a href="${escapar(botao.link)}" style="display:inline-block; padding:14px 28px; font-family:${fonte}; font-size:15px; font-weight:500; color:#F5F8FC; text-decoration:none; border-radius:999px;">${escapar(botao.texto)} &rarr;</a>
          </td></tr></table>` : ""}
          ${nota ? `<p style="margin:24px 0 0; font-family:${fonte}; font-size:13px; line-height:1.6; color:#8A95A5;">${nota}</p>` : ""}
        </td></tr>
        <tr><td align="center" style="padding:24px 8px 0; font-family:${fonte}; font-size:12px; line-height:1.6; color:#A1A1AA;">
          Dúvidas? Responda a este e-mail ou escreva para <a href="mailto:contato@love.com.br" style="color:#5B6779;">contato@love.com.br</a>.<br>
          © ${new Date().getFullYear()} Love Hub Ltda. Todos os direitos reservados.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { emailLove, escapar };
