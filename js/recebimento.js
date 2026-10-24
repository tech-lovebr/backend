// Recebimento dos presentes (Presentes › Meus presentes).
//
// Regra da Love: a conta digital (subconta no Asaas, que tem custo) só é
// aberta quando o anfitrião já tem convidados na lista E presentes
// adicionados. Aí ele confirma os dados e faz a verificação facial
// (documento + selfie). Antes disso usa a plataforma normalmente.
//
// O aviso acima dos presentes mostra o passo em que ele está:
//   1. Adicione convidados   2. Adicione presentes   3. Ative o recebimento
// e depois: verificação facial pendente, em análise, recusada.
// Ações no servidor: /api/asaas-conta (api/asaas-conta.js).
// Situação: tabela contas_recebimento (migration 098), só leitura aqui.
// API: window.LoveRecebimento.atualizar()
(function () {
  'use strict';

  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const soDigitos = (v) => String(v || '').replace(/\D/g, '');
  const cliente = () => (typeof supabaseClient !== 'undefined' ? supabaseClient : null);

  let conta = null;           // { status, verificacao } | null
  let req = { convidados: 0, presentes: 0 };
  let carregando = false;

  const ICONE_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

  const RENDAS = [
    ['', 'Selecione'], ['1500', 'Até R$ 1.500'], ['3000', 'De R$ 1.500 a R$ 3.000'], ['5000', 'De R$ 3.000 a R$ 5.000'],
    ['10000', 'De R$ 5.000 a R$ 10.000'], ['20000', 'De R$ 10.000 a R$ 20.000'], ['30000', 'Acima de R$ 20.000']
  ];

  async function token() {
    const sb = cliente();
    if (!sb) return null;
    const { data: { session } } = await sb.auth.getSession();
    return session ? session.access_token : null;
  }

  async function chamar(metodo, corpo) {
    const t = await token();
    const r = await fetch('/api/asaas-conta', {
      method: metodo,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t || ''}` },
      body: corpo ? JSON.stringify(corpo) : undefined
    });
    let j = null;
    try { j = await r.json(); } catch (e) { j = null; }
    if (!j) j = { ok: false, erro: 'sem_resposta', mensagem: 'O recebimento ainda não está disponível.' };
    return j;
  }

  // Convidados e presentes do evento ativo + situação da conta.
  async function carregar() {
    const sb = cliente();
    if (!sb || carregando) return;
    carregando = true;
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return;
      const evento = typeof window.getLoveActiveEventId === 'function' ? window.getLoveActiveEventId() : null;
      const ehUuid = /^[0-9a-f-]{36}$/i.test(String(evento || ''));
      const [c, p, ct] = await Promise.all([
        ehUuid ? sb.from('convidados').select('id', { count: 'exact', head: true }).eq('evento_id', evento) : Promise.resolve({ count: 0 }),
        ehUuid ? sb.from('presentes').select('id', { count: 'exact', head: true }).eq('evento_id', evento) : Promise.resolve({ count: 0 }),
        sb.from('contas_recebimento').select('status, onboarding_url, onboarding_expira').eq('cliente_id', session.user.id).maybeSingle()
      ]);
      req = { convidados: c.count || 0, presentes: p.count || 0 };
      // Sem a tabela (migration 098 ainda não rodou): trata como sem conta.
      conta = ct && ct.data ? { status: ct.data.status, verificacao: ct.data.onboarding_url } : null;
      desenhar();
    } finally {
      carregando = false;
    }
  }

  // ------------------------------------------------------------------ Aviso
  function passo(feito, titulo, acao) {
    return `<li class="rc-passo${feito ? ' is-feito' : ''}"><span class="rc-passo-bola">${feito ? ICONE_OK : ''}</span><span>${titulo}</span>${!feito && acao ? acao : ''}</li>`;
  }

  function desenhar() {
    const el = document.getElementById('recebimento-aviso');
    if (!el) return;
    const status = conta ? conta.status : 'inativa';
    if (status === 'aprovada') { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    const pronto = req.convidados > 0 && req.presentes > 0;
    let titulo = 'Receba os presentes em dinheiro';
    let texto = 'Quando os convidados comprarem um presente, o valor cai na sua Carteira e você saca por Pix.';
    let botao = '';
    let passos = '';
    if (status === 'inativa' || status === 'erro' || status === 'criando') {
      passos = `<ol class="rc-passos">
        ${passo(req.convidados > 0, 'Adicione convidados', '<button type="button" class="rc-link" data-rc-ir="convidados">Adicionar</button>')}
        ${passo(req.presentes > 0, 'Adicione presentes', '<button type="button" class="rc-link" data-rc-ir="presentes">Adicionar</button>')}
        ${passo(false, 'Ative o recebimento e confirme sua identidade')}
      </ol>`;
      botao = pronto ? '<button type="button" class="rc-botao" data-rc-ativar>Ativar recebimento</button>' : '';
      if (status === 'erro') texto = 'Não conseguimos abrir sua conta. Confira os dados e tente de novo.';
    } else if (status === 'documentos') {
      titulo = 'Falta a verificação facial';
      texto = 'Tire uma foto do seu documento e uma selfie para confirmar que a conta é sua. Leva cerca de 2 minutos.';
      botao = '<button type="button" class="rc-botao" data-rc-verificar>Fazer verificação</button>';
    } else if (status === 'em_analise') {
      titulo = 'Estamos confirmando sua conta';
      texto = 'Recebemos sua verificação. A confirmação leva até 48 horas e avisamos você por aqui.';
    } else if (status === 'recusada') {
      titulo = 'Não conseguimos confirmar sua conta';
      texto = 'Faça a verificação de novo com um documento legível e boa iluminação na selfie.';
      botao = '<button type="button" class="rc-botao" data-rc-verificar>Fazer verificação de novo</button>';
    }
    el.innerHTML = `
      <div class="rc-aviso">
        <div class="rc-aviso-texto">
          <p class="rc-aviso-titulo">${titulo}</p>
          <p class="rc-aviso-sub">${texto}</p>
          ${passos}
        </div>
        ${botao ? `<div class="rc-aviso-acao">${botao}</div>` : ''}
      </div>`;
  }

  // ------------------------------------------------------------------ Pop-up
  function campo(nome, rotulo, controle, largura) {
    return `<label class="rc-campo${largura ? ` ${largura}` : ''}"><span class="rc-rotulo">${rotulo}</span>${controle}<span class="rc-erro" data-rc-erro="${nome}" hidden></span></label>`;
  }

  function abrirPopup() {
    fecharPopup();
    const fundo = document.createElement('div');
    fundo.className = 'rc-fundo';
    fundo.id = 'rc-popup';
    fundo.innerHTML = `
      <div class="rc-popup" role="dialog" aria-modal="true" aria-labelledby="rc-popup-titulo">
        <div class="rc-popup-corpo" data-rc-etapa="dados">
          <h3 id="rc-popup-titulo" class="rc-popup-titulo">Ativar recebimento</h3>
          <p class="rc-popup-sub">Esses dados abrem a sua conta digital na Love, onde caem os presentes. Use os dados de quem vai sacar.</p>
          <form class="rc-form" novalidate>
            ${campo('nome', 'Nome completo', '<input type="text" name="nome" autocomplete="name" maxlength="120">', 'rc-inteiro')}
            ${campo('cpf', 'CPF', '<input type="text" name="cpf" inputmode="numeric" autocomplete="off" maxlength="14" placeholder="000.000.000-00">')}
            ${campo('nascimento', 'Data de nascimento', '<input type="date" name="nascimento">')}
            ${campo('celular', 'Celular', '<input type="tel" name="celular" inputmode="tel" autocomplete="tel" maxlength="15" placeholder="(11) 99999-9999">')}
            ${campo('renda', 'Renda mensal', `<select name="renda">${RENDAS.map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select>`)}
            ${campo('cep', 'CEP', '<input type="text" name="cep" inputmode="numeric" autocomplete="postal-code" maxlength="9" placeholder="00000-000">')}
            ${campo('endereco', 'Endereço', '<input type="text" name="endereco" autocomplete="address-line1" maxlength="120">')}
            ${campo('numero', 'Número', '<input type="text" name="numero" maxlength="20">')}
            ${campo('complemento', 'Complemento (opcional)', '<input type="text" name="complemento" maxlength="60">')}
            ${campo('bairro', 'Bairro', '<input type="text" name="bairro" maxlength="80">', 'rc-inteiro')}
          </form>
          <p class="rc-erro-geral" hidden></p>
          <p class="rc-nota">Os pagamentos são processados pelo Asaas, instituição de pagamento autorizada pelo Banco Central.</p>
          <div class="rc-rodape">
            <button type="button" class="rc-cancelar" data-rc-fechar>Cancelar</button>
            <button type="button" class="rc-botao" data-rc-enviar>Continuar</button>
          </div>
        </div>
        <div class="rc-popup-corpo" data-rc-etapa="verificar" hidden>
          <h3 class="rc-popup-titulo">Verificação facial</h3>
          <p class="rc-popup-sub">Para confirmar que a conta é sua, tire uma foto do seu documento (RG ou CNH) e uma selfie. Leva cerca de 2 minutos e abre numa nova aba.</p>
          <p class="rc-preparando" data-rc-preparando>Preparando a verificação…</p>
          <p class="rc-erro-geral" data-rc-erro-verificar hidden></p>
          <div class="rc-rodape">
            <button type="button" class="rc-cancelar" data-rc-fechar>Fazer depois</button>
            <button type="button" class="rc-botao" data-rc-abrir-verificacao disabled>Fazer verificação</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(fundo);
    document.body.style.overflow = 'hidden';
    const form = fundo.querySelector('form');
    // Máscaras e CEP.
    form.cpf.addEventListener('input', () => { const d = soDigitos(form.cpf.value).slice(0, 11); form.cpf.value = d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); });
    form.celular.addEventListener('input', () => { const d = soDigitos(form.celular.value).slice(0, 11); form.celular.value = d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d; });
    form.cep.addEventListener('input', async () => {
      const d = soDigitos(form.cep.value).slice(0, 8);
      form.cep.value = d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
      if (d.length !== 8) return;
      try {
        const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
        const j = await r.json();
        if (j && !j.erro) {
          if (!form.endereco.value) form.endereco.value = j.logradouro || '';
          if (!form.bairro.value) form.bairro.value = j.bairro || '';
          if (form.endereco.value) form.numero.focus();
        }
      } catch (e) { /* sem internet ou CEP não encontrado: preenche à mão */ }
    });
    form.addEventListener('input', (e) => { const n = e.target && e.target.name; const er = n && fundo.querySelector(`[data-rc-erro="${n}"]`); if (er) er.hidden = true; });
    preencherCpfConhecido(form);
    setTimeout(() => form.nome.focus(), 50);
  }

  // Se ele já fez a verificação da Carteira, reaproveita nome e CPF.
  async function preencherCpfConhecido(form) {
    const sb = cliente();
    if (!sb) return;
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return;
    const { data } = await sb.from('verificacoes_identidade').select('nome, cpf').eq('cliente_id', session.user.id).maybeSingle();
    if (data) {
      if (!form.nome.value) form.nome.value = data.nome || '';
      if (!form.cpf.value) { form.cpf.value = data.cpf || ''; form.cpf.dispatchEvent(new Event('input')); }
    }
  }

  function fecharPopup() {
    const p = document.getElementById('rc-popup');
    if (p) { p.remove(); document.body.style.overflow = ''; }
  }

  async function enviar() {
    const fundo = document.getElementById('rc-popup');
    if (!fundo) return;
    const form = fundo.querySelector('form');
    const geral = fundo.querySelector('[data-rc-etapa="dados"] .rc-erro-geral');
    const botao = fundo.querySelector('[data-rc-enviar]');
    const dados = Object.fromEntries(new FormData(form).entries());
    // Conferência rápida aqui; o servidor confere de novo.
    const erros = {};
    if (String(dados.nome || '').trim().split(/\s+/).length < 2) erros.nome = 'Escreva o nome completo.';
    if (soDigitos(dados.cpf).length !== 11) erros.cpf = 'CPF com 11 dígitos.';
    if (!dados.nascimento) erros.nascimento = 'Informe a data de nascimento.';
    if (soDigitos(dados.celular).length !== 11) erros.celular = 'Celular com DDD.';
    if (!dados.renda) erros.renda = 'Escolha a renda mensal.';
    if (soDigitos(dados.cep).length !== 8) erros.cep = 'CEP com 8 dígitos.';
    ['endereco', 'numero', 'bairro'].forEach(k => { if (!String(dados[k] || '').trim()) erros[k] = 'Obrigatório.'; });
    if (mostrarErros(fundo, erros)) return;
    geral.hidden = true;
    botao.disabled = true;
    botao.textContent = 'Abrindo sua conta…';
    const r = await chamar('POST', { acao: 'ativar', dados });
    botao.disabled = false;
    botao.textContent = 'Continuar';
    if (!r.ok) {
      if (r.campos) mostrarErros(fundo, r.campos);
      geral.textContent = r.erro === 'dados_invalidos' ? 'Confira os campos marcados.' : (r.mensagem || 'Não foi possível abrir sua conta agora. Tente de novo em instantes.');
      geral.hidden = false;
      return;
    }
    conta = r.conta;
    desenhar();
    irParaVerificacao();
  }

  function mostrarErros(fundo, erros) {
    let primeiro = null;
    Object.entries(erros).forEach(([k, msg]) => {
      const er = fundo.querySelector(`[data-rc-erro="${k}"]`);
      if (er) { er.textContent = msg; er.hidden = false; }
      if (!primeiro) primeiro = fundo.querySelector(`[name="${k}"]`);
    });
    if (primeiro) primeiro.focus();
    return Object.keys(erros).length > 0;
  }

  // O link da verificação fica pronto alguns segundos depois de abrir a conta.
  async function irParaVerificacao() {
    let fundo = document.getElementById('rc-popup');
    if (!fundo) { abrirPopup(); fundo = document.getElementById('rc-popup'); }
    fundo.querySelector('[data-rc-etapa="dados"]').hidden = true;
    fundo.querySelector('[data-rc-etapa="verificar"]').hidden = false;
    const preparando = fundo.querySelector('[data-rc-preparando]');
    const botao = fundo.querySelector('[data-rc-abrir-verificacao]');
    const erro = fundo.querySelector('[data-rc-erro-verificar]');
    if (conta && conta.verificacao) { pronto(); return; }
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, i === 0 ? 4000 : 5000));
      if (!document.getElementById('rc-popup')) return;
      const r = await chamar('POST', { acao: 'verificacao' });
      if (r.ok && r.conta) {
        conta = r.conta;
        if (conta.status === 'aprovada' || conta.status === 'em_analise') { fecharPopup(); desenhar(); return; }
        if (conta.verificacao) { pronto(); return; }
      }
    }
    preparando.hidden = true;
    erro.textContent = 'A verificação ainda não ficou pronta. Feche e clique em "Fazer verificação" daqui a pouco.';
    erro.hidden = false;
    function pronto() {
      preparando.hidden = true;
      botao.disabled = false;
    }
  }

  // ------------------------------------------------------------------ Cliques
  document.addEventListener('click', (e) => {
    const alvo = e.target instanceof Element ? e.target : null;
    if (!alvo) return;
    const w = window;
    if (alvo.closest('[data-rc-ativar]')) { abrirPopup(); return; }
    if (alvo.closest('[data-rc-fechar]')) { fecharPopup(); return; }
    if (alvo.closest('[data-rc-enviar]')) { enviar(); return; }
    if (alvo.closest('[data-rc-verificar]')) { abrirPopup(); irParaVerificacao(); return; }
    if (alvo.closest('[data-rc-abrir-verificacao]')) {
      if (conta && conta.verificacao) window.open(conta.verificacao, '_blank', 'noopener');
      fecharPopup();
      return;
    }
    const ir = alvo.closest('[data-rc-ir]');
    if (ir) {
      if (ir.getAttribute('data-rc-ir') === 'convidados' && w.loveIrPara) w.loveIrPara('rsvp', 'all');
      else document.getElementById('btn-host-add-gift')?.click();
      return;
    }
    if (alvo.id === 'rc-popup') fecharPopup();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.getElementById('rc-popup')) fecharPopup(); });

  // Recarrega quando o aviso aparece na tela (ao abrir Presentes).
  function observar() {
    const el = document.getElementById('recebimento-aviso');
    if (!el || !('IntersectionObserver' in window)) return;
    let ultima = 0;
    new IntersectionObserver((itens) => {
      if (itens.some(i => i.isIntersecting) && Date.now() - ultima > 3000) { ultima = Date.now(); carregar(); }
    }).observe(el.parentElement || el);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observar);
  else observar();

  window.LoveRecebimento = { atualizar: carregar };
})();
