// Landing do Hub (index.html): blocos surgem ao rolar, os degraus do fluxo
// crescem quando aparecem, âncoras rolam suave e as setas movem o carrossel.
(function () {
  var semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Surgir ao rolar (só esconde se o navegador souber mostrar de volta).
  var alvos = document.querySelectorAll('[data-surge], [data-degraus]');
  if ('IntersectionObserver' in window && !semMovimento) {
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.remove('escondido');
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    alvos.forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight) el.classList.add('escondido');
      else el.classList.remove('escondido');
      obs.observe(el);
    });
  } else {
    alvos.forEach(function (el) { el.classList.remove('escondido'); });
  }

  // Âncoras internas: rolagem suave sem mudar o endereço.
  document.addEventListener('click', function (ev) {
    var a = ev.target instanceof Element ? ev.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var alvo = document.getElementById(a.getAttribute('href').slice(1));
    if (!alvo) return;
    ev.preventDefault();
    alvo.scrollIntoView({ behavior: semMovimento ? 'auto' : 'smooth', block: 'start' });
  });

  // Carrossel "Para quem": setas andam um cartão e se apagam nas pontas.
  var trilho = document.querySelector('[data-trilho]');
  var setas = document.querySelectorAll('[data-seta]');
  if (trilho && setas.length) {
    var passo = function () {
      var cartao = trilho.firstElementChild;
      return cartao ? cartao.getBoundingClientRect().width + 20 : 300;
    };
    var atualizar = function () {
      var fim = trilho.scrollWidth - trilho.clientWidth - 2;
      setas[0].disabled = trilho.scrollLeft <= 2;
      setas[1].disabled = trilho.scrollLeft >= fim;
    };
    setas.forEach(function (b) {
      b.addEventListener('click', function () {
        trilho.scrollBy({ left: Number(b.getAttribute('data-seta')) * passo(), behavior: semMovimento ? 'auto' : 'smooth' });
      });
    });
    trilho.addEventListener('scroll', atualizar, { passive: true });
    window.addEventListener('resize', atualizar);
    atualizar();
  }
})();
