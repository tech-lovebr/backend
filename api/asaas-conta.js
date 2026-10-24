// Vercel Serverless Function — recebimento dos presentes do anfitrião (Asaas).
// Endpoint: /api/asaas-conta   Header: Authorization: Bearer <access_token>
//
//   GET                          → { conta, dados } — situação da conta
//                                  (atualiza com o Asaas) e os dados salvos.
//   POST { acao: "dados", dados } → salva os dados para receber (sem abrir
//                                  conta; ela abre na primeira compra — ver
//                                  api/_recebimento.js).
//   POST { acao: "verificacao" }  → link da verificação facial (documento +
//                                  selfie), pedida no primeiro saque.
// Variáveis: ver api/_asaas.js.

const { asaas, usuarioDaRequisicao, chaveDaConta, statusDaLove } = require("./_asaas");
const { salvarDados, dadosParaTela, lerConta, salvarConta } = require("./_recebimento");

/** O que a tela precisa (nunca devolve chave nem ids do Asaas). */
function publico(c) {
  if (!c) return { status: "inativa" };
  return {
    status: c.status,
    verificacao: c.onboarding_url && (!c.onboarding_expira || new Date(c.onboarding_expira) > new Date()) ? c.onboarding_url : null,
    atualizada: c.updated_at,
  };
}

/** Atualiza a situação com o Asaas (status + link de verificação). */
async function atualizar(db, clienteId, conta) {
  const chave = await chaveDaConta(db, clienteId);
  if (!chave) return conta;
  const situacao = await asaas("/myAccount/status", { chave }).catch(() => null);
  const campos = { status_detalhe: situacao || {} };
  if (situacao) campos.status = statusDaLove(situacao);
  if (campos.status !== "aprovada") {
    const docs = await asaas("/myAccount/documents", { chave }).catch(() => null);
    const comLink = docs && Array.isArray(docs.data) ? docs.data.find(g => g.onboardingUrl && g.status !== "APPROVED") : null;
    if (comLink) {
      campos.onboarding_url = comLink.onboardingUrl;
      campos.onboarding_expira = comLink.onboardingUrlExpirationDate || null;
    }
  } else {
    campos.onboarding_url = null;
  }
  return salvarConta(db, clienteId, campos);
}

module.exports = async (req, res) => {
  const { db, usuario } = await usuarioDaRequisicao(req);
  if (!db) return res.status(500).json({ ok: false, erro: "servidor_sem_configuracao" });
  if (!usuario) return res.status(401).json({ ok: false, erro: "sem_sessao" });

  try {
    let conta = await lerConta(db, usuario.id);

    if (req.method === "GET") {
      if (conta && conta.asaas_id) conta = await atualizar(db, usuario.id, conta);
      return res.status(200).json({ ok: true, conta: publico(conta), dados: await dadosParaTela(db, usuario.id) });
    }
    if (req.method !== "POST") return res.status(405).json({ ok: false, erro: "metodo_nao_permitido" });

    const { acao, dados } = req.body || {};

    if (acao === "dados") {
      const r = await salvarDados(db, usuario.id, dados);
      if (!r.ok) return res.status(400).json({ ok: false, erro: "dados_invalidos", campos: r.erros });
      return res.status(200).json({ ok: true });
    }

    if (acao === "verificacao") {
      if (!conta || !conta.asaas_id) return res.status(400).json({ ok: false, erro: "conta_inexistente" });
      conta = await atualizar(db, usuario.id, conta);
      return res.status(200).json({ ok: true, conta: publico(conta) });
    }

    return res.status(400).json({ ok: false, erro: "acao_invalida" });
  } catch (e) {
    console.error("asaas-conta:", e.message, e.detalhes || "");
    return res.status(500).json({ ok: false, erro: "falha", mensagem: "Não foi possível salvar agora. Tente de novo em instantes." });
  }
};
