// Dados para receber os presentes (pop-up depois do primeiro presente).
//
// Regra da Love (api/_recebimento.js): o anfitrião preenche os dados ao
// adicionar o primeiro presente, mas nada é aberto ainda. A conta digital
// (subconta no Asaas, que tem custo) só abre na primeira compra de um
// convidado, e só se ele tiver convidados e presentes. A verificação facial
// fica para o primeiro saque.
//
// API: window.LoveRecebimento.pedirDadosSeFaltar()  → abre se ainda não preencheu
//      window.LoveRecebimento.abrir()               → abre para conferir/editar
(function () {
  'use strict';

  const soDigitos = (v) => String(v || '').replace(/\D/g, '');
  const cliente = () => (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
  let jaPerguntou = false; // "Fazer depois": não pergunta de novo nesta visita

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
    try {
      const r = await fetch('/api/asaas-conta', {
        method: metodo,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t || ''}` },
        body: corpo ? JSON.stringify(corpo) : undefined
      });
      return (await r.json().catch(() => null)) || { ok: false };
    } catch (e) {
      return { ok: false };
    }
  }

  async function pedirDadosSeFaltar() {
    const sb = cliente();
    if (!sb || jaPerguntou || document.getElementById('rc-popup')) return;
    const { data, error } = await sb.rpc('tenho_dados_de_recebimento');
    if (error || data !== false) return; // sem a migration 099 ou já preencheu
    jaPerguntou = true;
    abrirPopup();
  }

  async function abrir() {
    abrirPopup();
    const r = await chamar('GET');
    const form = document.querySelector('#rc-popup form');
    if (!form || !r.ok || !r.dados) return;
    Object.entries(r.dados).forEach(([k, v]) => { if (form[k] && !form[k].value) { form[k].value = v || ''; form[k].dispatchEvent(new Event('input')); } });
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
        <div class="rc-popup-corpo">
          <h3 id="rc-popup-titulo" class="rc-popup-titulo">Para receber os presentes</h3>
          <p class="rc-popup-sub">Quando um convidado comprar um presente, o valor cai na sua Carteira e você saca por Pix. Preencha os dados de quem vai receber.</p>
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
          <p class="rc-nota">Os pagamentos são processados pelo Asaas, instituição de pagamento autorizada pelo Banco Central. A confirmação de identidade é pedida só no primeiro saque.</p>
          <div class="rc-rodape">
            <button type="button" class="rc-cancelar" data-rc-fechar>Fazer depois</button>
            <button type="button" class="rc-botao" data-rc-enviar>Salvar</button>
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
          if (form.endereco.value && document.activeElement === form.cep) form.numero.focus();
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
    const geral = fundo.querySelector('.rc-erro-geral');
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
    botao.textContent = 'Salvando…';
    const r = await chamar('POST', { acao: 'dados', dados });
    botao.disabled = false;
    botao.textContent = 'Salvar';
    if (!r.ok) {
      if (r.campos) mostrarErros(fundo, r.campos);
      geral.textContent = r.erro === 'dados_invalidos' ? 'Confira os campos marcados.' : (r.mensagem || 'Não foi possível salvar agora. Tente de novo em instantes.');
      geral.hidden = false;
      return;
    }
    fecharPopup();
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

  // ------------------------------------------------------------------ Cliques
  document.addEventListener('click', (e) => {
    const alvo = e.target instanceof Element ? e.target : null;
    if (!alvo) return;
    if (alvo.closest('[data-rc-fechar]')) { fecharPopup(); return; }
    if (alvo.closest('[data-rc-enviar]')) { enviar(); return; }
    if (alvo.id === 'rc-popup') fecharPopup();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.getElementById('rc-popup')) fecharPopup(); });

  window.LoveRecebimento = { pedirDadosSeFaltar, abrir };
})();
