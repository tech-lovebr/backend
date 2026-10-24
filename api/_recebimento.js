// Conta digital do anfitrião (subconta Asaas) — regras comuns.
// O arquivo começa com "_" para a Vercel não publicar como rota.
//
// Regra da Love (custo só quando há dinheiro de verdade):
//   1. O anfitrião preenche os dados em Suas informações (tabela clientes,
//      migration 099). Nada é aberto no Asaas; Meus presentes mostra um
//      aviso enquanto faltar algum dado.
//   2. Na primeira compra de um convidado, o servidor abre a conta na hora
//      (contaParaReceber → abrirConta) e o presente já cai nela pelo split.
//      Só abre se o anfitrião tiver convidados E presentes cadastrados.
//   3. No primeiro saque, a verificação facial (documento + selfie).

const { asaas, cifrar } = require("./_asaas");

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

/** Confere e normaliza o que veio do formulário → corpo do POST /accounts. */
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

/** Só abre conta (que tem custo) para quem tem convidados E presentes. */
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

/* ---------------------------------- Dados (Suas informações, tabela clientes) */

/** Dados do cadastro do anfitrião → corpo do POST /accounts, ou null se faltar algo. */
async function lerDados(db, clienteId) {
  const { data: c } = await db.from("clientes")
    .select("first_name, last_name, full_name, cpf, phone, data_nascimento, renda_mensal, cep, endereco, endereco_numero, endereco_complemento, bairro")
    .eq("id", clienteId).maybeSingle();
  if (!c) return null;
  const { erros, conta } = validar({
    nome: c.full_name || [c.first_name, c.last_name].filter(Boolean).join(" "),
    cpf: c.cpf, nascimento: c.data_nascimento, celular: c.phone, renda: c.renda_mensal,
    cep: c.cep, endereco: c.endereco, numero: c.endereco_numero, complemento: c.endereco_complemento, bairro: c.bairro,
  });
  return Object.keys(erros).length ? null : conta;
}

/* ------------------------------------------ Conta (passo 2, primeira compra) */

async function lerConta(db, clienteId) {
  const { data } = await db.from("contas_recebimento").select("*").eq("cliente_id", clienteId).maybeSingle();
  return data;
}

async function salvarConta(db, clienteId, campos) {
  await db.from("contas_recebimento").upsert({ cliente_id: clienteId, ...campos, updated_at: new Date().toISOString() });
  return lerConta(db, clienteId);
}

/** Abre a subconta no Asaas e guarda a chave (cifrada) na hora. */
async function abrirConta(db, clienteId, corpo) {
  if (!process.env.ASAAS_WEBHOOK_TOKEN) throw new Error("ASAAS_WEBHOOK_TOKEN não configurado");
  const { data: u } = await db.auth.admin.getUserById(clienteId);
  const email = u && u.user && u.user.email;
  if (!email) throw new Error("anfitrião sem e-mail");

  let criada;
  try {
    criada = await asaas("/accounts", {
      metodo: "POST",
      corpo: {
        ...corpo,
        email,
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
    await salvarConta(db, clienteId, { status: "erro", erro: e.message.slice(0, 300) });
    throw e;
  }

  // A chave só vem agora: guarda cifrada antes de qualquer outra coisa.
  const apiKey = criada && criada.accessToken && criada.accessToken.apiKey ? criada.accessToken.apiKey : criada.apiKey;
  if (apiKey) await db.from("contas_recebimento_segredos").upsert({ cliente_id: clienteId, api_key_cifrada: cifrar(apiKey) });
  return salvarConta(db, clienteId, {
    asaas_id: criada.id,
    wallet_id: criada.walletId,
    status: "documentos",
    erro: apiKey ? null : "A conta foi criada, mas a chave não veio na resposta.",
    cpf_final: corpo.cpfCnpj.slice(-4),
  });
}

/**
 * Carteira (walletId) do anfitrião para o split. Abre a conta na hora se
 * ainda não existir. Devolve { walletId } ou { erro }.
 */
async function contaParaReceber(db, clienteId) {
  const atual = await lerConta(db, clienteId);
  if (atual && atual.wallet_id) {
    return atual.status === "recusada" ? { erro: "conta_recusada" } : { walletId: atual.wallet_id };
  }

  const dados = await lerDados(db, clienteId).catch(() => null);
  if (!dados) return { erro: "sem_dados" };
  const pode = await requisitos(db, clienteId);
  if (!pode.ok) return { erro: "requisitos" };

  // Trava: só uma compra abre a conta (duas compras ao mesmo tempo).
  if (!atual) {
    const { data: pegou } = await db.from("contas_recebimento")
      .upsert({ cliente_id: clienteId, status: "criando" }, { onConflict: "cliente_id", ignoreDuplicates: true })
      .select("cliente_id");
    if (!pegou || !pegou.length) return { erro: "abrindo" };
  } else {
    // Tenta de novo depois de um erro, ou de uma abertura que travou há 2+ min.
    const travadaAntes = new Date(Date.now() - 120000).toISOString();
    const { data: pegou } = await db.from("contas_recebimento")
      .update({ status: "criando", erro: null, updated_at: new Date().toISOString() })
      .eq("cliente_id", clienteId)
      .or(`status.eq.erro,and(status.eq.criando,updated_at.lt.${travadaAntes})`)
      .select("cliente_id");
    if (!pegou || !pegou.length) return { erro: "abrindo" };
  }

  try {
    const conta = await abrirConta(db, clienteId, dados);
    return conta && conta.wallet_id ? { walletId: conta.wallet_id } : { erro: "falha" };
  } catch (e) {
    await salvarConta(db, clienteId, { status: "erro", erro: String(e.message).slice(0, 300) });
    console.error("abrir conta do anfitrião:", e.message, JSON.stringify(e.detalhes || ""));
    return { erro: "asaas_recusou" };
  }
}

module.exports = { validar, requisitos, lerConta, salvarConta, contaParaReceber };
