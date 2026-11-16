// Roteamento por subdomínio do fornecedor: <slug>.love.com.br mostra o site
// publicado daquele fornecedor, sem precisar criar nenhum domínio/DNS novo
// por fornecedor — o domínio coringa (*.love.com.br) já está configurado no
// projeto, então qualquer subdomínio cai aqui primeiro.
//
// CommonJS (não import/export) de propósito: o pacote @vercel/functions é
// compatível com require() e isso evita precisar de "type":"module" no
// package.json, que quebraria os arquivos CommonJS que já existem em
// api/*.js.
const { rewrite, next } = require('@vercel/functions');

const config = { matcher: '/:path*' };

const SUFFIX = '.love.com.br';

// Hub em inglês para os Estados Unidos: quem abre a landing, o Entrar ou o
// Cadastro de hub.love.com.br de um IP dos EUA (cabeçalho x-vercel-ip-country)
// vai para hub.planwithlove.com, onde essas páginas aparecem em inglês.
// Robôs de busca/prévia de links não são redirecionados (o Google indexa o
// português daqui). ?lang=pt fica no português e guarda a escolha num cookie
// (hub-lang=pt) por 1 ano.
const HUB_BR = 'hub.love.com.br';
const HUB_EN = 'hub.planwithlove.com';
const PAGINAS_PUBLICAS = new Set(['/', '/index.html', '/login', '/login.html', '/signup', '/signup.html']);
const ROBO = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|slack|discord|preview|lighthouse/i;

function idiomaPorPais(request, url) {
  if (url.hostname !== HUB_BR) return null;
  if (request.method !== 'GET' || !PAGINAS_PUBLICAS.has(url.pathname)) return null;
  if (url.searchParams.get('lang') === 'pt') {
    return next({ headers: { 'set-cookie': 'hub-lang=pt; Path=/; Max-Age=31536000; SameSite=Lax; Secure' } });
  }
  if (/(?:^|;\s*)hub-lang=pt(?:;|$)/.test(request.headers.get('cookie') || '')) return null;
  if (ROBO.test(request.headers.get('user-agent') || '')) return null;
  if ((request.headers.get('x-vercel-ip-country') || '').toUpperCase() !== 'US') return null;
  const destino = new URL(url.pathname + url.search, 'https://' + HUB_EN);
  return new Response(null, { status: 307, headers: { location: destino.toString(), 'cache-control': 'private, no-store' } });
}

function middleware(request) {
  const url = new URL(request.url);

  const porPais = idiomaPorPais(request, url);
  if (porPais) return porPais;

  if (!url.hostname.endsWith(SUFFIX)) return next();

  const subdomain = url.hostname.slice(0, -SUFFIX.length);
  if (!subdomain || subdomain === 'hub' || subdomain === 'www') return next();

  // Só a navegação da página em si é reescrita — CSS/JS/imagens (mesma
  // origem, mesmo deploy) continuam resolvendo normalmente via next(),
  // senão o site do fornecedor carregaria sem nenhum estilo.
  if (url.pathname !== '/') return next();

  url.pathname = '/site-preview.html';
  url.searchParams.set('site', subdomain);
  return rewrite(url);
}

module.exports = middleware;
module.exports.config = config;
