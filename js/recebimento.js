// Aviso em Meus presentes: "finalize seu cadastro para receber os presentes".
//
// Regra da Love (api/_recebimento.js): a conta digital do anfitrião
// (subconta no Asaas, que tem custo) só abre na primeira compra de um
// convidado, com os dados de Suas informações (nome, CPF, celular,
// nascimento, renda e endereço — tabela clientes, migration 099). Enquanto
// faltar algum, este aviso aparece acima da busca de presentes e leva para
// Suas informações. Com tudo preenchido, não aparece nada.
//
// API: window.LoveRecebimento.atualizar()
(function () {
  'use strict';

  const OBRIGATORIOS = ['first_name', 'last_name', 'cpf', 'phone', 'data_nascimento', 'renda_mensal', 'cep', 'endereco', 'endereco_numero', 'bairro'];

  function cadastroCompleto(perfil) {
    return OBRIGATORIOS.every(k => perfil[k] != null && String(perfil[k]).trim() !== '');
  }

  function atualizar() {
    const el = document.getElementById('recebimento-aviso');
    const perfil = window.loveClienteProfile;
    if (!el || !perfil) return;
    // Sem as colunas da migration 099 (ainda não rodou): não mostra nada.
    if (!('data_nascimento' in perfil) || cadastroCompleto(perfil)) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    el.innerHTML = `
      <div class="rc-aviso">
        <div class="rc-aviso-texto">
          <p class="rc-aviso-titulo">Finalize seu cadastro para receber os presentes</p>
        </div>
        <div class="rc-aviso-acao"><button type="button" class="rc-botao" data-rc-finalizar>Finalizar cadastro</button></div>
      </div>`;
  }

  document.addEventListener('click', (e) => {
    const alvo = e.target instanceof Element ? e.target : null;
    if (alvo && alvo.closest('[data-rc-finalizar]') && typeof window.loveAbrirSuasInformacoes === 'function') window.loveAbrirSuasInformacoes();
  });

  // Atualiza sempre que Meus presentes aparece na tela.
  function observar() {
    const painel = document.getElementById('gifts-panel-products');
    if (!painel || !('IntersectionObserver' in window)) return;
    new IntersectionObserver((itens) => { if (itens.some(i => i.isIntersecting)) atualizar(); }).observe(painel);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observar);
  else observar();

  window.LoveRecebimento = { atualizar };
})();
