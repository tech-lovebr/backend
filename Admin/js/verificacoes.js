/* ==========================================================================
   LOVE ADMIN — Verificações (Operação › Verificações)

   Fila única do que precisa de aprovação manual, para evitar fraude:
     • Identidade do anfitrião (Carteira › Contas bancárias, antes da primeira
       conta): nome, CPF, chave Pix e documento com foto (RG, CNH ou
       passaporte, frente e verso). Tabela verificacoes_identidade (086),
       arquivos no bucket privado "documentos".
     • Conta bancária do anfitrião: cada conta cadastrada nasce "em análise"
       em clientes.dados_saque.contas.
     • Verificação do fornecedor (Hub › Configurações › Segurança): Cartão
       CNPJ, CNH/RG do sócio e inscrição municipal. Tabela verificacoes_conta
       (070), arquivos no bucket privado "verificacao". Aprovar marca
       fornecedores.conta_verificada (trigger da 070).

   O + da linha abre a solicitação na mesma caixa da tabela, com os dados,
   as conferências automáticas e os documentos; Aprovar ou Reprovar (com o
   motivo, que aparece para a pessoa).
   ========================================================================== */

let ITENS = [];
let CLIENTES = new Map();
let FORNECEDORES = new Map();
let IDENTIDADES = new Map();

const TIPOS = {
  identidade: 'Identidade · saque',
  conta: 'Conta bancária',
  empresa: 'Verificação da empresa'
};
const SITUACAO = {
  em_analise: ['Em análise', 'badge-warning'],
  aprovado: ['Aprovado', 'badge-success'],
  recusado: ['Reprovado', '']
};
const PIX = { cpf: 'CPF', cnpj: 'CNPJ', email: 'E-mail', telefone: 'Telefone', aleatoria: 'Chave aleatória' };
const TIPO_CONTA = { corrente: 'Corrente', poupanca: 'Poupança', pagamento: 'Pagamento' };
const DOC_TIPO = { rg: 'RG', cnh: 'CNH', passaporte: 'Passaporte' };
// Como foram os documentos para a conta digital no Asaas (api/_documentos-asaas.js).
const ASAAS = {
  enviado: 'Enviados para o Asaas',
  link: 'O Asaas pediu pelo link dele (o anfitrião faz na Carteira)',
  aguardando_conta: 'Vão para o Asaas quando a conta digital abrir (na primeira compra)',
  sem_pendencia: 'O Asaas não pediu documentos',
  erro: 'Não foi possível enviar ao Asaas'
};

const soDigitos = v => String(v || '').replace(/\D/g, '');
const normalizarNome = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const formatarCpf = v => { const d = soDigitos(v); return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : (v || '—'); };
const formatarCnpj = v => { const d = soDigitos(v); return d.length === 14 ? d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : (v || '—'); };

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

/* -------------------------------------------------------------- Carregar */

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;
  renderLoading(document.getElementById('tbody'), 6);

  document.getElementById('busca').addEventListener('input', render);
  document.getElementById('filtro-status').addEventListener('change', render);
  document.getElementById('filtro-tipo').addEventListener('change', render);

  await carregar();
});

async function carregar() {
  const [identidades, empresas, clientes, fornecedores] = await Promise.all([
    safeSelect('verificacoes_identidade', '*'),
    safeSelect('verificacoes_conta', '*'),
    safeSelect('clientes', 'id, email, full_name, first_name, last_name, couple_name, cpf, phone, data_nascimento, dados_saque, created_at'),
    safeSelect('fornecedores', 'id, company_name, razao_social, email, cnpj, document_type, pix_key, pix_key_type, conta_verificada, created_at')
  ]);

  CLIENTES = new Map(clientes.data.map(c => [c.id, c]));
  FORNECEDORES = new Map(fornecedores.data.map(f => [f.id, f]));
  IDENTIDADES = new Map(identidades.data.map(v => [v.cliente_id, v]));

  const nomeDoCliente = c => c?.full_name || [c?.first_name, c?.last_name].filter(Boolean).join(' ') || c?.couple_name || c?.email || 'Anfitrião';

  const deIdentidade = identidades.data.map(v => ({
    chave: `identidade:${v.cliente_id}`,
    tipo: 'identidade',
    papel: 'Anfitrião',
    nome: v.nome || nomeDoCliente(CLIENTES.get(v.cliente_id)),
    documento: formatarCpf(v.cpf),
    status: v.status,
    motivo: v.motivo,
    em: v.updated_at || v.created_at,
    bruto: v
  }));

  // Só a última verificação de cada fornecedor importa.
  const ultimas = new Map();
  empresas.data.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .forEach(v => { if (!ultimas.has(v.fornecedor_id)) ultimas.set(v.fornecedor_id, v); });
  const deEmpresa = [...ultimas.values()].map(v => {
    const f = FORNECEDORES.get(v.fornecedor_id);
    return {
      chave: `empresa:${v.id}`,
      tipo: 'empresa',
      papel: 'Fornecedor',
      nome: f?.company_name || f?.razao_social || f?.email || 'Fornecedor',
      documento: f?.document_type === 'cpf' ? formatarCpf(f?.cnpj) : formatarCnpj(f?.cnpj),
      status: { aprovada: 'aprovado', recusada: 'recusado' }[v.status] || v.status,
      motivo: v.motivo,
      em: v.analisado_em || v.created_at,
      bruto: v
    };
  });

  const deConta = [];
  clientes.data.forEach(c => {
    (c.dados_saque?.contas || []).forEach(conta => {
      if (conta.metodo !== 'ted') return;
      const t = conta.ted || {};
      deConta.push({
        chave: `conta:${c.id}:${conta.id}`,
        tipo: 'conta',
        papel: 'Anfitrião',
        nome: t.titular || nomeDoCliente(c),
        documento: `${t.banco_codigo ? `${t.banco_codigo} ` : ''}${t.banco || 'Banco'} · Ag. ${t.agencia || '—'} · ${t.conta || '—'}${t.digito ? `-${t.digito}` : ''}`,
        status: conta.status || 'em_analise',
        motivo: conta.motivo,
        em: conta.analisadaEm || conta.criadaEm || c.created_at,
        bruto: { cliente: c, conta }
      });
    });
  });

  ITENS = [...deIdentidade, ...deEmpresa, ...deConta];
  renderKpis();
  render();
}

/* ---------------------------------------------------------------- Lista */

function renderKpis() {
  const conta = s => ITENS.filter(i => i.status === s).length;
  const tile = (label, valor, sub) => `<div class="kpi"><p class="kpi-label">${label}</p><p class="kpi-value">${valor}</p><p class="kpi-sub">${sub}</p></div>`;
  document.getElementById('kpi-grid').innerHTML = [
    tile('Em análise', formatNumber(conta('em_analise')), 'Aguardando aprovação manual'),
    tile('Aprovadas', formatNumber(conta('aprovado')), 'Liberadas para sacar ou receber'),
    tile('Reprovadas', formatNumber(conta('recusado')), 'A pessoa precisa reenviar')
  ].join('');
}

function filtrar() {
  const termo = document.getElementById('busca').value.trim().toLowerCase();
  const status = document.getElementById('filtro-status').value;
  const tipo = document.getElementById('filtro-tipo').value;
  return ITENS.filter(i => {
    if (status && i.status !== status) return false;
    if (tipo && i.tipo !== tipo) return false;
    if (!termo) return true;
    return [i.nome, i.documento, i.papel, TIPOS[i.tipo]].some(v => String(v || '').toLowerCase().includes(termo));
  });
}

function render() {
  const tbody = document.getElementById('tbody');
  // Em análise primeiro (as mais antigas no topo: quem espera há mais tempo);
  // depois o resto, das mais recentes para as mais antigas.
  const lista = filtrar().sort((a, b) =>
    (a.status === 'em_analise' ? 0 : 1) - (b.status === 'em_analise' ? 0 : 1) ||
    (a.status === 'em_analise' ? new Date(a.em) - new Date(b.em) : new Date(b.em) - new Date(a.em)));

  if (!lista.length) {
    renderEmpty(tbody, 6, 'Nenhuma solicitação', ITENS.length ? 'Nada encontrado com esses filtros.' : 'Quando um anfitrião ou fornecedor enviar documentos, a solicitação aparece aqui.');
    return;
  }

  tbody.innerHTML = lista.map(i => {
    const [rotulo, classe] = SITUACAO[i.status] || SITUACAO.em_analise;
    return `
      <tr>
        <td class="cell-muted">${escapeHtml(formatDateTime(i.em))}</td>
        <td><span class="cell-strong">${escapeHtml(i.nome)}</span><span class="cell-sub">${escapeHtml(i.papel)}</span></td>
        <td>${escapeHtml(TIPOS[i.tipo])}</td>
        <td class="cell-muted">${escapeHtml(i.documento)}</td>
        <td>${badge(rotulo, classe)}</td>
        <td class="col-acoes">${botaoVerMais(i.chave)}</td>
      </tr>`;
  }).join('');

  ligarAcoesDaLinha(tbody, abrir);
}

/* -------------------------------------------------------------- Detalhe */

const ALVO = () => ({
  host: document.getElementById('visao-verificacao'),
  esconder: [document.querySelector('.table-card'), document.getElementById('header-actions')]
});

const linhaDado = (rotulo, valor) => `<div class="dados-linha"><span class="rotulo">${escapeHtml(rotulo)}</span><span class="valor">${valor}</span></div>`;

/** Conferências automáticas: ajudam, mas quem decide é quem olha o documento. */
function conferencias(lista) {
  if (!lista.length) return '';
  return `
    <p class="drawer-section-title">Conferências automáticas</p>
    <ul class="verif-checks">
      ${lista.map(([texto, ok]) => `
        <li class="${ok === true ? 'is-ok' : ok === false ? 'is-alerta' : ''}">
          ${ok === true
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5l10 -10"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 16v.01"/><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z"/></svg>'}
          <span>${texto}</span>
        </li>`).join('')}
    </ul>`;
}

function blocoDocumentos(arquivos) {
  if (!arquivos.length) return '';
  return `
    <p class="drawer-section-title">Documentos enviados</p>
    <div class="verif-docs">
      ${arquivos.map((a, n) => `
        <figure class="verif-doc" data-doc="${n}">
          <div class="verif-doc-vista"><span class="cell-muted">Carregando…</span></div>
          <figcaption>${escapeHtml(a.rotulo)}</figcaption>
        </figure>`).join('')}
    </div>`;
}

/** Arquivos em bucket privado: link assinado por 10 minutos, só para o admin. */
async function carregarDocumentos(host, arquivos) {
  await Promise.all(arquivos.map(async (a, n) => {
    const caixa = host.querySelector(`[data-doc="${n}"] .verif-doc-vista`);
    if (!caixa) return;
    const { data, error } = await supabaseClient.storage.from(a.bucket).createSignedUrl(a.caminho, 600);
    if (error || !data?.signedUrl) {
      caixa.innerHTML = '<span class="cell-muted">Não foi possível abrir o arquivo.</span>';
      return;
    }
    const url = data.signedUrl;
    const pdf = /\.pdf$/i.test(a.caminho);
    caixa.innerHTML = pdf
      ? `<iframe src="${escapeHtml(url)}" title="${escapeHtml(a.rotulo)}"></iframe>`
      : `<img src="${escapeHtml(url)}" alt="${escapeHtml(a.rotulo)}">`;
    const abrirAba = document.createElement('a');
    abrirAba.href = url;
    abrirAba.target = '_blank';
    abrirAba.rel = 'noopener noreferrer';
    abrirAba.className = 'verif-doc-abrir';
    abrirAba.textContent = 'Abrir em tamanho real';
    caixa.after(abrirAba);
  }));
}

function abrir(chave) {
  const item = ITENS.find(i => i.chave === chave);
  if (!item) return;
  const montar = { identidade: detalheIdentidade, conta: detalheConta, empresa: detalheEmpresa }[item.tipo];
  const { corpo, arquivos } = montar(item);
  const [rotulo, classe] = SITUACAO[item.status] || SITUACAO.em_analise;

  Drawer.open({
    emLinha: ALVO(),
    title: item.nome,
    subtitleHtml: `${escapeHtml(TIPOS[item.tipo])} · ${escapeHtml(item.papel)} &nbsp;${badge(rotulo, classe)}`,
    body: `
      ${item.status === 'recusado' && item.motivo ? `<p class="verif-motivo"><strong>Motivo da reprovação:</strong> ${escapeHtml(item.motivo)}</p>` : ''}
      ${corpo}
      ${blocoDocumentos(arquivos)}`,
    footer: `
      <button type="button" class="btn btn-ghost" id="btn-reprovar" ${item.status === 'recusado' ? 'disabled' : ''}>Reprovar</button>
      <button type="button" class="btn btn-primary" id="btn-aprovar" ${item.status === 'aprovado' ? 'disabled' : ''}>Aprovar</button>`
  });

  const host = document.getElementById('visao-verificacao');
  carregarDocumentos(host, arquivos);
  host.querySelector('#btn-aprovar').addEventListener('click', () => decidir(item, 'aprovado'));
  host.querySelector('#btn-reprovar').addEventListener('click', () => decidir(item, 'recusado'));
}

function detalheIdentidade(item) {
  const v = item.bruto;
  const c = CLIENTES.get(v.cliente_id) || {};
  const nomeCadastro = c.full_name || [c.first_name, c.last_name].filter(Boolean).join(' ');
  const corpo = `
    <div class="lista-dados">
      ${linhaDado('Nome enviado', escapeHtml(v.nome || '—'))}
      ${linhaDado('CPF enviado', escapeHtml(formatarCpf(v.cpf)))}
      ${linhaDado('Documento', escapeHtml(DOC_TIPO[v.documento_tipo] || 'RG'))}
      ${linhaDado('Chave Pix', `${escapeHtml(PIX[v.pix_tipo] || v.pix_tipo || '')} · ${escapeHtml(v.pix_chave || '—')}`)}
      ${linhaDado('E-mail da conta', escapeHtml(c.email || '—'))}
      ${linhaDado('Nome no cadastro', escapeHtml(nomeCadastro || '—'))}
      ${linhaDado('CPF no cadastro', escapeHtml(c.cpf ? formatarCpf(c.cpf) : 'Não informado'))}
      ${linhaDado('Data de nascimento', escapeHtml(c.data_nascimento ? formatDate(c.data_nascimento) : 'Não informada'))}
      ${linhaDado('Enviado em', escapeHtml(formatDateTime(v.created_at)))}
      ${v.status === 'aprovado' ? linhaDado('Asaas', escapeHtml(ASAAS[v.asaas_status] || 'Ainda não enviados') + (v.asaas_status === 'erro' && v.asaas_detalhe?.mensagem ? ` <span class="cell-muted">(${escapeHtml(v.asaas_detalhe.mensagem)})</span>` : '')) : ''}
    </div>
    ${conferencias([
      v.selfie ? ['Enviou a selfie segurando o documento: confira se o rosto é o mesmo da foto do documento.', null] : ['Sem selfie (enviado antes da selfie ser pedida). O Asaas pode pedir pelo link dele.', false],
      [cpfValido(v.cpf) ? 'O CPF enviado é válido.' : 'O CPF enviado não é válido.', cpfValido(v.cpf)],
      c.cpf
        ? [soDigitos(c.cpf) === soDigitos(v.cpf) ? 'O CPF é o mesmo do cadastro da conta.' : 'O CPF é diferente do cadastro da conta.', soDigitos(c.cpf) === soDigitos(v.cpf)]
        : ['A conta não tem CPF no cadastro para comparar.', null],
      nomeCadastro
        ? [normalizarNome(nomeCadastro) === normalizarNome(v.nome) ? 'O nome é o mesmo do cadastro da conta.' : 'O nome é diferente do cadastro da conta.', normalizarNome(nomeCadastro) === normalizarNome(v.nome)]
        : ['A conta não tem nome completo no cadastro para comparar.', null],
      v.pix_tipo === 'cpf'
        ? [soDigitos(v.pix_chave) === soDigitos(v.cpf) ? 'A chave Pix é o CPF do titular.' : 'A chave Pix (CPF) é de outra pessoa.', soDigitos(v.pix_chave) === soDigitos(v.cpf)]
        : ['A chave Pix não é o CPF: confira se está no nome do titular.', null],
      ['Confira se o nome, o CPF e a foto do documento batem com os dados acima.', null]
    ])}`;
  return {
    corpo,
    arquivos: [
      { rotulo: 'Documento · frente', bucket: 'documentos', caminho: v.rg_frente },
      { rotulo: 'Documento · verso', bucket: 'documentos', caminho: v.rg_verso },
      { rotulo: 'Selfie segurando o documento', bucket: 'documentos', caminho: v.selfie }
    ].filter(a => a.caminho)
  };
}

function detalheConta(item) {
  const { cliente: c, conta } = item.bruto;
  const t = conta.ted || {};
  const ident = IDENTIDADES.get(c.id);
  const cpfConta = soDigitos(t.cpf);
  const corpo = `
    <div class="lista-dados">
      ${linhaDado('Titular', escapeHtml(t.titular || '—'))}
      ${linhaDado('CPF do titular', escapeHtml(t.cpf ? formatarCpf(t.cpf) : '—'))}
      ${linhaDado('Banco', escapeHtml(t.banco ? `${t.banco_codigo ? `${t.banco_codigo} · ` : ''}${t.banco}` : '—'))}
      ${linhaDado('Agência', escapeHtml(t.agencia || '—'))}
      ${linhaDado('Conta', escapeHtml(t.conta ? `${t.conta}${t.digito ? `-${t.digito}` : ''}` : '—'))}
      ${linhaDado('Tipo de conta', escapeHtml(TIPO_CONTA[t.tipo] || t.tipo || '—'))}
      ${linhaDado('Natureza', t.natureza === 'pj' ? 'Pessoa jurídica' : 'Pessoa física')}
      ${linhaDado('E-mail da conta Love', escapeHtml(c.email || '—'))}
      ${linhaDado('Cadastrada em', escapeHtml(formatDateTime(conta.criadaEm)))}
    </div>
    ${conferencias([
      ident
        ? [ident.status === 'aprovado' ? 'A identidade do anfitrião já foi aprovada.' : 'A identidade do anfitrião ainda não foi aprovada: aprove os documentos antes da conta.', ident.status === 'aprovado']
        : ['O anfitrião não enviou os documentos de identidade.', false],
      ident && cpfConta
        ? [cpfConta === soDigitos(ident.cpf) ? 'A conta está no CPF do titular verificado.' : 'A conta está em outro CPF.', cpfConta === soDigitos(ident.cpf)]
        : ['Sem CPF do titular para comparar.', null],
      t.natureza === 'pj' ? ['Conta de pessoa jurídica: o saque só pode ir para conta no CPF do anfitrião.', false] : ['Conta de pessoa física.', true],
      t.tipo === 'pagamento' ? ['Conta de pagamento: o Asaas só transfere para conta corrente ou poupança (ou por Pix).', false] : null,
      t.banco_codigo && t.digito ? ['Banco com código e conta com dígito: no formato que o Asaas pede para transferir.', true] : ['Cadastrada no formato antigo (sem código do banco ou dígito): peça para cadastrar de novo antes do primeiro saque.', false]
    ].filter(Boolean))}`;
  return { corpo, arquivos: [] };
}

function detalheEmpresa(item) {
  const v = item.bruto;
  const f = FORNECEDORES.get(v.fornecedor_id) || {};
  const docs = v.documentos || {};
  const corpo = `
    <div class="lista-dados">
      ${linhaDado('Empresa', escapeHtml(f.company_name || '—'))}
      ${linhaDado('Razão social', escapeHtml(f.razao_social || '—'))}
      ${linhaDado(f.document_type === 'cpf' ? 'CPF' : 'CNPJ', escapeHtml(f.document_type === 'cpf' ? formatarCpf(f.cnpj) : formatarCnpj(f.cnpj)))}
      ${linhaDado('E-mail', escapeHtml(f.email || '—'))}
      ${linhaDado('Chave Pix', f.pix_key ? `${escapeHtml(PIX[f.pix_key_type] || f.pix_key_type || '')} · ${escapeHtml(f.pix_key)}` : 'Não cadastrada')}
      ${linhaDado('Enviado em', escapeHtml(formatDateTime(v.created_at)))}
    </div>
    ${conferencias([
      [soDigitos(f.cnpj).length === 14 ? 'O fornecedor tem CNPJ no cadastro.' : 'O fornecedor não tem CNPJ válido no cadastro.', soDigitos(f.cnpj).length === 14],
      f.pix_key_type === 'cnpj' && f.pix_key
        ? [soDigitos(f.pix_key) === soDigitos(f.cnpj) ? 'A chave Pix é o CNPJ da empresa.' : 'A chave Pix (CNPJ) é de outra empresa.', soDigitos(f.pix_key) === soDigitos(f.cnpj)]
        : [f.pix_key ? 'A chave Pix não é o CNPJ: confira se está no nome da empresa.' : 'Ainda sem chave Pix para receber.', null],
      ['Confira se o Cartão CNPJ é da empresa acima e se o sócio do documento aparece no quadro societário.', null]
    ])}`;
  return {
    corpo,
    arquivos: [
      { rotulo: 'Cartão CNPJ', bucket: 'verificacao', caminho: docs.cnpj },
      { rotulo: 'CNH ou RG do sócio', bucket: 'verificacao', caminho: docs.socio },
      { rotulo: 'Inscrição municipal', bucket: 'verificacao', caminho: docs.inscricao_municipal }
    ].filter(a => a.caminho)
  };
}

/* -------------------------------------------------------------- Decidir */

async function decidir(item, status) {
  let motivo = null;
  if (status === 'recusado') {
    motivo = await pedirTexto({
      titulo: 'Reprovar solicitação',
      texto: 'Escreva o motivo. Ele aparece para a pessoa, que pode enviar de novo.',
      placeholder: 'Ex.: a foto do documento está ilegível',
      rotulo: 'Reprovar'
    });
    if (motivo === null) return;
    motivo = motivo.trim() || 'Os dados ou documentos não puderam ser confirmados. Envie de novo.';
  }

  Drawer.setFooterBusy(true);
  const agora = new Date().toISOString();
  let erro = null;

  if (item.tipo === 'identidade') {
    ({ error: erro } = await supabaseClient.from('verificacoes_identidade')
      .update({ status, motivo, updated_at: agora }).eq('cliente_id', item.bruto.cliente_id));
  } else if (item.tipo === 'empresa') {
    ({ error: erro } = await supabaseClient.from('verificacoes_conta')
      .update({ status: status === 'aprovado' ? 'aprovada' : 'recusada', motivo, analisado_em: agora })
      .eq('id', item.bruto.id));
  } else {
    // Conta bancária: muda só a conta escolhida dentro de dados_saque.
    const { cliente, conta } = item.bruto;
    const atual = await supabaseClient.from('clientes').select('dados_saque').eq('id', cliente.id).maybeSingle();
    erro = atual.error;
    if (!erro) {
      const dados = atual.data?.dados_saque || {};
      const contas = (dados.contas || []).map(x => x.id === conta.id ? { ...x, status, motivo, analisadaEm: agora } : x);
      const primeira = contas[0];
      const novo = { ...dados, contas, ...(primeira ? { metodo: primeira.metodo, pix: primeira.pix, ted: primeira.ted } : {}) };
      ({ error: erro } = await supabaseClient.from('clientes').update({ dados_saque: novo }).eq('id', cliente.id));
    }
  }

  Drawer.setFooterBusy(false);
  if (erro) {
    toast(`Não foi possível salvar: ${erro.message}`);
    return;
  }
  if (status === 'aprovado' && item.tipo === 'identidade') {
    const r = await mandarAoAsaas(item.bruto.cliente_id);
    toast(`Identidade aprovada. ${ASAAS[r] || 'Os documentos vão para o Asaas na próxima abertura da Carteira.'}.`);
  } else {
    toast(status === 'aprovado' ? 'Solicitação aprovada.' : 'Solicitação reprovada.');
  }
  Drawer.close();
  await carregar();
  refreshVerificacoesBadge();
}

/** Aprovou a identidade: o servidor manda os mesmos documentos para o Asaas. */
async function mandarAoAsaas(clienteId) {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const r = await fetch('https://love.com.br/api/verificacao-asaas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({ cliente_id: clienteId })
    });
    const j = await r.json().catch(() => ({}));
    return j.situacao || null;
  } catch {
    return null;
  }
}
