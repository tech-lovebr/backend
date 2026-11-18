// Vercel Serverless Function — imagem do mapa do local do convite.
// Endpoint: /api/mapa?q=<endereço>
//
// Devolve um redirecionamento para a imagem do Google Maps Static API (uma
// imagem só, carrega bem mais rápido que o mapa interativo em iframe). O
// redirecionamento fica em cache na Vercel; a imagem vem direto do Google.
// Sem a chave configurada responde 404 e o convite volta para o mapa em iframe.
//
// Variável: GOOGLE_MAPS_KEY (chave com a Maps Static API ativa, restrita
// aos sites da Love).

module.exports = (req, res) => {
  const chave = process.env.GOOGLE_MAPS_KEY;
  const q = String((req.query && req.query.q) || "").trim().slice(0, 300);
  if (!chave || !q) {
    res.statusCode = 404;
    res.setHeader("Cache-Control", "no-store");
    return res.end();
  }
  const local = encodeURIComponent(q);
  const url = "https://maps.googleapis.com/maps/api/staticmap"
    + `?center=${local}&zoom=15&size=640x240&scale=2&language=pt-BR`
    + `&markers=color:0x183b54%7C${local}&key=${encodeURIComponent(chave)}`;
  res.statusCode = 302;
  res.setHeader("Location", url);
  res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800");
  res.end();
};
