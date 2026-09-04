const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8090;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4'
};

const server = http.createServer((req, res) => {
  // Trata e ignora desconexões abruptas do navegador (evita congelamento e crashes)
  req.on('error', (err) => {
    // Silencia erros normais de aborto do cliente
  });
  res.on('error', (err) => {
    // Silencia erros normais de aborto do cliente
  });

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  if (pathname === '/') {
    pathname = '/index.html';
  }

  // Previne Directory Traversal
  const safePath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!safePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  fs.stat(safePath, (err, stats) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('404 Arquivo não encontrado');
      }
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('500 Erro Interno');
    }

    let filePath = safePath;
    if (stats.isDirectory()) {
      filePath = path.join(safePath, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Headers com Keep-Alive, CORS e No-Cache para desenvolvimento fluido
    const headers = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive'
    };

    const stream = fs.createReadStream(filePath);
    stream.on('open', () => {
      res.writeHead(200, headers);
      stream.pipe(res);
    });

    stream.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
      }
      res.end('500 Erro de leitura');
    });
  });
});

// Trata erros de socket de baixo nível (como conexões resetadas pelo browser)
server.on('clientError', (err, socket) => {
  if (err.code === 'ECONNRESET' || !socket.writable) {
    return;
  }
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Love Platform rodando com alta performance e estabilidade:`);
  console.log(`   ➜ Local:   http://localhost:${PORT}/`);
  console.log(`   ➜ Rede:    http://127.0.0.1:${PORT}/\n`);
});
