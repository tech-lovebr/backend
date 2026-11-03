// Landing pública (#view-public-site): menu fixo dos painéis acompanha a
// rolagem e as abas de "A diferença está nos detalhes" trocam a foto.
(function () {
  function iniciar() {
    var raiz = document.getElementById('view-public-site');
    if (!raiz) return;

    // Menu dos painéis: marca o painel que está no meio da tela.
    var links = raiz.querySelectorAll('.lp2-paineis-menu a');
    if (links.length && 'IntersectionObserver' in window) {
      var porId = {};
      links.forEach(function (a) { porId[a.getAttribute('href').slice(1)] = a; });
      var obs = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          if (!e.isIntersecting) return;
          links.forEach(function (a) { a.classList.remove('ativo'); });
          var a = porId[e.target.id];
          if (a) a.classList.add('ativo');
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      raiz.querySelectorAll('.lp2-painel').forEach(function (p) { obs.observe(p); });
    }

    // Âncoras internas rolam suave sem mexer no endereço da página.
    raiz.addEventListener('click', function (ev) {
      var a = ev.target.closest('a[href^="#"]');
      if (!a || !raiz.contains(a)) return;
      var alvo = document.getElementById(a.getAttribute('href').slice(1));
      if (!alvo) return;
      ev.preventDefault();
      alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Abas dos detalhes.
    var foto = raiz.querySelector('.lp2-detalhes-foto img');
    raiz.querySelectorAll('.lp2-aba').forEach(function (aba) {
      aba.addEventListener('click', function () {
        if (aba.classList.contains('ativo')) return;
        raiz.querySelectorAll('.lp2-aba').forEach(function (b) {
          b.classList.toggle('ativo', b === aba);
          b.setAttribute('aria-selected', b === aba ? 'true' : 'false');
        });
        if (!foto) return;
        var nova = aba.getAttribute('data-foto');
        var pre = new Image();
        pre.onload = function () {
          foto.classList.add('trocando');
          setTimeout(function () { foto.src = nova; foto.classList.remove('trocando'); }, 200);
        };
        pre.src = nova;
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
