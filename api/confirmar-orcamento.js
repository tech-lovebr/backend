// Vercel Serverless Function — fecha o ciclo de um orçamento pago.
// Endpoint: POST /api/confirmar-orcamento
// Body (JSON): { paymentLinkId: string }
//
// Quem paga um link de checkout não está logado como o fornecedor, então
// marcar o orçamento como "pago" e o lead correspondente no CRM como
// "Fechado" não pode depender de RLS de usuário autenticado — e também não
// merece uma policy anônima aberta em cima de `leads` (tem nome/e-mail/valor
// do contato). Por isso isso roda no servidor, com a service role key, e só
// mexe em quem já está genuinamente com o link marcado como pago.

const { createClient } = require("@supabase/supabase-js");

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)
);

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { paymentLinkId } = req.body || {};
  if (!paymentLinkId) {
    return res.status(400).json({ error: "paymentLinkId é obrigatório" });
  }

  const { data: link } = await supabaseAdmin
    .from("payment_links")
    .select("id, status, orcamento_id")
    .eq("id", paymentLinkId)
    .maybeSingle();

  if (!link || link.status !== "pago" || !link.orcamento_id) {
    return res.status(200).json({ ok: true, skipped: true });
  }

  const { data: orcamento } = await supabaseAdmin
    .from("orcamentos")
    .select("id, lead_id")
    .eq("id", link.orcamento_id)
    .maybeSingle();

  if (!orcamento) {
    return res.status(200).json({ ok: true, skipped: true });
  }

  await supabaseAdmin.from("orcamentos").update({ status: "pago" }).eq("id", orcamento.id);
  if (orcamento.lead_id) {
    await supabaseAdmin.from("leads").update({ status: "fechado" }).eq("id", orcamento.lead_id);
  }

  return res.status(200).json({ ok: true });
};
