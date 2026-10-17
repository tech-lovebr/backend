#!/usr/bin/env node
// Verificação de tipos (TypeScript) do JavaScript das três plataformas —
// love.com.br (raiz), Hub B2B (B2B/) e Admin (Admin/) — sem converter nada e
// sem mudar o site: o navegador continua recebendo os mesmos .js.
//
// Cada página HTML carrega os scripts dela num escopo global único; aqui cada
// página vira um "programa" com exatamente esses scripts (na ordem do HTML),
// para o TypeScript enxergar as mesmas variáveis globais que o navegador.
// Avisos repetidos entre páginas (arquivos compartilhados) aparecem uma vez.
//
// Uso:
//   npm run checar              → as três plataformas
//   npm run checar -- raiz      → só love.com.br   (também: b2b, admin)
//   npm run checar -- --resumo  → só a contagem por plataforma
//   npm run checar -- --graves  → só os erros que quebram a página
//
// "Graves" são os que derrubam o script inteiro no navegador: erro de sintaxe
// e nome/função que não existe (ex.: um `$1` esquecido numa troca de texto,
// que já sumiu com o botão Cadastrar do Admin). Eles aparecem primeiro e
// fazem o comando terminar com erro (código 1). Os demais avisos são de tipo
// e normalmente não quebram nada.

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const RAIZ = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const soResumo = args.includes('--resumo');
const soGraves = args.includes('--graves');

// Sintaxe (TS1xxx), nome inexistente (2304, 2552 "você quis dizer…"),
// propriedade abreviada sem variável (18004) e uso antes de declarar (2448).
const ehGrave = codigo => (codigo >= 1000 && codigo < 2000) || [2304, 2552, 18004, 2448].includes(codigo);
const filtro = args.filter(a => !a.startsWith('--')).map(a => a.toLowerCase());

const PLATAFORMAS = [
  { nome: 'raiz', rotulo: 'love.com.br', pasta: '.', paginas: ['index.html', 'cadastro.html', 'convite-preview.html', 'organizador.html', 'resetar-senha.html', 'auth-popup.html'] },
  { nome: 'b2b', rotulo: 'Hub B2B', pasta: 'B2B', paginas: null },
  { nome: 'admin', rotulo: 'Admin', pasta: 'Admin', paginas: null }
].filter(p => !filtro.length || filtro.includes(p.nome));

const OPCOES = {
  allowJs: true,
  checkJs: true,
  noEmit: true,
  target: ts.ScriptTarget.ES2022,
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
  strict: false,
  skipLibCheck: true,
  types: []
};
const TIPOS = path.join(RAIZ, 'types', 'globais.d.ts');

// Scripts locais (.js) de uma página, na ordem em que o HTML carrega.
function scriptsDaPagina(arquivoHtml) {
  const html = fs.readFileSync(arquivoHtml, 'utf8');
  const pasta = path.dirname(arquivoHtml);
  const base = /<base\s+href="\/"/i.test(html) ? RAIZ : pasta;
  const lista = [];
  const re = /<script[^>]*\ssrc="([^"]+)"/gi;
  let m;
  while ((m = re.exec(html))) {
    const src = m[1].split('?')[0];
    if (/^(https?:)?\/\//i.test(src) || !src.endsWith('.js')) continue;
    const abs = path.resolve(src.startsWith('/') ? RAIZ : base, src.replace(/^\//, ''));
    if (fs.existsSync(abs) && !lista.includes(abs)) lista.push(abs);
  }
  return lista;
}

const host = ts.createCompilerHost(OPCOES);
const cacheArquivos = new Map();
const getSourceFileOriginal = host.getSourceFile.bind(host);
host.getSourceFile = (nome, versao, ...resto) => {
  if (!cacheArquivos.has(nome)) cacheArquivos.set(nome, getSourceFileOriginal(nome, versao, ...resto));
  return cacheArquivos.get(nome);
};

let totalGeral = 0;
let gravesGeral = 0;
for (const plat of PLATAFORMAS) {
  const pastaAbs = path.join(RAIZ, plat.pasta);
  const paginas = (plat.paginas || fs.readdirSync(pastaAbs).filter(f => f.endsWith('.html')))
    .map(f => path.join(pastaAbs, f))
    .filter(f => fs.existsSync(f));

  const vistos = new Map(); // chave → texto
  for (const pagina of paginas) {
    const scripts = scriptsDaPagina(pagina);
    if (!scripts.length) continue;
    const programa = ts.createProgram([TIPOS, ...scripts], OPCOES, host);
    const diags = ts.getPreEmitDiagnostics(programa).filter(d => d.file && scripts.includes(path.resolve(d.file.fileName)));
    for (const d of diags) {
      const { line, character } = d.file.getLineAndCharacterOfPosition(d.start || 0);
      const rel = path.relative(RAIZ, d.file.fileName).replace(/\\/g, '/');
      const chave = `${rel}:${line}:${character}:${d.code}`;
      if (vistos.has(chave)) continue;
      const msg = ts.flattenDiagnosticMessageText(d.messageText, ' ');
      vistos.set(chave, { grave: ehGrave(d.code), texto: `${rel}(${line + 1},${character + 1}): TS${d.code} ${msg}` });
    }
  }
  const graves = [...vistos.values()].filter(v => v.grave).map(v => v.texto).sort();
  const outros = [...vistos.values()].filter(v => !v.grave).map(v => v.texto).sort();
  totalGeral += vistos.size;
  gravesGeral += graves.length;
  console.log(`\n${plat.rotulo}: ${graves.length} grave(s), ${outros.length} aviso(s) em ${paginas.length} página(s)`);
  if (soResumo) continue;
  graves.forEach(l => console.log('  GRAVE ' + l));
  if (!soGraves) outros.forEach(l => console.log('  ' + l));
}
console.log(`\nTotal: ${gravesGeral} grave(s) (quebram a página), ${totalGeral - gravesGeral} aviso(s)`);
if (gravesGeral) process.exitCode = 1;
