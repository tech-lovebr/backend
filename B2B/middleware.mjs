// Roteamento por subdomínio do fornecedor: <slug>.love.com.br mostra o site
// publicado daquele fornecedor, sem precisar criar nenhum domínio/DNS novo
// por fornecedor — o domínio coringa (*.love.com.br) já está configurado no
// projeto, então qualquer subdomínio cai aqui primeiro.
//
// Extensão .mjs (não .js) para poder usar import/export sem precisar
// adicionar "type": "module" no package.json — isso quebraria os arquivos
// CommonJS que já existem em api/*.js.
import { rewrite, next } from '@vercel/functions';

export const config = { matcher: '/:path*' };

const SUFFIX = '.love.com.br';

export default function middleware(request) {
  const url = new URL(request.url);

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
