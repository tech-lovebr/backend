// Vercel Serverless Function — conta de recebimento do anfitrião (Asaas).
// Endpoint: /api/asaas-conta   Header: Authorization: Bearer <access_token>
//
//   GET                       → situação da conta (atualiza com o Asaas).
//   POST { acao: "ativar", dados }  → cria a subconta (BaaS) do anfitrião.
//   POST { acao: "verificacao" }    → link da verificação de identidade
//                                     (documento + selfie) do Asaas.
//
// A chave da subconta só vem na criação: é cifrada e guardada na hora em
// contas_recebimento_segredos (migration 098), que só o servidor lê.
// Variáveis: ver api/_asaas.js.

const { asaas, cifrar, usuarioDaRequisicao, chaveDaConta, statusDaLove } = require("./_asaas");

const soDigitos = (v) => String(v || "").replace(/\D/g, "");
const URL_DO_SITE = process.env.LOVE_URL || "https://love.com.br";

const EVENTOS_DO_WEBHOOK = [
  "ACCOUNT_STATUS_GENERAL_APPROVAL_APPROVED",
  "ACCOUNT_STATUS_GENERAL_APPROVAL_REJECTED",
  "ACCOUNT_STATUS_GENERAL_APPROVAL_PENDING",
  "ACCOUNT_STATUS_GENERAL_APPROVAL_AWAITING_APPROVAL",
  "ACCOUNT_STATUS_DOCUMENT_APPROVED",
  "ACCOUNT_STATUS_DOCUMENT_REJECTED",
  "ACCOUNT_STATUS_DOCUMENT_PENDING",
  "ACCOUNT_STATUS_DOCUMENT_AWAITING_APPROVAL",
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_REFUNDED",
  "PAYMENT_OVERDUE",
  "TRANSFER_DONE",
  "TRANSFER_FAILED",
  "TRANSFER_CANCELLED",
];

function cpfValido(cpf) {
  const d = soDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  for (const t of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(d[i]) * (t + 1 - i);
    if (((soma * 10) % 11) % 10 !== Number(d[t])) return false;
  }
  return true;
}

/** Confere e normaliza o que veio do formulário. */
function validar(d) {
  const erros = {};
  const nome = String(d.nome || "").trim().replace(/\s+/g, " ");
  if (nome.split(" ").length < 2) erros.nome = "Escreva o nome completo.";
  if (!cpfValido(d.cpf)) erros.cpf = "CPF inválido.";
  const nasc = String(d.nascimento || "");
  const idade = nasc ? (Date.now() - new Date(nasc + "T00:00:00").getTime()) / 31557600000 : 0;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nasc) || idade < 18 || idade > 120) erros.nascimento = "Você precisa ter 18 anos ou mais.";
  const celular = soDigitos(d.celular);
  if (celular.length !== 11) erros.celular = "Celular com DDD (11 dígitos).";
  const renda = Number(d.renda);
  if (!(renda > 0)) erros.renda = "Escolha a renda mensal.";
  const cep = soDigitos(d.cep);
  if (cep.length !== 8) erros.cep = "CEP inválido.";
  if (!String(d.endereco || "").trim()) erros.endereco = "Informe o endereço.";
  if (!String(d.numero || "").trim()) erros.numero = "Informe o número.";
  if (!String(d.bairro || "").trim()) erros.bairro = "Informe o bairro.";
  return {
    erros,
    conta: {
      name: nome,
      cpfCnpj: soDigitos(d.cpf),
      birthDate: nasc,
      mobilePhone: celular,
      incomeValue: renda,
      postalCode: cep,
      address: String(d.endereco || "").trim().slice(0, 120),
      addressNumber: String(d.numero || "").trim().slice(0, 20),
      complement: String(d.complemento || "").trim().slice(0, 60) || undefined,
      province: String(d.bairro || "").trim().slice(0, 80),
    },
  };
}

/**
 * Regra da Love: a conta digital (que tem custo) só é aberta para quem já
 * tem convidados na lista E presentes adicionados. Antes disso a pessoa usa
 * a plataforma normalmente, sem gerar custo.
 */
async function requisitos(db, clienteId) {
  const { data: eventos } = await db.from("eventos").select("id").eq("cliente_id", clienteId).is("deleted_at", null);
  const ids = (eventos || []).map(e => e.id);
  if (!ids.length) return { convidados: 0, presentes: 0, ok: false };
  const [c, p] = await Promise.all([
    db.from("convidados").select("id", { count: "exact", head: true }).in("evento_id", ids),
    db.from("presentes").select("id", { count: "exact", head: true }).in("evento_id", ids),
  ]);
  const convidados = c.count || 0;
  const presentes = p.count || 0;
  return { convidados, presentes, ok: convidados > 0 && presentes > 0 };
}

async function lerConta(db, clienteId) {
  const { data } = await db.from("contas_recebimento").select("*").eq("cliente_id", clienteId).maybeSingle();
  return data;
}

async function salvarConta(db, clienteId, campos) {
  await db.from("contas_recebimento").upsert({ cliente_id: clienteId, ...campos, updated_at: new Date().toISOString() });
  return lerConta(db, clienteId);
}

/** O que a tela precisa (nunca devolve chave nem ids do Asaas). */
function publico(c) {
  if (!c) return { status: "inativa" };
  return {
    status: c.status,
    verificacao: c.onboarding_url && (!c.onboarding_expira || new Date(c.onboarding_expira) > new Date()) ? c.onboarding_url : null,
    erro: c.status === "erro" ? c.erro : null,
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
      const req_ = conta && conta.asaas_id ? null : await requisitos(db, usuario.id);
      return res.status(200).json({ ok: true, conta: publico(conta), requisitos: req_ });
    }
    if (req.method !== "POST") return res.status(405).json({ ok: false, erro: "metodo_nao_permitido" });

    const { acao, dados } = req.body || {};

    if (acao === "verificacao") {
      if (!conta || !conta.asaas_id) return res.status(400).json({ ok: false, erro: "conta_inexistente" });
      conta = await atualizar(db, usuario.id, conta);
      return res.status(200).json({ ok: true, conta: publico(conta) });
    }

    if (acao !== "ativar") return res.status(400).json({ ok: false, erro: "acao_invalida" });
    if (conta && conta.asaas_id) return res.status(200).json({ ok: true, conta: publico(conta) });

    const pode = await requisitos(db, usuario.id);
    if (!pode.ok) return res.status(400).json({ ok: false, erro: "requisitos", requisitos: pode, mensagem: "Adicione convidados e presentes antes de ativar o recebimento." });

    const { erros, conta: corpo } = validar(dados || {});
    if (Object.keys(erros).length) return res.status(400).json({ ok: false, erro: "dados_invalidos", campos: erros });
    if (!process.env.ASAAS_WEBHOOK_TOKEN) throw new Error("ASAAS_WEBHOOK_TOKEN não configurado");

    await salvarConta(db, usuario.id, { status: "criando", erro: null });
    let criada;
    try {
      criada = await asaas("/accounts", {
        metodo: "POST",
        corpo: {
          ...corpo,
          email: usuario.email,
          webhooks: [{
            name: "Love",
            url: `${URL_DO_SITE}/api/asaas-webhook`,
            email: "contato@love.com.br",
            sendType: "SEQUENTIALLY",
            interrupted: false,
            enabled: true,
            apiVersion: 3,
            authToken: process.env.ASAAS_WEBHOOK_TOKEN,
            events: EVENTOS_DO_WEBHOOK,
          }],
        },
      });
    } catch (e) {
      await salvarConta(db, usuario.id, { status: "erro", erro: e.message.slice(0, 300) });
      return res.status(400).json({ ok: false, erro: "asaas_recusou", mensagem: e.message });
    }

    // A chave só vem agora: guarda cifrada antes de qualquer outra coisa.
    const apiKey = criada && criada.accessToken && criada.accessToken.apiKey ? criada.accessToken.apiKey : criada.apiKey;
    if (apiKey) {
      await db.from("contas_recebimento_segredos").upsert({ cliente_id: usuario.id, api_key_cifrada: cifrar(apiKey) });
    }
    conta = await salvarConta(db, usuario.id, {
      asaas_id: criada.id,
      wallet_id: criada.walletId,
      status: apiKey ? "documentos" : "erro",
      erro: apiKey ? null : "A conta foi criada, mas a chave não veio na resposta.",
      cpf_final: corpo.cpfCnpj.slice(-4),
    });
    // O link da verificação fica pronto ~15 s depois; a tela pede em seguida.
    return res.status(200).json({ ok: true, conta: publico(conta) });
  } catch (e) {
    console.error("asaas-conta:", e.message, e.detalhes || "");
    const semChave = e.codigo === "sem_chave";
    return res.status(500).json({ ok: false, erro: semChave ? "asaas_nao_configurado" : "falha", mensagem: semChave ? "O recebimento ainda não está disponível." : "Não foi possível falar com o banco agora." });
  }
};
