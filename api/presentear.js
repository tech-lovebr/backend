// Vercel Serverless Function — compra de presente no convite publicado.
// Endpoint (público, o convidado não tem login):
//   POST /api/presentear
//     { slug, itens: [{ presente_id, valor? }], nome, email, cpf, mensagem?, metodo: "pix" | "cartao" }
//     → { ok, metodo, pagamento, total, taxa, pix: { imagem, copiaECola, expira } | url }
//   GET  /api/presentear?pagamento=<id do Asaas>
//     → { ok, status: "pago" | "pendente" | "cancelado" }
//
// Como o dinheiro anda: a cobrança é criada na conta da Love com split do
// valor do presente direto para a conta digital do anfitrião (walletId da
// subconta, migration 098). O anfitrião recebe o valor exato do presente;
// a taxa de serviço (paga pelo convidado) fica com a Love e cobre a tarifa
// do Asaas. Na primeira compra a conta do anfitrião é aberta na hora
// (api/_recebimento.js: precisa dos dados salvos, convidados e presentes).
//
// Cada presente vira uma contribuição "pendente" (presentear_pelo_convite);
// o pagamento confirmado chama confirmar_contribuicao (webhook do Asaas ou a
// consulta GET acima, que a tela do Pix faz a cada poucos segundos).

const { asaas, confirmarPagamento, BASE } = require("./_asaas");
const { contaParaReceber } = require("./_recebimento");
const { supabaseAdmin } = require("./_ses");

const soDigitos = (v) => String(v || "").replace(/\D/g, "");
const centavos = (v) => Math.round(Number(v || 0) * 100) / 100;

// Taxa de serviço da Love (Presentes › Configurações): 3,89% do presente,
// nunca menos que a tarifa do Asaas daquele meio (Pix R$ 1,99; cartão à vista
// 2,99% + R$ 0,49 — preços de tabela, sem promoção) para o split nunca passar
// do valor líquido da cobrança.
const TAXA_LOVE = 0.0389;
function taxaDeServico(valor, metodo) {
  const porcentagem = valor * TAXA_LOVE;
  const minimo = metodo === "cartao" ? (valor * 0.0299 + 0.49) / (1 - 0.0299) : 1.99;
  return centavos(Math.max(porcentagem, minimo) + 0.01);
}

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

function hojeNoBrasil(diasAMais = 0) {
  return new Date(Date.now() - 3 * 3600 * 1000 + diasAMais * 86400000).toISOString().slice(0, 10);
}

async function cancelar(db, ids) {
  if (ids.length) await db.from("presentes_contribuicoes").update({ status: "cancelado" }).in("id", ids);
}

module.exports = async (req, res) => {
  const db = supabaseAdmin();
  if (!db) return res.status(500).json({ ok: false, erro: "servidor_sem_configuracao" });

  try {
    // ---------------------------------------------- Consulta do pagamento
    if (req.method === "GET") {
      const id = String(req.query.pagamento || "");
      if (!/^pay_[A-Za-z0-9]+$/.test(id)) return res.status(400).json({ ok: false, erro: "pagamento_invalido" });
      const { data: itens } = await db.from("presentes_contribuicoes").select("status").eq("gateway_ref", id);
      if (!itens || !itens.length) return res.status(404).json({ ok: false, erro: "nao_encontrado" });
      if (itens.every(i => i.status === "pago")) return res.status(200).json({ ok: true, status: "pago" });
      const p = await asaas(`/payments/${id}`);
      if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(p.status)) {
        await confirmarPagamento(db, id);
        return res.status(200).json({ ok: true, status: "pago" });
      }
      if (["REFUNDED", "DELETED"].includes(p.status) || p.deleted) return res.status(200).json({ ok: true, status: "cancelado" });
      return res.status(200).json({ ok: true, status: "pendente" });
    }

    if (req.method !== "POST") return res.status(405).json({ ok: false, erro: "metodo_nao_permitido" });

    // ---------------------------------------------- Nova compra
    const b = req.body || {};
    const slug = String(b.slug || "").trim();
    const nome = String(b.nome || "").trim().replace(/\s+/g, " ");
    const email = String(b.email || "").trim();
    const cpf = soDigitos(b.cpf);
    const metodo = b.metodo === "cartao" ? "cartao" : "pix";
    const itens = Array.isArray(b.itens) ? b.itens.slice(0, 30) : [];
    if (!slug || !itens.length) return res.status(400).json({ ok: false, erro: "dados_invalidos" });
    if (nome.length < 2) return res.status(400).json({ ok: false, erro: "nome", mensagem: "Digite seu nome completo." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok: false, erro: "email", mensagem: "Digite um e-mail válido." });
    if (!cpfValido(cpf)) return res.status(400).json({ ok: false, erro: "cpf", mensagem: "Digite um CPF válido." });

    // 1. Registra cada presente (confere convite publicado, presente aberto e valor).
    const registrados = [];
    for (const it of itens) {
      const { data, error } = await db.rpc("presentear_pelo_convite", {
        p_slug: slug,
        p_presente_id: it.presente_id,
        p_valor: it.valor == null ? null : Number(it.valor),
        p_nome: nome,
        p_email: email,
        p_mensagem: b.mensagem ? String(b.mensagem).slice(0, 300) : null,
        p_metodo: metodo,
      });
      if (error || !data || !data.ok) {
        await cancelar(db, registrados.map(r => r.id));
        const codigo = (data && data.erro) || "falha";
        return res.status(400).json({ ok: false, erro: codigo, mensagem: codigo === "ja_presenteado" ? "Esse presente acabou de ser completado por outro convidado. Escolha outro da lista." : "Não foi possível registrar o presente agora." });
      }
      registrados.push({ id: data.contribuicao_id, valor: Number(data.valor) });
    }
    const ids = registrados.map(r => r.id);

    // 2. Conta digital do anfitrião (abre na hora se for a primeira compra).
    const { data: c1 } = await db.from("presentes_contribuicoes").select("evento_id").eq("id", ids[0]).single();
    const { data: evento } = await db.from("eventos").select("cliente_id, titulo").eq("id", c1.evento_id).single();
    const conta = await contaParaReceber(db, evento.cliente_id);
    if (!conta.walletId) {
      await cancelar(db, ids);
      const mensagem = conta.erro === "abrindo"
        ? "Estamos preparando o recebimento dos anfitriões. Tente de novo em alguns segundos."
        : "Os anfitriões ainda não ativaram o recebimento dos presentes. Tente de novo mais tarde.";
      const teste = /sandbox/.test(BASE) ? ` [teste: ${conta.erro}${conta.detalhe ? " — " + conta.detalhe : ""}]` : "";
      return res.status(409).json({ ok: false, erro: "recebimento_inativo", motivo: conta.erro, mensagem: mensagem + teste });
    }

    const soma = centavos(registrados.reduce((s, r) => s + r.valor, 0));
    const taxa = taxaDeServico(soma, metodo);
    const total = centavos(soma + taxa);

    // 3. Pagador (o Asaas exige CPF) e cobrança com split para o anfitrião.
    const achados = await asaas(`/customers?cpfCnpj=${cpf}&limit=1`).catch(() => null);
    const pagador = achados && achados.data && achados.data[0]
      ? achados.data[0]
      : await asaas("/customers", { metodo: "POST", corpo: { name: nome, email, cpfCnpj: cpf, notificationDisabled: true } });

    const cobranca = await asaas("/payments", {
      metodo: "POST",
      corpo: {
        customer: pagador.id,
        billingType: metodo === "cartao" ? "CREDIT_CARD" : "PIX",
        value: total,
        dueDate: hojeNoBrasil(1),
        description: `${registrados.length === 1 ? "Presente" : `${registrados.length} presentes`} para ${evento.titulo || "o evento"} (Love)`.slice(0, 500),
        externalReference: ids[0],
        split: [{ walletId: conta.walletId, fixedValue: soma, description: "Presente pela Love" }],
      },
    });
    await db.from("presentes_contribuicoes").update({ gateway_ref: cobranca.id }).in("id", ids);

    const resposta = { ok: true, metodo, pagamento: cobranca.id, contribuicoes: ids, soma, taxa, total };
    if (metodo === "pix") {
      const qr = await asaas(`/payments/${cobranca.id}/pixQrCode`);
      resposta.pix = { imagem: qr.encodedImage, copiaECola: qr.payload, expira: qr.expirationDate };
    } else {
      resposta.url = cobranca.invoiceUrl;
    }
    return res.status(200).json(resposta);
  } catch (e) {
    console.error("presentear:", e.message, JSON.stringify(e.detalhes || ""));
    // No sandbox a resposta traz o motivo (do Asaas ou do servidor) para o teste.
    const sandbox = /sandbox/.test(BASE);
    return res.status(500).json({
      ok: false, erro: "falha",
      mensagem: "Não foi possível gerar o pagamento agora. Tente de novo em instantes." + (sandbox ? ` [teste: ${String(e.message).slice(0, 200)}]` : ""),
    });
  }
};

module.exports.taxaDeServico = taxaDeServico;
