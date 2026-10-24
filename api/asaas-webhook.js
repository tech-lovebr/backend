// Vercel Serverless Function — avisos (webhooks) do Asaas.
// Endpoint: POST /api/asaas-webhook
// Header:   asaas-access-token = ASAAS_WEBHOOK_TOKEN (o mesmo enviado ao criar
//           cada subconta em api/asaas-conta.js).
//
// O Asaas entrega "pelo menos uma vez" e só aceita HTTP 200 como sucesso:
// cada evento é guardado em asaas_eventos (o id evita processar duas vezes)
// e a resposta é sempre 200 quando o token confere.
//
// Por enquanto trata a situação da conta do anfitrião (ACCOUNT_STATUS_*).
// Pagamentos (PAYMENT_*) e saques (TRANSFER_*) ficam guardados para a
// próxima etapa da integração.

const crypto = require("crypto");
const { supabaseAdmin } = require("./_ses");

function tokenConfere(recebido) {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN || "";
  const a = Buffer.from(String(recebido || ""));
  const b = Buffer.from(esperado);
  return esperado.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

const STATUS_DO_EVENTO = {
  ACCOUNT_STATUS_GENERAL_APPROVAL_APPROVED: "aprovada",
  ACCOUNT_STATUS_GENERAL_APPROVAL_REJECTED: "recusada",
  ACCOUNT_STATUS_GENERAL_APPROVAL_AWAITING_APPROVAL: "em_analise",
  ACCOUNT_STATUS_DOCUMENT_PENDING: "documentos",
  ACCOUNT_STATUS_DOCUMENT_REJECTED: "documentos",
  ACCOUNT_STATUS_DOCUMENT_AWAITING_APPROVAL: "em_analise",
};

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  if (!tokenConfere(req.headers["asaas-access-token"])) return res.status(401).json({ ok: false });

  const evento = req.body || {};
  const db = supabaseAdmin();
  if (!db) return res.status(500).json({ ok: false });

  try {
    const id = String(evento.id || `${evento.event}-${Date.now()}`);
    const conta = (evento.accountStatus && evento.accountStatus.id) || (evento.payment && evento.payment.account) || null;
    const { error: repetido } = await db.from("asaas_eventos").insert({ id, tipo: evento.event || "?", conta, payload: evento });
    if (repetido && /duplicate|23505/i.test(`${repetido.code} ${repetido.message}`)) return res.status(200).json({ ok: true, repetido: true });

    const novo = STATUS_DO_EVENTO[evento.event];
    if (novo && conta) {
      const campos = { status: novo, updated_at: new Date().toISOString() };
      if (evento.accountStatus) campos.status_detalhe = evento.accountStatus;
      if (novo === "aprovada") campos.onboarding_url = null;
      await db.from("contas_recebimento").update(campos).eq("asaas_id", conta);
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("asaas-webhook:", e.message);
    // 200 mesmo assim: o evento já está guardado (ou será reenviado se não estiver).
    return res.status(200).json({ ok: true });
  }
};
