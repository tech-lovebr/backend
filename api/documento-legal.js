// Vercel Serverless Function — Política de Privacidade e Termos de Uso em
// HTML pronto (renderizado no servidor).
// Endpoint: GET /api/documento-legal?slug=privacidade|termos
// (as rotas /politica-de-privacidade e /termos apontam para cá — vercel.json)
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
const CAMINHOS = { privacidade: '/politica-de-privacidade', termos: '/termos' };

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
  <link rel="icon" type="image/png" href="/assets/love-logo-google-120.png?v=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #FFFFFF; color: #27272A; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.7; }
    header { border-bottom: 1px solid #EEEEF0; }
    .barra { max-width: 820px; margin: 0 auto; padding: 1rem 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .barra img { height: 30px; width: auto; display: block; }
    .barra a.voltar { font-size: 0.875rem; font-weight: 600; color: #183B54; text-decoration: none; }
    main { max-width: 820px; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; }
    h1 { font-size: 2rem; font-weight: 800; letter-spacing: -0.02em; color: #18181B; margin: 0 0 0.25rem; line-height: 1.2; }
    .data { font-size: 0.875rem; color: #A1A1AA; margin: 0 0 2.5rem; }
    .conteudo { font-size: 0.9375rem; }
    .conteudo h2, .conteudo h3 { color: #18181B; line-height: 1.3; margin: 2rem 0 0.75rem; }
    .conteudo a { color: #183B54; }
    .conteudo p { margin: 0 0 1rem; }
    footer { border-top: 1px solid #EEEEF0; }
    .rodape { max-width: 820px; margin: 0 auto; padding: 1.5rem; font-size: 0.8125rem; color: #71717A; display: flex; flex-wrap: wrap; gap: 0.5rem 1.25rem; justify-content: space-between; }
    .rodape a { color: #52525B; text-decoration: none; }
  </style>
</head>
<body>
  <header>
    <div class="barra">
      <a href="/" aria-label="Love — página inicial"><img src="/assets/logo.png?v=2" alt="Love"></a>
      <a class="voltar" href="/">Voltar para a Love</a>
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
