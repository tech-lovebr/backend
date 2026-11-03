/* Carregar tudo junto: a área da página fica escondida (com um indicador
   discreto) até todas as buscas de dados terminarem. Assim a tela aparece
   inteira de uma vez, em vez de ir montando aos pedaços.
   Precisa vir antes do supabase-init.js, para contar também as buscas do Supabase. */
(function () {
  const raiz = document.documentElement;
  raiz.classList.add('carregando-tudo');

  let pendentes = 0;
  let mostrado = false;
  const IGNORAR = /googletagmanager|google-analytics|analytics\.google/;

  const fetchOriginal = window.fetch.bind(window);
  window.fetch = function (entrada, opcoes) {
    const url = typeof entrada === 'string' ? entrada : (entrada && entrada.url) || '';
    if (mostrado || IGNORAR.test(url)) return fetchOriginal(entrada, opcoes);
    pendentes++;
    return fetchOriginal(entrada, opcoes).finally(() => { pendentes--; });
  };

  function mostrar() {
    if (mostrado) return;
    mostrado = true;
    raiz.classList.remove('carregando-tudo');
    window.dispatchEvent(new Event('resize')); // tabelas esticam com a página já visível
  }

  function aindaMontando() {
    return document.querySelector('.admin-content .skeleton, .admin-content .inbox-carregando');
  }

  const inicio = Date.now();
  let quietoDesde = 0;
  function conferir() {
    if (mostrado) return;
    const pronto = document.readyState !== 'loading'
      && (document.body && (document.body.classList.contains('is-ready') || !document.querySelector('.admin-content')));
    if (pronto && pendentes === 0 && !aindaMontando()) {
      if (!quietoDesde) quietoDesde = Date.now();
      if (Date.now() - quietoDesde >= 200) return mostrar();
    } else {
      quietoDesde = 0;
    }
    if (Date.now() - inicio > 12000) return mostrar(); // nunca prende a tela
    setTimeout(conferir, 50);
  }
  conferir();
})();
