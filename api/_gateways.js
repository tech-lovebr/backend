// Dados aprovados uma vez na Love → qualquer gateway de pagamento.
// O arquivo começa com "_" para a Vercel não publicar como rota.
//
// A pessoa envia dados e documentos uma vez só (Carteira › Contas bancárias).
// O Admin aprova em Verificações. Daqui em diante a Love é a dona do original
// e cada gateway recebe uma cópia, sem a pessoa subir nada de novo:
//
//   original (Love)                         → gateway
//   verificacoes_identidade (dados + fotos)  → documentos da conta no gateway
//   clientes.dados_saque.contas (padrão COMPE) → conta de saque no gateway
//
// Cada gateway é um adaptador com a mesma forma:
//   { nome, enviarDocumentos(ctx) → { situacao, detalhe } }
//   ctx = { db, titularId, verificacao, baixar(caminho) → { bytes, tipo, nome } }
// Para somar um gateway de contingência: criar api/_gateway-<nome>.js com essa
// forma e colocar em ADAPTADORES. Como foi cada envio fica em
// verificacoes_gateways (migration 108), uma linha por pessoa + gateway.

const ADAPTADORES = {
  asaas: require("./_gateway-asaas"),
};

/** Gateways ligados (GATEWAYS_ATIVOS="asaas,outro"; padrão: asaas). */
function gatewaysAtivos() {
  const lista = String(process.env.GATEWAYS_ATIVOS || "asaas").split(",").map(s => s.trim()).filter(Boolean);
  return lista.filter(n => ADAPTADORES[n]);
}

async function registrar(db, titularId, gateway, { situacao, detalhe }) {
  await db.from("verificacoes_gateways").upsert({
    titular_tipo: "anfitriao",
    titular_id: titularId,
    gateway,
    status: situacao,
    detalhe: detalhe || {},
    atualizado_em: new Date().toISOString(),
    ...(situacao === "enviado" ? { enviado_em: new Date().toISOString() } : {}),
  }, { onConflict: "titular_tipo,titular_id,gateway" });
}

/**
 * Manda o que estiver pendente para os gateways (todos os ativos, ou só os
 * de `so`). Devolve { situacao, gateways: { asaas: { situacao, detalhe } } }.
 * situacao geral: a do primeiro gateway (hoje só o Asaas).
 */
async function enviarParaGateways(db, titularId, { so } = {}) {
  const { data: verificacao } = await db.from("verificacoes_identidade").select("*").eq("cliente_id", titularId).maybeSingle();
  if (!verificacao || verificacao.status !== "aprovado") return { situacao: "nao_aprovado", gateways: {} };

  const baixar = async caminho => {
    const { data, error } = await db.storage.from("documentos").download(caminho);
    if (error || !data) throw new Error(`arquivo não encontrado: ${caminho}`);
    return { bytes: await data.arrayBuffer(), tipo: data.type || "image/jpeg", nome: caminho.split("/").pop() || "documento.jpg" };
  };

  const alvo = gatewaysAtivos().filter(n => !so || [].concat(so).includes(n));
  const gateways = {};
  for (const nome of alvo) {
    let r;
    try {
      r = await ADAPTADORES[nome].enviarDocumentos({ db, titularId, verificacao, baixar });
    } catch (e) {
      console.error(`documentos para ${nome}:`, e.message);
      r = { situacao: "erro", detalhe: { mensagem: String(e.message).slice(0, 300) } };
    }
    gateways[nome] = r;
    await registrar(db, titularId, nome, r).catch(e => console.error("verificacoes_gateways:", e.message));
  }
  const primeiro = gateways[alvo[0]];
  return { situacao: primeiro ? primeiro.situacao : "sem_gateway", gateways };
}

module.exports = { enviarParaGateways, gatewaysAtivos };
