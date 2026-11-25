// Taxas que o Asaas cobrou da conta principal da Love (extrato financeiro).
// O arquivo começa com "_" para a Vercel não publicar como rota.
//
// Lê GET /financialTransactions da conta principal e soma, por mês, as saídas
// que são taxa (tipo com "FEE" ou descrição começando por "Taxa"/"Tarifa"):
// cobranças, Pix, transferências, notificações, abertura de subconta etc.
// Os valores são os que o próprio Asaas lançou; nada é estimado aqui.
// As taxas das subcontas dos anfitriões saem da subconta, não daqui.

const { asaas } = require("./_asaas");

const POR_PAGINA = 100;
const MAX_PAGINAS = 30; // 3.000 lançamentos por consulta; acima disso avisa.

function ambienteAsaas() {
  const base = String(process.env.ASAAS_BASE_URL || "https://api-sandbox.asaas.com/v3");
  return /sandbox/i.test(base) ? "sandbox" : "producao";
}

const ehTaxa = t => Number(t.value) < 0
  && (/FEE/i.test(String(t.type || "")) || /^(taxa|tarifa)/i.test(String(t.description || "").trim()));

/**
 * meses: ["2026-01", ..., "2026-12"]. Devolve
 * { meses: { "2026-11": 12.5 }, por_tipo: { "2026-11": { PAYMENT_FEE: 10 } }, truncado }.
 */
async function taxasAsaas(meses) {
  const porMes = Object.fromEntries(meses.map(m => [m, 0]));
  const porTipo = Object.fromEntries(meses.map(m => [m, {}]));
  const inicio = `${meses[0]}-01`;
  const fim = new Date().toISOString().slice(0, 10);
  let truncado = false;

  for (let pagina = 0; ; pagina++) {
    if (pagina >= MAX_PAGINAS) { truncado = true; break; }
    const j = await asaas(`/financialTransactions?startDate=${inicio}&finishDate=${fim}&offset=${pagina * POR_PAGINA}&limit=${POR_PAGINA}`);
    (j && Array.isArray(j.data) ? j.data : []).filter(ehTaxa).forEach(t => {
      const mes = String(t.date || "").slice(0, 7);
      if (!(mes in porMes)) return;
      const valor = Math.abs(Number(t.value) || 0);
      const tipo = String(t.type || "OUTRA_TAXA");
      porMes[mes] += valor;
      porTipo[mes][tipo] = (porTipo[mes][tipo] || 0) + valor;
    });
    if (!j || !j.hasMore) break;
  }

  Object.keys(porMes).forEach(m => { porMes[m] = Math.round(porMes[m] * 100) / 100; });
  return { meses: porMes, por_tipo: porTipo, truncado };
}

module.exports = { taxasAsaas, ambienteAsaas };
