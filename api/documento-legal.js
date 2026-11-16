// Vercel Serverless Function — Política de Privacidade e Termos de Uso em
// HTML pronto (renderizado no servidor).
// Endpoint: GET /api/documento-legal?slug=privacidade|termos
// (as rotas /privacidade e /termos apontam para cá — vercel.json)
//
// Antes essas páginas eram montadas pelo JavaScript da SPA: o HTML que
// chegava tinha o título e o texto vazios. Robôs que não rodam JavaScript —
// como a verificação de marca do Google (OAuth) — viam uma página sem
// conteúdo. Aqui o texto vem da tabela documentos_legais (o mesmo que o
// Admin edita), então a página continua sempre atualizada.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://krpgtixwmxwhtjchcufl.supabase.co';
// Chave pública (anon) — a mesma usada no navegador; documentos_legais é de leitura pública.
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtycGd0aXh3bXh3aHRqY2hjdWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNzI5ODgsImV4cCI6MjEwNTc0ODk4OH0.6ZwpEz-m-qWM_bPW8_Fucvv2EWkdMBkmH2BVgPdMfuQ';

const TITULOS = { privacidade: 'Política de Privacidade', termos: 'Termos de Uso' };
const CAMINHOS = { privacidade: '/privacidade', termos: '/termos' };

function escapar(texto) {
  return String(texto == null ? '' : texto)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// O conteúdo é HTML do editor do Admin: tira scripts, iframes e handlers.
function limparHtml(html) {
  return String(html || '')
    .replace(/<\s*(script|style|iframe|object|embed)[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
}

function dataPtBr(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
}

function pagina({ slug, titulo, conteudo, atualizadoEm }) {
  const outro = slug === 'termos' ? 'privacidade' : 'termos';
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapar(titulo)} — Love</title>
  <meta name="description" content="${escapar(titulo)} da Love — plataforma para organizar casamentos e eventos.">
  <link rel="canonical" href="https://love.com.br${CAMINHOS[slug]}">
  <link rel="icon" type="image/svg+xml" href="/assets/favicon-love.svg?v=2">
  <link rel="alternate icon" type="image/png" href="/assets/love-logo-google-120.png?v=2">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <meta name="theme-color" content="#F7F8FA">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    html { background: #F7F8FA; }
    body { margin: 0; background: #FFFFFF; color: #27272A; font-family: 'Outfit', 'Helvetica Neue', Arial, sans-serif; line-height: 1.7; }
    /* Topo igual ao do cadastro: cinza claro, seta de voltar à esquerda e o logo no centro. */
    header { position: sticky; top: 0; z-index: 20; padding-top: env(safe-area-inset-top, 0px); background: rgba(247,248,250,.82); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); box-shadow: 0 1px 0 #E3E8EF; }
    .barra { position: relative; height: 72px; display: flex; align-items: center; justify-content: center; }
    .barra .logo img { width: 118px; height: auto; display: block; }
    @media (max-width: 860px) { .barra .logo img { width: 102px; } }
    .barra a.voltar { position: absolute; left: max(24px, env(safe-area-inset-left, 0px)); top: 50%; transform: translateY(-50%); display: inline-flex; color: #5B6779; text-decoration: none; }
    .barra a.voltar:hover { color: #16202F; }
    .barra a.voltar svg { width: 20px; height: 20px; display: block; }
    @media (max-width: 768px) { .barra a.voltar { left: max(16px, env(safe-area-inset-left, 0px)); } }
    main { max-width: 820px; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; }
    h1 { font-size: 2rem; font-weight: 300; letter-spacing: -0.025em; color: #18181B; margin: 0 0 0.25rem; line-height: 1.2; }
    .data { font-size: 0.875rem; color: #A1A1AA; margin: 0 0 2.5rem; }
    .conteudo { font-size: 0.9375rem; }
    .conteudo h2, .conteudo h3 { color: #18181B; line-height: 1.3; margin: 2rem 0 0.75rem; }
    .conteudo a { color: #183B54; }
    .conteudo p { margin: 0 0 1rem; }
    footer { background: #F7F8FA; border-top: 1px solid #E3E8EF; }
    .rodape { max-width: 820px; margin: 0 auto; padding: 1.5rem; font-size: 0.8125rem; color: #71717A; display: flex; flex-wrap: wrap; gap: 0.5rem 1.25rem; justify-content: space-between; }
    .rodape a { color: #52525B; text-decoration: none; }
  </style>
</head>
<body>
  <header>
    <div class="barra">
      <a class="voltar" href="/" id="voltar" aria-label="Voltar" title="Voltar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg></a>
      <a class="logo" href="/" aria-label="Love — página inicial"><img src="/assets/love-logo-tinta.svg?v=1" alt="Love"></a>
    </div>
  </header>
  <main>
    <h1>${escapar(titulo)}</h1>
    ${atualizadoEm ? `<p class="data">Atualizado em ${escapar(atualizadoEm)}</p>` : ''}
    <article class="conteudo">${conteudo}</article>
  </main>
  <footer>
    <div class="rodape">
      <span>© ${new Date().getFullYear()} Love Hub Ltda. Todos os direitos reservados.</span>
      <span><a href="${CAMINHOS[outro]}">${escapar(TITULOS[outro])}</a> · <a href="mailto:contato@love.com.br">contato@love.com.br</a></span>
    </div>
  </footer>
  <script>
    // Voltar: retorna para onde a pessoa estava (login, cadastro, site); se abriu o link direto, vai para a página inicial.
    document.getElementById('voltar').addEventListener('click', function (e) {
      try {
        if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) { e.preventDefault(); history.back(); }
      } catch (err) {}
    });
  </script>
</body>
</html>`;
}

module.exports = async (req, res) => {
  const slug = String((req.query && req.query.slug) || '').toLowerCase();
  if (!TITULOS[slug]) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end('Documento não encontrado.');
  }

  let doc = null;
  try {
    const url = `${SUPABASE_URL}/rest/v1/documentos_legais?select=slug,titulo,conteudo,updated_at&slug=eq.${encodeURIComponent(slug)}&limit=1`;
    const resposta = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
    const linhas = resposta.ok ? await resposta.json() : [];
    doc = Array.isArray(linhas) ? linhas[0] : null;
  } catch (e) {
    console.error('documento-legal:', e);
  }

  const html = pagina({
    slug,
    titulo: (doc && doc.titulo) || TITULOS[slug],
    conteudo: doc && doc.conteudo ? limparHtml(doc.conteudo) : '<p>Este documento está temporariamente indisponível. Tente novamente em alguns minutos.</p>',
    atualizadoEm: doc ? dataPtBr(doc.updated_at) : ''
  });

  res.statusCode = doc ? 200 : 503;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Cache na borda por 5 min (o Admin edita raramente) e serve o antigo enquanto atualiza.
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  res.end(html);
};
