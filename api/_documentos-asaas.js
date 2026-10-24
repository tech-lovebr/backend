// Documentos da verificação de identidade → conta digital do anfitrião no Asaas.
// O arquivo começa com "_" para a Vercel não publicar como rota.
//
// O anfitrião envia uma vez só na Love (Carteira › Contas bancárias). Depois
// que o Admin aprova em Verificações, os mesmos arquivos vão para o Asaas:
//   documento_completo (frente e verso numa imagem) → IDENTIFICATION
//   selfie segurando o documento                    → IDENTIFICATION_SELFIE
//
// Quando roda:
//   • ao aprovar no Admin (api/verificacao-asaas.js);
//   • quando o anfitrião abre a Carteira (api/asaas-conta.js) ou o Asaas avisa
//     que faltam documentos (webhook) — cobre quem foi aprovado antes de a
//     conta digital existir (ela só abre na primeira compra de um convidado).
//
// Documento que o Asaas só aceita pelo link dele (onboardingUrl) não vai pela
// API: fica como "link" e o anfitrião usa o link na Carteira.

const { asaas, chaveDaConta, BASE } = require("./_asaas");

const TIPO_DO_ARQUIVO = {
  IDENTIFICATION: v => v.documento_completo || v.rg_frente,
  IDENTIFICATION_SELFIE: v => v.selfie,
};

async function marcar(db, clienteId, asaas_status, detalhe) {
  await db.from("verificacoes_identidade").update({
    asaas_status,
    asaas_detalhe: detalhe || {},
    ...(asaas_status === "enviado" ? { asaas_enviado_em: new Date().toISOString() } : {}),
  }).eq("cliente_id", clienteId);
  return { situacao: asaas_status, detalhe };
}

/** Manda um arquivo do bucket "documentos" para um grupo de documentos do Asaas. */
async function enviarArquivo(db, chave, grupo, caminho) {
  const { data: arquivo, error } = await db.storage.from("documentos").download(caminho);
  if (error || !arquivo) throw new Error(`arquivo não encontrado: ${caminho}`);
  const nome = caminho.split("/").pop() || "documento.jpg";
  const form = new FormData();
  form.append("type", grupo.type);
  form.append("documentFile", new Blob([await arquivo.arrayBuffer()], { type: arquivo.type || "image/jpeg" }), nome);
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

/**
 * Envia o que estiver pendente. Devolve { situacao, detalhe }:
 *   nao_aprovado | aguardando_conta | enviado | link | sem_pendencia | erro
 */
async function enviarDocumentos(db, clienteId) {
  const { data: v } = await db.from("verificacoes_identidade").select("*").eq("cliente_id", clienteId).maybeSingle();
  if (!v || v.status !== "aprovado") return { situacao: "nao_aprovado" };

  const chave = await chaveDaConta(db, clienteId).catch(() => null);
  if (!chave) return marcar(db, clienteId, "aguardando_conta", { quando: "A conta digital abre na primeira compra de um convidado; os documentos vão nessa hora." });

  try {
    const pendentes = await asaas("/myAccount/documents", { chave });
    const grupos = (pendentes && Array.isArray(pendentes.data)) ? pendentes.data : [];
    const enviados = [];
    const porLink = [];
    for (const g of grupos) {
      const arquivoDe = TIPO_DO_ARQUIVO[g.type];
      if (!arquivoDe) continue;
      if (g.status === "APPROVED") continue;
      // Já mandado e em análise: não reenvia (reenviar troca o arquivo e volta para o fim da fila).
      if (g.status === "PENDING" && Array.isArray(g.documents) && g.documents.length) continue;
      if (g.onboardingUrl) { porLink.push(g.type); continue; }
      const caminho = arquivoDe(v);
      if (!caminho) continue;
      await enviarArquivo(db, chave, g, caminho);
      enviados.push(g.type);
    }
    if (enviados.length) return marcar(db, clienteId, "enviado", { enviados, porLink });
    if (porLink.length) return marcar(db, clienteId, "link", { porLink });
    return marcar(db, clienteId, v.asaas_status === "enviado" ? "enviado" : "sem_pendencia", { grupos: grupos.map(g => `${g.type}:${g.status}`) });
  } catch (e) {
    console.error("documentos para o Asaas:", e.message);
    return marcar(db, clienteId, "erro", { mensagem: String(e.message).slice(0, 300) });
  }
}

module.exports = { enviarDocumentos };
