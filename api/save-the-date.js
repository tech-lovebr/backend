// Vercel Serverless Function — página pública do Save the Date.
// Endpoint: GET /api/save-the-date?slug=<slug do evento>
// (a rota love.com.br/<slug>/save-the-date aponta para cá — vercel.json)
//
// O anfitrião compartilha o Save the Date pelo WhatsApp com um link para
// esta página. O HTML já vem pronto do servidor com as tags og:* — é isso
// que faz o WhatsApp mostrar a imagem do Save the Date na conversa. Quem
// abre o link vê a imagem e o texto embaixo.
//
// Custo: não é um site a mais — é uma função pequena no mesmo projeto. A
// resposta fica em cache na borda da Vercel (5 min), então a função só roda
// de novo quando o cache expira; a imagem é um arquivo do Storage.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://krpgtixwmxwhtjchcufl.supabase.co';
// Chave pública (anon) — a mesma do navegador; a função save_the_date_publico é de leitura pública.
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtycGd0aXh3bXh3aHRqY2hjdWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNzI5ODgsImV4cCI6MjEwNTc0ODk4OH0.6ZwpEz-m-qWM_bPW8_Fucvv2EWkdMBkmH2BVgPdMfuQ';

function escapar(texto) {
  return String(texto == null ? '' : texto)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Texto no formato do WhatsApp: *negrito* vira <strong>, quebras de linha mantidas.
function textoEmHtml(texto) {
  return escapar(texto)
    .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
    .split('\n').map(l => l || '&nbsp;').join('<br>');
}

function semAsteriscos(texto) {
  return String(texto || '').replace(/\*([^*\n]+)\*/g, '$1');
}

function pagina({ slug, titulo, imagem, texto }) {
  const linhas = semAsteriscos(texto).split('\n').map(l => l.trim()).filter(Boolean);
  const ogTitulo = linhas[0] ? `${linhas[0]}${titulo ? ` — ${titulo}` : ''}` : `Save the Date — ${titulo || 'Love'}`;
  const ogDescricao = linhas.slice(1).join(' · ') || 'Reserve a data!';
  const url = `https://love.com.br/${slug}/save-the-date`;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapar(ogTitulo)}</title>
  <meta name="description" content="${escapar(ogDescricao)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapar(url)}">
  <meta property="og:title" content="${escapar(ogTitulo)}">
  <meta property="og:description" content="${escapar(ogDescricao)}">
  ${imagem ? `<meta property="og:image" content="${escapar(imagem)}">
  <meta property="og:image:secure_url" content="${escapar(imagem)}">
  <meta property="og:image:type" content="image/jpeg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${escapar(imagem)}">` : ''}
  <link rel="icon" type="image/png" href="/assets/love-logo-google-120.png?v=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #FAFCFF; color: #27272A; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    main { max-width: 480px; margin: 0 auto; padding: 24px 16px 40px; }
    .cartao { background: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 10px; overflow: hidden; }
    .cartao img { display: block; width: 100%; height: auto; }
    .texto { padding: 20px; font-size: 15px; line-height: 1.6; color: #27272A; }
    .texto strong { color: #18181B; }
    .vazio { padding: 40px 20px; text-align: center; color: #71717A; font-size: 15px; }
    footer { text-align: center; margin-top: 20px; font-size: 12px; color: #A1A1AA; }
    footer a { color: #71717A; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <main>
    <div class="cartao">
      ${imagem ? `<img src="${escapar(imagem)}" alt="${escapar(ogTitulo)}">` : ''}
      ${texto ? `<div class="texto">${textoEmHtml(texto)}</div>` : ''}
    </div>
    <footer>Feito com <a href="https://love.com.br" target="_blank" rel="noopener">Love</a></footer>
  </main>
</body>
</html>`;
}

function naoEncontrado() {
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Save the Date — Love</title>
<style>body{margin:0;background:#FAFCFF;font-family:Inter,-apple-system,'Segoe UI',sans-serif;color:#71717A;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:16px}</style>
</head><body><p>Este Save the Date não está disponível.<br><a href="https://love.com.br" style="color:#183B54;font-weight:600;text-decoration:none">Ir para a Love</a></p></body></html>`;
}

module.exports = async (req, res) => {
  const slug = String((req.query && req.query.slug) || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  let dados = null;
  if (slug) {
    try {
      const resposta = await fetch(`${SUPABASE_URL}/rest/v1/rpc/save_the_date_publico`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_slug: slug })
      });
      dados = resposta.ok ? await resposta.json() : null;
    } catch (e) {
      console.error('save-the-date:', e);
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!dados || (!dados.imagem && !dados.texto)) {
    res.statusCode = 404;
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    return res.end(naoEncontrado());
  }
  res.statusCode = 200;
  // Cache na borda por 5 min; serve o antigo enquanto atualiza.
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  res.end(pagina({ slug, titulo: dados.titulo, imagem: dados.imagem, texto: dados.texto }));
};
