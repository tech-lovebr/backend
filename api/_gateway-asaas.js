// Adaptador Asaas dos dados aprovados na Love (ver api/_gateways.js).
// O arquivo começa com "_" para a Vercel não publicar como rota.
//
//   documento_completo (frente e verso numa imagem) → IDENTIFICATION
//   selfie segurando o documento                    → IDENTIFICATION_SELFIE
//
// A conta digital só existe depois da primeira compra de um convidado; antes
// disso devolve "aguardando_conta" e os arquivos vão quando ela abrir (ao
// abrir a Carteira ou pelo webhook do Asaas). Documento que o Asaas só aceita
// pelo link dele (onboardingUrl) devolve "link".

const { asaas, chaveDaConta, BASE } = require("./_asaas");

const ARQUIVO_DO_TIPO = {
  IDENTIFICATION: v => v.documento_completo || v.rg_frente,
  IDENTIFICATION_SELFIE: v => v.selfie,
};

async function enviarArquivo(chave, grupo, arquivo) {
  const form = new FormData();
  form.append("type", grupo.type);
  form.append("documentFile", new Blob([arquivo.bytes], { type: arquivo.tipo }), arquivo.nome);
  const r = await fetch(`${BASE}/myAccount/documents/${grupo.id}`, {
    method: "POST",
    headers: { access_token: chave, "User-Agent": "Love/1.0 (love.com.br)" },
    body: form,
  });
  const texto = await r.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = { bruto: texto }; }
  if (!r.ok) {
    const msg = (dados && Array.isArray(dados.errors) && dados.errors.map(x => x.description).join(" ")) || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return dados;
}

async function enviarDocumentos({ db, titularId, verificacao: v, baixar }) {
  const chave = await chaveDaConta(db, titularId).catch(() => null);
  if (!chave) return { situacao: "aguardando_conta", detalhe: { quando: "A conta digital abre na primeira compra de um convidado; os documentos vão nessa hora." } };

  const pendentes = await asaas("/myAccount/documents", { chave });
  const grupos = (pendentes && Array.isArray(pendentes.data)) ? pendentes.data : [];
  const enviados = [];
  const porLink = [];
  for (const g of grupos) {
    const arquivoDe = ARQUIVO_DO_TIPO[g.type];
    if (!arquivoDe || g.status === "APPROVED") continue;
    // Já mandado e em análise: não reenvia (reenviar troca o arquivo e volta para o fim da fila).
    if (g.status === "PENDING" && Array.isArray(g.documents) && g.documents.length) continue;
    if (g.onboardingUrl) { porLink.push(g.type); continue; }
    const caminho = arquivoDe(v);
    if (!caminho) continue;
    await enviarArquivo(chave, g, await baixar(caminho));
    enviados.push(g.type);
  }
  if (enviados.length) return { situacao: "enviado", detalhe: { enviados, porLink } };
  if (porLink.length) return { situacao: "link", detalhe: { porLink } };
  const jaFoi = grupos.some(g => ARQUIVO_DO_TIPO[g.type] && (g.status === "APPROVED" || g.status === "PENDING"));
  return { situacao: jaFoi ? "enviado" : "sem_pendencia", detalhe: { grupos: grupos.map(g => `${g.type}:${g.status}`) } };
}

module.exports = { nome: "asaas", enviarDocumentos };
