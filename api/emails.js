// Vercel Serverless Function — painel de E-mails do Admin (Settings → E-mails).
// Endpoint: /api/emails   (chamado de admin.love.com.br)
// Header:   Authorization: Bearer <access_token do admin logado>
//
//   GET  ?dias=7|30|90         → situação da conexão com o SES, conta (sandbox,
//                                cota), remetente padrão e custo do período
//   POST { acao: "conectar" }  → liga os eventos do SES a /api/ses-eventos:
//                                conjunto de configuração "love-eventos",
//                                tópico SNS, inscrição e padrão do domínio
//   POST { acao: "enviar", para, assunto, html, de?, template?, categoria? }
//                              → envia pelo SES e registra em email_envios
//
// Permissões IAM do usuário das chaves AWS (além de ses:SendEmail):
//   ses:GetAccount, ses:GetEmailIdentity, ses:GetConfigurationSet,
//   ses:CreateConfigurationSet, ses:GetConfigurationSetEventDestinations,
//   ses:CreateConfigurationSetEventDestination,
//   ses:UpdateConfigurationSetEventDestination,
//   ses:PutEmailIdentityConfigurationSetAttributes,
//   sns:CreateTopic, sns:SetTopicAttributes, sns:Subscribe,
//   sns:ListSubscriptionsByTopic, ce:GetCostAndUsage
//
// Variáveis: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AWS_REGION,
//   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, EMAIL_FROM,
//   SES_EVENTOS_URL (opcional; padrão https://love.com.br/api/ses-eventos)

const {
  SESv2Client, GetAccountCommand, GetEmailIdentityCommand, GetConfigurationSetCommand,
  CreateConfigurationSetCommand, GetConfigurationSetEventDestinationsCommand,
  CreateConfigurationSetEventDestinationCommand, UpdateConfigurationSetEventDestinationCommand,
  PutEmailIdentityConfigurationSetAttributesCommand,
} = require("@aws-sdk/client-sesv2");
const {
  SNSClient, CreateTopicCommand, SetTopicAttributesCommand, SubscribeCommand, ListSubscriptionsByTopicCommand,
} = require("@aws-sdk/client-sns");
const { CostExplorerClient, GetCostAndUsageCommand } = require("@aws-sdk/client-cost-explorer");
const { enviarEmail, enderecoDe, supabaseAdmin } = require("./_ses");

const ORIGENS_PERMITIDAS = ["https://admin.love.com.br", "http://localhost:8090", "http://127.0.0.1:8090"];
const CONJUNTO = "love-eventos";
const TOPICO = "love-ses-eventos";
const DESTINO = "love-sns";
const EVENTOS = ["SEND", "REJECT", "BOUNCE", "COMPLAINT", "DELIVERY", "OPEN", "CLICK", "DELIVERY_DELAY", "RENDERING_FAILURE"];
const MAX_DESTINATARIOS = 50;

const CACHE_CUSTO = new Map();
const VALIDADE_CUSTO = 6 * 60 * 60 * 1000;

function cors(req, res) {
  const origem = req.headers.origin || "";
  if (ORIGENS_PERMITIDAS.includes(origem)) {
    res.setHeader("Access-Control-Allow-Origin", origem);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
}

const credenciais = () => ({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
const regiao = () => process.env.AWS_REGION || "us-east-1";
const sesv2 = () => new SESv2Client({ region: regiao(), credentials: credenciais() });
const sns = () => new SNSClient({ region: regiao(), credentials: credenciais() });

const remetentePadrao = () => process.env.EMAIL_FROM || "Love <contato@love.com.br>";
const dominio = () => enderecoDe(remetentePadrao()).split("@")[1] || "love.com.br";
const urlEventos = () => process.env.SES_EVENTOS_URL || "https://love.com.br/api/ses-eventos";

const mensagem = (e) => String(e && (e.message || e.name) || e);
const naoExiste = (e) => /NotFound/i.test(String(e && e.name)) || /does not exist|not found/i.test(mensagem(e));
const jaExiste = (e) => /AlreadyExists/i.test(String(e && e.name)) || /already exists/i.test(mensagem(e));

async function exigirAdmin(req, res) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const db = supabaseAdmin();
  if (!token || !db) { res.status(401).json({ error: "Sem sessão" }); return null; }
  const { data: quem, error } = await db.auth.getUser(token);
  if (error || !quem || !quem.user) { res.status(401).json({ error: "Sessão inválida" }); return null; }
  const { data: admin } = await db.from("admins").select("id, active").eq("id", quem.user.id).maybeSingle();
  if (!admin || admin.active === false) { res.status(403).json({ error: "Acesso só para admins" }); return null; }
  return quem.user;
}

/** Identidade de envio: o domínio verificado ou, se não houver, o endereço. */
async function identidade(cliente) {
  for (const nome of [dominio(), enderecoDe(remetentePadrao())]) {
    try {
      const r = await cliente.send(new GetEmailIdentityCommand({ EmailIdentity: nome }));
      return { nome, verificada: r.VerifiedForSendingStatus === true, conjunto: r.ConfigurationSetAttributes && r.ConfigurationSetAttributes.ConfigurationSetName || null };
    } catch (e) {
      if (!naoExiste(e)) throw e;
    }
  }
  return null;
}

/* ---------------------------------------------------------------- Situação */

async function situacao() {
  const r = { configurado: Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY), regiao: regiao(), remetente: remetentePadrao(), dominio: dominio() };
  if (!r.configurado) return r;
  const cliente = sesv2();

  try {
    const conta = await cliente.send(new GetAccountCommand({}));
    r.conta = {
      producao: conta.ProductionAccessEnabled === true,
      envioLiberado: conta.SendingEnabled !== false,
      cota24h: conta.SendQuota && conta.SendQuota.Max24HourSend,
      enviadas24h: conta.SendQuota && conta.SendQuota.SentLast24Hours,
      porSegundo: conta.SendQuota && conta.SendQuota.MaxSendRate,
      reputacao: conta.EnforcementStatus || null,
    };
  } catch (e) { r.erroConta = mensagem(e); }

  try {
    const id = await identidade(cliente);
    r.identidade = id;
  } catch (e) { r.erroIdentidade = mensagem(e); }

  try {
    const d = await cliente.send(new GetConfigurationSetEventDestinationsCommand({ ConfigurationSetName: CONJUNTO }));
    const destino = (d.EventDestinations || []).find(x => x.Name === DESTINO);
    r.eventos = { conjunto: true, destino: Boolean(destino && destino.Enabled), topico: destino && destino.SnsDestination && destino.SnsDestination.TopicArn || null };
  } catch (e) {
    r.eventos = { conjunto: false, destino: false };
    if (!naoExiste(e)) r.erroEventos = mensagem(e);
  }

  if (r.eventos.topico) {
    try {
      const s = await sns().send(new ListSubscriptionsByTopicCommand({ TopicArn: r.eventos.topico }));
      const inscricao = (s.Subscriptions || []).find(x => x.Endpoint === urlEventos());
      r.eventos.inscricao = !inscricao ? "ausente" : (/PendingConfirmation/i.test(inscricao.SubscriptionArn) ? "pendente" : "confirmada");
    } catch (e) { r.erroInscricao = mensagem(e); }
  }

  r.conectado = Boolean(r.eventos.destino && r.eventos.inscricao === "confirmada" && r.identidade && r.identidade.conjunto === CONJUNTO);
  return r;
}

/* ---------------------------------------------------------------- Conectar */

async function conectar() {
  const passos = [];
  const passo = async (nome, fn) => {
    try {
      const detalhe = await fn();
      passos.push({ nome, ok: true, detalhe: detalhe || null });
      return true;
    } catch (e) {
      passos.push({ nome, ok: false, detalhe: mensagem(e) });
      return false;
    }
  };
  const cliente = sesv2();
  const topicos = sns();
  let topicArn = null;

  await passo("Conjunto de configuração no SES", async () => {
    try {
      await cliente.send(new GetConfigurationSetCommand({ ConfigurationSetName: CONJUNTO }));
      return "Já existia";
    } catch (e) {
      if (!naoExiste(e)) throw e;
      await cliente.send(new CreateConfigurationSetCommand({ ConfigurationSetName: CONJUNTO }));
      return "Criado";
    }
  });

  const okTopico = await passo("Tópico de eventos no SNS", async () => {
    const t = await topicos.send(new CreateTopicCommand({ Name: TOPICO }));
    topicArn = t.TopicArn;
    const conta = topicArn.split(":")[4];
    await topicos.send(new SetTopicAttributesCommand({
      TopicArn: topicArn,
      AttributeName: "Policy",
      AttributeValue: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
          Sid: "SesPublica",
          Effect: "Allow",
          Principal: { Service: "ses.amazonaws.com" },
          Action: "sns:Publish",
          Resource: topicArn,
          Condition: { StringEquals: { "AWS:SourceAccount": conta } },
        }],
      }),
    }));
    return topicArn;
  });

  if (okTopico) {
    await passo("SES publica os eventos no tópico", async () => {
      const destino = {
        Enabled: true,
        MatchingEventTypes: EVENTOS,
        SnsDestination: { TopicArn: topicArn },
      };
      try {
        await cliente.send(new CreateConfigurationSetEventDestinationCommand({ ConfigurationSetName: CONJUNTO, EventDestinationName: DESTINO, EventDestination: destino }));
        return "Criado";
      } catch (e) {
        if (!jaExiste(e)) throw e;
        await cliente.send(new UpdateConfigurationSetEventDestinationCommand({ ConfigurationSetName: CONJUNTO, EventDestinationName: DESTINO, EventDestination: destino }));
        return "Atualizado";
      }
    });

    await passo("Inscrição da Love no tópico", async () => {
      const s = await topicos.send(new SubscribeCommand({ TopicArn: topicArn, Protocol: "https", Endpoint: urlEventos(), ReturnSubscriptionArn: true }));
      return /pending/i.test(s.SubscriptionArn || "") ? "Aguardando confirmação (automática em segundos)" : "Confirmada";
    });
  }

  await passo(`Eventos ligados a todo e-mail de ${dominio()}`, async () => {
    const id = await identidade(cliente);
    if (!id) throw new Error(`O domínio ${dominio()} não está cadastrado no SES desta região (${regiao()}).`);
    await cliente.send(new PutEmailIdentityConfigurationSetAttributesCommand({ EmailIdentity: id.nome, ConfigurationSetName: CONJUNTO }));
    return id.nome;
  });

  return { ok: passos.every(p => p.ok), passos };
}

/* ------------------------------------------------------------------- Custo */

async function custo(dias) {
  const chave = String(dias);
  const guardado = CACHE_CUSTO.get(chave);
  if (guardado && Date.now() - guardado.em < VALIDADE_CUSTO) return guardado.dados;

  const inicio = new Date(Date.now() - (dias - 1) * 86400000).toISOString().slice(0, 10);
  const fim = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  let dados;
  try {
    const ce = new CostExplorerClient({ region: "us-east-1", credentials: credenciais() });
    const r = await ce.send(new GetCostAndUsageCommand({
      TimePeriod: { Start: inicio, End: fim },
      Granularity: "DAILY",
      Metrics: ["UnblendedCost"],
      Filter: { Dimensions: { Key: "SERVICE", Values: ["Amazon Simple Email Service"] } },
    }));
    const usd = (r.ResultsByTime || []).reduce((s, p) => s + (Number(p.Total && p.Total.UnblendedCost && p.Total.UnblendedCost.Amount) || 0), 0);
    let cotacao = null;
    try {
      const j = await (await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL")).json();
      cotacao = Number(j.USDBRL && j.USDBRL.bid) || null;
    } catch { /* sem cotação */ }
    dados = { usd, brl: cotacao ? usd * cotacao : null, cotacao };
  } catch (e) {
    dados = { erro: mensagem(e) };
  }
  CACHE_CUSTO.set(chave, { em: Date.now(), dados });
  return dados;
}

/* ------------------------------------------------------------------ Enviar */

function layoutLove(corpo) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:24px 0;">
    <tr><td align="center">
      <table width="560" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:8px;border:1px solid #e2e8f0;overflow:hidden;">
        <tr><td style="padding:24px;text-align:center;border-bottom:1px solid #f1f5f9;">
          <span style="font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">Love</span>
        </td></tr>
        <tr><td style="padding:28px 24px;color:#334155;font-size:15px;line-height:1.6;">${corpo}</td></tr>
        <tr><td style="padding:16px 24px;background-color:#f8fafc;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #f1f5f9;">
          Love · love.com.br
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function limparHtml(html) {
  return String(html || "")
    .replace(/<(script|style|object|embed)[\s\S]*?<\/\1>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

async function enviar(corpo) {
  const para = [...new Set(String(corpo.para || "").split(/[,;\s]+/).map(x => x.trim().toLowerCase()).filter(Boolean))];
  const invalidos = para.filter(x => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));
  if (!para.length) return { status: 400, json: { error: "Informe ao menos um destinatário" } };
  if (invalidos.length) return { status: 400, json: { error: `E-mail inválido: ${invalidos.join(", ")}` } };
  if (para.length > MAX_DESTINATARIOS) return { status: 400, json: { error: `Até ${MAX_DESTINATARIOS} destinatários por envio` } };
  if (!String(corpo.assunto || "").trim()) return { status: 400, json: { error: "Informe o assunto" } };
  if (!String(corpo.html || "").replace(/<[^>]+>/g, "").trim()) return { status: 400, json: { error: "Escreva o e-mail" } };

  // Remetente: qualquer endereço do domínio verificado.
  const de = String(corpo.de || "").trim() || remetentePadrao();
  if (enderecoDe(de).split("@")[1] !== dominio()) {
    return { status: 400, json: { error: `O remetente precisa ser um endereço @${dominio()}` } };
  }

  const html = layoutLove(limparHtml(corpo.html));
  const resultados = [];
  // Um envio por destinatário: ninguém vê o e-mail dos outros e cada um tem
  // a própria linha (entregue, bounce...) no registro.
  for (const destinatario of para) {
    const r = await enviarEmail({
      para: destinatario,
      de,
      assunto: String(corpo.assunto).trim(),
      html,
      template: String(corpo.template || "").trim() || "Escrito no Admin",
      categoria: String(corpo.categoria || "").trim() || "Comunicados",
    });
    resultados.push({ para: destinatario, ok: r.ok, erro: r.erro || null });
  }
  return { status: 200, json: { enviados: resultados.filter(r => r.ok).length, falhas: resultados.filter(r => !r.ok) } };
}

/* ----------------------------------------------------------------- Handler */

module.exports = async (req, res) => {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!(await exigirAdmin(req, res))) return;

  try {
    if (req.method === "GET") {
      const dias = [7, 30, 90].includes(Number(req.query && req.query.dias)) ? Number(req.query.dias) : 7;
      const [s, c] = await Promise.all([situacao(), process.env.AWS_ACCESS_KEY_ID ? custo(dias) : Promise.resolve(null)]);
      return res.status(200).json({ ...s, custo: c, dias });
    }

    if (req.method === "POST") {
      const corpo = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        return res.status(400).json({ error: "As chaves da AWS não estão na Vercel" });
      }
      if (corpo.acao === "conectar") return res.status(200).json(await conectar());
      if (corpo.acao === "enviar") {
        const r = await enviar(corpo);
        return res.status(r.status).json(r.json);
      }
      return res.status(400).json({ error: "Ação desconhecida" });
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (e) {
    console.error("api/emails:", e);
    return res.status(500).json({ error: mensagem(e) });
  }
};
