/* ==========================================================================
   LOVE B2B — Financeiro › Contas bancárias.
   O mesmo fluxo e a mesma identidade da Carteira Digital do love.com.br:
   1) sem documentos: aviso "Antes de adicionar uma conta bancária, envie
      seus documentos" (ilustração + Enviar documentos);
   2) faixa azul "Complete as etapas…" com o cartão de instruções
      (Voltar / Começar) e, depois, o cartão com os dados e os documentos
      (Cartão CNPJ, documento do sócio frente/verso, selfie e chave Pix);
   3) com os documentos enviados: "Contas cadastradas" (tabela) e o cadastro
      da conta dentro da caixa (banco, agência, tipo, conta, dígito).
   Documentos: verificacoes_conta + bucket privado "verificacao" (migration
   070, o Admin analisa). Contas: fornecedores.dados_saque (migration 098).
   ========================================================================== */
(function () {
  const raiz = () => document.getElementById('carteira-raiz');
  let verificacao = null;
  let verificacaoCarregada = false;
  let contas = [];
  let etapa = '';          // '' | 'intro' | 'form'
  let cadastrando = false;
  let docTipo = 'rg';
  const arquivos = { cnpj: null, frente: null, verso: null, selfie: null };

  const esc = s => (typeof escapeHtml === 'function' ? escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s));
  const soDigitos = v => String(v || '').replace(/\D/g, '');
  const mascaraCnpj = v => soDigitos(v).slice(0, 14).replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');

  const SITUACOES_CONTA = { em_analise: 'Em análise', aprovado: 'Aprovada', recusado: 'Recusada' };
  const TIPOS_DE_CONTA = { corrente: 'Corrente', poupanca: 'Poupança', pagamento: 'Pagamento' };
  const NATUREZAS = { pj: 'Pessoa jurídica', pf: 'Pessoa física' };
  const BANCOS = [
    ['001', 'Banco do Brasil'], ['341', 'Itaú'], ['237', 'Bradesco'], ['104', 'Caixa Econômica Federal'], ['033', 'Santander'],
    ['260', 'Nubank'], ['077', 'Inter'], ['336', 'C6 Bank'], ['290', 'PagBank'], ['323', 'Mercado Pago'], ['380', 'PicPay'],
    ['212', 'Banco Original'], ['208', 'BTG Pactual'], ['102', 'XP Investimentos'], ['756', 'Sicoob'], ['748', 'Sicredi'],
    ['041', 'Banrisul'], ['070', 'BRB'], ['004', 'Banco do Nordeste'], ['021', 'Banestes'], ['047', 'Banese'], ['422', 'Safra'],
    ['623', 'Banco Pan'], ['121', 'Agibank'], ['536', 'Neon'], ['197', 'Stone'], ['403', 'Cora'], ['461', 'Asaas'],
    ['218', 'BS2'], ['637', 'Sofisa'], ['389', 'Mercantil do Brasil'], ['707', 'Daycoval'], ['136', 'Unicred']
  ];

  const ILUSTRACAO_DOCUMENTOS = `
    <svg viewBox="0 0 140 140" aria-hidden="true">
      <circle cx="70" cy="70" r="64" fill="#EBF4FF"/>
      <circle cx="70" cy="70" r="52" fill="none" stroke="#CFE0F5" stroke-width="2"/>
      <rect x="40" y="30" width="60" height="76" rx="8" fill="#183b54"/>
      <rect x="49" y="39" width="42" height="26" rx="5" fill="#27394f"/>
      <circle cx="70" cy="48" r="7" fill="#FFFFFF"/>
      <path d="M58 64a12 9 0 0 1 24 0Z" fill="#FFFFFF"/>
      <rect x="50" y="73" width="40" height="3.5" rx="1.75" fill="#FFFFFF" opacity=".85"/>
      <rect x="50" y="81" width="32" height="3.5" rx="1.75" fill="#FFFFFF" opacity=".85"/>
      <rect x="50" y="89" width="36" height="3.5" rx="1.75" fill="#FFFFFF" opacity=".85"/>
      <circle cx="94" cy="100" r="15" fill="#FFFFFF"/>
      <circle cx="94" cy="100" r="12" fill="#2F9E62"/>
      <path d="m88.5 100.2 3.8 3.8 7.4-7.6" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  const ICONE_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  const ICONE_ENVIAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>';

  /* -------------------- Dados -------------------- */
  async function sessao() { return window.b2bSession || (await supabaseClient.auth.getSession()).data.session; }

  async function carregar() {
    const s = await sessao();
    if (!s) return;
    const fid = empresaId(s);
    const [v, f] = await Promise.all([
      supabaseClient.from('verificacoes_conta').select('status, motivo, documentos, created_at').eq('fornecedor_id', fid).order('created_at', { ascending: false }).limit(1),
      supabaseClient.from('fornecedores').select('dados_saque, pix_key, pix_key_type').eq('id', fid).maybeSingle()
    ]);
    verificacao = (!v.error && v.data && v.data[0]) || null;
    verificacaoCarregada = true;
    const dados = (!f.error && f.data && f.data.dados_saque) || {};
    contas = Array.isArray(dados.contas) ? dados.contas : [];
    // Chave Pix antiga (Configurações › Dados bancários) entra como conta Pix.
    if (!contas.length && f.data && f.data.pix_key) {
      contas = [{ id: 'pix', metodo: 'pix', pix: { tipo: f.data.pix_key_type, chave: f.data.pix_key }, status: 'aprovado' }];
    }
    window.b2bTemContaBancaria = contas.some(c => c.status !== 'recusado');
  }
  const documentosEnviados = () => !!verificacao && verificacao.status !== 'recusada';

  /* -------------------- Desenho -------------------- */
  function htmlAviso() {
    const recusada = verificacao && verificacao.status === 'recusada';
    return `
      <section class="cart-caixa cart-docs-aviso">
        <div class="cart-docs-ilustra">${ILUSTRACAO_DOCUMENTOS}</div>
        <div class="cart-docs-texto">
          <h3>${recusada ? 'Seus documentos precisam ser enviados de novo' : 'Antes de adicionar uma conta bancária, envie seus documentos'}</h3>
          <p>${recusada && verificacao.motivo ? esc(verificacao.motivo) : 'Para adicionar uma conta e sacar os valores disponíveis, é necessário verificar a sua empresa.'}</p>
          <button type="button" class="cart-btn-escuro" data-cb-etapa="intro">${recusada ? 'Enviar novamente' : 'Enviar documentos'}</button>
        </div>
      </section>`;
  }

  function htmlVerificacao() {
    const p = (typeof B2B_DATA !== 'undefined' && B2B_DATA.professional) || {};
    const passaporte = docTipo === 'passaporte';
    const corpo = etapa === 'form' ? `
        <h4 class="cart-verif-titulo">Dados da empresa e documentos</h4>
        <div class="cart-form-grade">
          <label class="cart-campo cart-campo-largo"><span>Razão social</span><input type="text" data-cb-campo="nome" value="${esc(p.razaoSocial || p.company || '')}" autocomplete="organization"></label>
          <label class="cart-campo"><span>CNPJ</span><input type="text" data-cb-campo="cnpj" inputmode="numeric" maxlength="18" placeholder="00.000.000/0000-00" value="${esc(p.documentNumber ? mascaraCnpj(p.documentNumber) : '')}" autocomplete="off"></label>
          <label class="cart-campo"><span>Documento do sócio</span>
            <select data-cb-campo="docTipo">
              <option value="rg"${docTipo === 'rg' ? ' selected' : ''}>RG</option>
              <option value="cnh"${docTipo === 'cnh' ? ' selected' : ''}>CNH</option>
              <option value="passaporte"${passaporte ? ' selected' : ''}>Passaporte</option>
            </select>
          </label>
        </div>
        <div class="cart-verif-arquivos">
          <label class="cart-arquivo${arquivos.cnpj ? ' tem-arquivo' : ''}" data-cb-arquivo="cnpj">
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" data-cb-doc="cnpj">
            ${ICONE_ENVIAR}<b>Cartão CNPJ</b><span data-cb-nome="cnpj">${arquivos.cnpj ? esc(arquivos.cnpj.name) : 'PDF, JPEG ou PNG'}</span>
          </label>
          <label class="cart-arquivo${arquivos.frente ? ' tem-arquivo' : ''}" data-cb-arquivo="frente">
            <input type="file" accept="image/jpeg,image/png,image/webp" data-cb-doc="frente">
            ${ICONE_ENVIAR}<b data-cb-frente-rotulo>${passaporte ? 'Página com foto do passaporte' : 'Frente do documento do sócio'}</b><span data-cb-nome="frente">${arquivos.frente ? esc(arquivos.frente.name) : 'Foto em JPEG ou PNG'}</span>
          </label>
          <label class="cart-arquivo${arquivos.verso ? ' tem-arquivo' : ''}" data-cb-arquivo="verso"${passaporte ? ' hidden' : ''}>
            <input type="file" accept="image/jpeg,image/png,image/webp" data-cb-doc="verso">
            ${ICONE_ENVIAR}<b>Verso do documento do sócio</b><span data-cb-nome="verso">${arquivos.verso ? esc(arquivos.verso.name) : 'Foto em JPEG ou PNG'}</span>
          </label>
          <label class="cart-arquivo${arquivos.selfie ? ' tem-arquivo' : ''}" data-cb-arquivo="selfie">
            <input type="file" accept="image/jpeg,image/png,image/webp" capture="user" data-cb-doc="selfie">
            ${ICONE_ENVIAR}<b>Selfie segurando o documento</b><span data-cb-nome="selfie">${arquivos.selfie ? esc(arquivos.selfie.name) : 'Seu rosto e o documento visíveis'}</span>
          </label>
        </div>
        <div class="cart-form-grade">
          <label class="cart-campo"><span>Tipo de chave Pix</span>
            <select data-cb-campo="pixTipo">
              ${[['cnpj', 'CNPJ'], ['cpf', 'CPF'], ['email', 'E-mail'], ['telefone', 'Telefone'], ['aleatoria', 'Chave aleatória']].map(([v, t]) => `<option value="${v}"${(p.pixKeyType || 'cnpj') === v ? ' selected' : ''}>${t}</option>`).join('')}
            </select>
          </label>
          <label class="cart-campo"><span>Chave Pix</span><input type="text" data-cb-campo="pixChave" value="${esc(p.pixKey || '')}" autocomplete="off"></label>
        </div>
        <p class="cart-form-erro" hidden></p>
        <div class="cart-form-acoes">
          <button type="button" class="cart-cancelar" data-cb-etapa="intro">Voltar</button>
          <button type="button" class="cart-btn-escuro" data-cb-enviar>Enviar para análise</button>
        </div>` : `
        <h4 class="cart-verif-titulo">Verificação da empresa e envio de documentos</h4>
        <p class="cart-verif-intro">Antes de começar, confira algumas instruções que podem te ajudar:</p>
        <ul class="cart-verif-lista">
          <li>${ICONE_CHECK}<span>Tenha em mãos o Cartão CNPJ da empresa e o RG ou CNH do sócio (foto da frente e do verso), ou o passaporte (só a página com foto), e tire uma selfie segurando o documento;</span></li>
          <li>${ICONE_CHECK}<span>As fotos devem estar nítidas, sem reflexo e com todos os dados legíveis;</span></li>
          <li>${ICONE_CHECK}<span>As contas que recebem os saques precisam estar no CNPJ da empresa ou no CPF do sócio;</span></li>
          <li>${ICONE_CHECK}<span>Informe uma chave Pix da empresa para receber os valores.</span></li>
        </ul>
        <div class="cart-form-acoes">
          <button type="button" class="cart-cancelar" data-cb-etapa="">Voltar</button>
          <button type="button" class="cart-btn-escuro" data-cb-etapa="form">Começar</button>
        </div>`;
    return `
      <section class="cart-caixa cart-verif">
        <div class="cart-verif-faixa">
          <h3>Complete as etapas e tenha seu dinheiro mais seguro na <img src="assets/Love-white-03.png" alt="Love" class="cart-verif-logo"></h3>
          <p>Depois você já vai poder realizar o seu primeiro saque com segurança.</p>
        </div>
        <div class="cart-verif-cartao" data-cb-cartao>${corpo}</div>
      </section>`;
  }

  function htmlFormConta() {
    const p = (typeof B2B_DATA !== 'undefined' && B2B_DATA.professional) || {};
    return `
      <section class="cart-caixa cart-contas cart-contas-form" data-cb-form-conta>
        <div class="cart-contas-topo">
          <div>
            <h3 class="cart-titulo">Cadastrar conta</h3>
            <p class="cart-form-sub">Para onde a Love vai transferir os seus saques.</p>
          </div>
        </div>
        <div class="cart-form-corpo">
          <p class="cart-form-sub cart-titular">Titular: <b>${esc(p.razaoSocial || p.company || 'sua empresa')}</b>${p.documentNumber ? ` · CNPJ ${esc(mascaraCnpj(p.documentNumber))}` : ''}. A conta precisa estar no CNPJ da empresa ou no CPF do sócio.</p>
          <div class="cart-form-grade">
            <label class="cart-campo cart-campo-largo"><span>Banco</span>
              <select data-cb-campo-conta="banco">
                <option value="">Escolha o banco</option>
                ${BANCOS.map(([c, n]) => `<option value="${c}">${c} · ${esc(n)}</option>`).join('')}
              </select>
            </label>
            <label class="cart-campo"><span>Agência (sem dígito)</span><input type="text" data-cb-campo-conta="agencia" inputmode="numeric" maxlength="5" autocomplete="off"></label>
            <label class="cart-campo"><span>Tipo de conta</span>
              <select data-cb-campo-conta="tipo"><option value="corrente">Corrente</option><option value="poupanca">Poupança</option><option value="pagamento">Pagamento</option></select>
            </label>
            <label class="cart-campo"><span>Conta (sem dígito)</span><input type="text" data-cb-campo-conta="conta" inputmode="numeric" maxlength="13" autocomplete="off"></label>
            <label class="cart-campo"><span>Dígito</span><input type="text" data-cb-campo-conta="digito" maxlength="2" autocomplete="off"></label>
            <label class="cart-campo cart-campo-largo"><span>Natureza</span>
              <select data-cb-campo-conta="natureza"><option value="pj">Pessoa jurídica (CNPJ da empresa)</option><option value="pf">Pessoa física (CPF do sócio)</option></select>
            </label>
          </div>
          <p class="cart-form-erro" hidden></p>
          <div class="cart-form-acoes">
            <button type="button" class="cart-cancelar" data-cb-cancelar-conta>Cancelar</button>
            <button type="button" class="cart-btn-escuro" data-cb-salvar-conta>Salvar</button>
          </div>
        </div>
      </section>`;
  }

  function colunas(c) {
    if (c.metodo === 'pix') return { banco: 'Pix', agencia: '—', conta: (c.pix && c.pix.chave) || '—', tipo: 'Chave Pix', natureza: '—' };
    const t = c.ted || {};
    return {
      banco: t.banco ? `${t.banco_codigo ? `${t.banco_codigo} · ` : ''}${t.banco}` : '—',
      agencia: t.agencia || '—',
      conta: t.conta ? `${t.conta}${t.digito ? `-${t.digito}` : ''}` : '—',
      tipo: TIPOS_DE_CONTA[t.tipo] || 'Corrente',
      natureza: NATUREZAS[t.natureza] || 'Pessoa jurídica'
    };
  }

  function htmlContas() {
    if (cadastrando) return htmlFormConta();
    if (etapa) return htmlVerificacao();
    if (!verificacaoCarregada) return '<section class="cart-caixa cart-docs-aviso"><p class="cart-form-sub">Carregando…</p></section>';
    if (!contas.length && !documentosEnviados()) return htmlAviso();
    const emAnalise = verificacao && verificacao.status === 'em_analise';
    return `
      <section class="dash-card cart-caixa cart-contas-tabela">
        <div class="cart-contas-cab">
          <div class="cart-contas-cab-texto">
            <h3 class="cart-titulo">Contas cadastradas</h3>
            ${emAnalise ? '<span class="cart-status cart-status-solicitado">Documentos em análise</span>' : ''}
          </div>
          <button type="button" class="cart-btn-escuro" data-cb-cadastrar>Cadastrar conta</button>
        </div>
        <div class="w-full overflow-x-auto">
          <table class="leads-table w-full">
            <thead><tr><th>Banco</th><th>Agência</th><th>Conta</th><th>Tipo de conta</th><th>Natureza</th><th>Status</th><th class="cart-col-acoes"></th></tr></thead>
            <tbody>${contas.length ? contas.map(c => {
              const k = colunas(c);
              const st = c.status || 'em_analise';
              return `<tr data-cb-conta="${esc(c.id)}">
                <td>${esc(k.banco)}</td><td>${esc(k.agencia)}</td><td>${esc(k.conta)}</td><td>${esc(k.tipo)}</td><td>${esc(k.natureza)}</td>
                <td><span class="cart-status cart-conta-${esc(st)}">${esc(SITUACOES_CONTA[st] || 'Em análise')}</span></td>
                <td class="cart-col-acoes">${c.metodo === 'pix' ? '' : '<button type="button" class="cart-remover" data-cb-remover>Remover</button>'}</td>
              </tr>`;
            }).join('') : '<tr><td colspan="7" class="cart-vazio cart-contas-vazio">Nenhuma conta cadastrada ainda. Cadastre a conta que vai receber os seus saques.</td></tr>'}</tbody>
          </table>
        </div>
      </section>`;
  }

  function desenhar() {
    const r = raiz();
    if (r) r.innerHTML = htmlContas();
  }

  /* -------------------- Ações -------------------- */
  async function gravarContas(lista) {
    const s = await sessao();
    const { error } = await supabaseClient.from('fornecedores').update({ dados_saque: { contas: lista.filter(c => c.metodo !== 'pix') } }).eq('id', empresaId(s));
    return !error;
  }

  async function salvarConta(form) {
    const v = c => String((form.querySelector(`[data-cb-campo-conta="${c}"]`) || { value: '' }).value || '').trim();
    const erro = form.querySelector('.cart-form-erro');
    const falhar = t => { erro.textContent = t; erro.hidden = false; };
    const p = (typeof B2B_DATA !== 'undefined' && B2B_DATA.professional) || {};
    const codigo = v('banco');
    const banco = BANCOS.find(b => b[0] === codigo);
    const ted = {
      banco: banco ? banco[1] : '', banco_codigo: codigo,
      agencia: soDigitos(v('agencia')), conta: soDigitos(v('conta')), digito: v('digito').replace(/[^0-9xX]/g, '').toUpperCase(),
      tipo: v('tipo') || 'corrente', natureza: v('natureza') === 'pf' ? 'pf' : 'pj',
      titular: p.razaoSocial || p.company || '', documento: p.documentNumber || ''
    };
    if (!banco) return falhar('Escolha o banco.');
    if (ted.agencia.length < 3) return falhar('Informe a agência, sem o dígito.');
    if (ted.conta.length < 3) return falhar('Informe o número da conta, sem o dígito.');
    if (!ted.digito) return falhar('Informe o dígito da conta.');
    const nova = { id: `conta-${Date.now()}`, metodo: 'ted', ted, status: 'em_analise', criadaEm: new Date().toISOString() };
    const btn = form.querySelector('[data-cb-salvar-conta]');
    btn.disabled = true; btn.textContent = 'Salvando…';
    const lista = contas.filter(c => c.metodo !== 'pix').concat(nova);
    const ok = await gravarContas(lista);
    btn.disabled = false; btn.textContent = 'Salvar';
    if (!ok) return falhar('Não foi possível salvar agora. Tente de novo.');
    contas = contas.concat(nova);
    window.b2bTemContaBancaria = true;
    cadastrando = false;
    desenhar();
    if (typeof showToast === 'function') showToast('Conta cadastrada. Ela fica em análise até a Love conferir os dados.');
    if (typeof renderFinanceStats === 'function') renderFinanceStats();
  }

  async function removerConta(id) {
    const ok = await confirmarNoHub({ titulo: 'Remover esta conta?', texto: 'Os saques não vão mais para ela.', botao: 'Remover' });
    if (!ok) return;
    const lista = contas.filter(c => c.id !== id);
    if (await gravarContas(lista)) { contas = lista; desenhar(); }
  }

  async function enviarVerificacao() {
    const cartao = document.querySelector('#carteira-raiz [data-cb-cartao]');
    if (!cartao) return;
    const v = c => String((cartao.querySelector(`[data-cb-campo="${c}"]`) || { value: '' }).value || '').trim();
    const erro = cartao.querySelector('.cart-form-erro');
    const falhar = t => { erro.textContent = t; erro.hidden = false; };
    const nome = v('nome');
    const cnpj = soDigitos(v('cnpj'));
    const pixTipo = v('pixTipo') || 'cnpj';
    const pixChave = v('pixChave');
    if (!nome) return falhar('Informe a razão social.');
    if (cnpj.length !== 14) return falhar('CNPJ incompleto.');
    if (!arquivos.cnpj) return falhar('Envie o Cartão CNPJ.');
    if (!arquivos.frente) return falhar(docTipo === 'passaporte' ? 'Envie a página com foto do passaporte.' : 'Envie a frente do documento do sócio.');
    if (docTipo !== 'passaporte' && !arquivos.verso) return falhar('Envie o verso do documento do sócio.');
    if (!arquivos.selfie) return falhar('Envie a selfie segurando o documento.');
    if (!pixChave) return falhar('Informe a chave Pix.');
    const btn = cartao.querySelector('[data-cb-enviar]');
    btn.disabled = true; btn.textContent = 'Enviando…';
    try {
      const s = await sessao();
      const fid = empresaId(s);
      const subir = async (arq, chave) => {
        const ext = arq.type === 'application/pdf' ? 'pdf' : arq.type === 'image/png' ? 'png' : arq.type === 'image/webp' ? 'webp' : 'jpg';
        const caminho = `${s.user.id}/${fid}/${chave}-${Date.now()}.${ext}`;
        const { error } = await supabaseClient.storage.from('verificacao').upload(caminho, arq, { contentType: arq.type || undefined });
        if (error) throw error;
        return caminho;
      };
      const documentos = {
        razao_social: nome, cnpj_numero: cnpj, documento_tipo: docTipo, pix_tipo: pixTipo, pix_chave: pixChave,
        cnpj: await subir(arquivos.cnpj, 'cnpj'),
        socio: await subir(arquivos.frente, 'socio-frente'),
        socio_verso: arquivos.verso && docTipo !== 'passaporte' ? await subir(arquivos.verso, 'socio-verso') : null,
        selfie: await subir(arquivos.selfie, 'selfie')
      };
      const { error } = await supabaseClient.from('verificacoes_conta').insert({ fornecedor_id: fid, documentos });
      if (error) throw error;
      await supabaseClient.from('fornecedores').update({ pix_key: pixChave, pix_key_type: pixTipo }).eq('id', fid);
      if (typeof B2B_DATA !== 'undefined') { B2B_DATA.professional.pixKey = pixChave; B2B_DATA.professional.pixKeyType = pixTipo; }
      verificacao = { status: 'em_analise' };
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Enviar para análise';
      return falhar('Não foi possível enviar agora. Tente de novo.');
    }
    Object.keys(arquivos).forEach(k => { arquivos[k] = null; });
    docTipo = 'rg';
    etapa = '';
    await carregar();
    desenhar();
    if (typeof showToast === 'function') showToast('Documentos enviados para análise. Já pode cadastrar a sua conta bancária.');
    if (typeof renderFinanceStats === 'function') renderFinanceStats();
  }

  /* -------------------- Eventos -------------------- */
  document.addEventListener('click', e => {
    const alvo = e.target instanceof Element ? e.target : null;
    if (!alvo || !alvo.closest('#carteira-raiz')) return;
    const passo = alvo.closest('[data-cb-etapa]');
    if (passo) { etapa = passo.dataset.cbEtapa || ''; desenhar(); raiz()?.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
    if (alvo.closest('[data-cb-enviar]')) { enviarVerificacao(); return; }
    if (alvo.closest('[data-cb-cadastrar]')) {
      if (!documentosEnviados() && !contas.length) { etapa = 'intro'; desenhar(); return; }
      cadastrando = true; desenhar(); return;
    }
    if (alvo.closest('[data-cb-cancelar-conta]')) { cadastrando = false; desenhar(); return; }
    const form = alvo.closest('[data-cb-form-conta]');
    if (form && alvo.closest('[data-cb-salvar-conta]')) { salvarConta(form); return; }
    const remover = alvo.closest('[data-cb-remover]');
    if (remover) removerConta(remover.closest('[data-cb-conta]').dataset.cbConta);
  });
  document.addEventListener('input', e => {
    const el = e.target;
    if (el && el.matches && el.matches('#carteira-raiz [data-cb-campo="cnpj"]')) el.value = mascaraCnpj(el.value);
  });
  document.addEventListener('change', e => {
    const el = e.target;
    if (!el || !el.matches) return;
    if (el.matches('#carteira-raiz [data-cb-campo="docTipo"]')) {
      docTipo = el.value;
      const verso = document.querySelector('#carteira-raiz [data-cb-arquivo="verso"]');
      if (verso) verso.hidden = docTipo === 'passaporte';
      const frente = document.querySelector('#carteira-raiz [data-cb-frente-rotulo]');
      if (frente) frente.textContent = docTipo === 'passaporte' ? 'Página com foto do passaporte' : 'Frente do documento do sócio';
      return;
    }
    if (!el.matches('#carteira-raiz [data-cb-doc]')) return;
    const lado = el.dataset.cbDoc;
    const arq = el.files && el.files[0] ? el.files[0] : null;
    const rotulo = document.querySelector(`#carteira-raiz [data-cb-nome="${lado}"]`);
    const caixa = document.querySelector(`#carteira-raiz [data-cb-arquivo="${lado}"]`);
    const aceitos = lado === 'cnpj' ? /^(image\/(jpeg|png|webp)|application\/pdf)$/ : /^image\/(jpeg|png|webp)$/;
    if (arq && (!aceitos.test(arq.type) || arq.size > 10 * 1024 * 1024)) {
      if (rotulo) rotulo.textContent = lado === 'cnpj' ? 'Use PDF, JPEG ou PNG de até 10 MB' : 'Use uma foto em JPEG ou PNG de até 10 MB';
      el.value = '';
      return;
    }
    arquivos[lado] = arq;
    if (rotulo && arq) rotulo.textContent = arq.name;
    caixa?.classList.toggle('tem-arquivo', !!arq);
  });

  document.addEventListener('DOMContentLoaded', async () => {
    if (!raiz()) return;
    await window.b2bAuthReady;
    await carregar();
    desenhar();
    if (typeof renderFinanceStats === 'function') renderFinanceStats();
  });
})();
