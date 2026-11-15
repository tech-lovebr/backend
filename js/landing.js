// Landing pública (#view-public-site): carrossel da abertura, quadros que
// mudam sozinhos (convidados, presentes), modelos e cores do convite, mesas,
// saldo da carteira, polaroides e perguntas frequentes. Tudo com prefixo lv-.
(function () {
  function iniciar() {
    var raiz = document.getElementById('view-public-site');
    if (!raiz || !raiz.querySelector('.lv-hero')) return;
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var ingles = document.documentElement.classList.contains('love-en-domain');
    var $ = function (s) { return raiz.querySelector(s); };
    var $$ = function (s) { return Array.prototype.slice.call(raiz.querySelectorAll(s)); };
    var visivel = function () { return raiz.offsetParent !== null || getComputedStyle(raiz).display !== 'none'; };
    var trocarTexto = function (el, b, s) {
      if (!el) return;
      el.classList.add('lv-out');
      setTimeout(function () { el.querySelector('b').textContent = b; el.querySelector('small').textContent = s; el.classList.remove('lv-out'); }, 450);
    };

    // Âncoras internas rolam suave sem mexer no endereço da página.
    raiz.addEventListener('click', function (ev) {
      var a = ev.target.closest('a[href^="#"]');
      if (!a || !raiz.contains(a)) return;
      var alvo = document.getElementById(a.getAttribute('href').slice(1));
      if (!alvo) return;
      ev.preventDefault();
      alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Cabeçalho ganha fundo ao rolar.
    var nav = $('#lv-nav');
    var aoRolar = function () { if (nav) nav.classList.toggle('lv-on', window.scrollY > 40); };
    window.addEventListener('scroll', aoRolar, { passive: true }); aoRolar();

    // Fotos da abertura: um tipo de evento por vez.
    var fotos = $$('#lv-slides > img'), pontos = $$('#lv-slides .lv-dots i'), rotulo = $('#lv-slab'), si = 0;
    var nomeDaFoto = function (img) { return (ingles && img.dataset.tEn) || img.dataset.t; };
    if (rotulo && fotos[0]) rotulo.textContent = nomeDaFoto(fotos[0]);
    if (!reduce && fotos.length > 1) setInterval(function () {
      if (!visivel()) return;
      fotos[si].classList.remove('lv-on'); pontos[si].classList.remove('lv-on');
      si = (si + 1) % fotos.length;
      fotos[si].classList.add('lv-on'); pontos[si].classList.add('lv-on'); rotulo.textContent = nomeDaFoto(fotos[si]);
    }, 5000);

    // Brilho que segue o cursor.
    var hero = $('#lv-hero'), brilho = $('#lv-glow');
    if (!reduce && hero && brilho) hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      brilho.style.left = ((e.clientX - r.left) / r.width * 100) + '%';
      brilho.style.top = ((e.clientY - r.top) / r.height * 100) + '%';
    });

    // Quadros da abertura.
    var h1 = [['Ana confirmou presença', '128 de 150 convidados'], ['Tio Carlos confirmou presença', '129 de 150 convidados'], ['Rafa e Bia confirmaram', '131 de 150 convidados']];
    var h2 = [['Novo presente recebido', 'R$ 250,00 via Pix · agora'], ['Novo presente recebido', 'R$ 120,00 no cartão · agora'], ['Vaquinha da lua de mel', 'R$ 6.120 de R$ 9.000']];
    var hi = 0;
    if (!reduce && !ingles) setInterval(function () {
      if (!visivel()) return;
      hi = (hi + 1) % 3;
      trocarTexto($('#lv-hs1'), h1[hi][0], h1[hi][1]);
      setTimeout(function () { trocarTexto($('#lv-hs2'), h2[hi][0], h2[hi][1]); }, 900);
    }, 3400);

    // Convite: um botão por tipo de evento; cada um mostra o seu exemplo
    // (texto, nomes, data e estilo). Passa sozinho até a pessoa tocar.
    var inv = $('#lv-inv'), modelos = $$('#lv-tpls .lv-tpl');
    if (inv && modelos.length) {
      var demo = [
        { k: 'Vamos nos casar', a: 'Marina', b: 'Pedro', d: '2027-06-12' },
        { k: 'Vem comemorar comigo', a: 'Rafael', b: '', d: '2027-01-30' },
        { k: 'Bodas de ouro', a: 'Lourdes', b: 'Antônio', d: '2027-09-05' },
        { k: 'Chá de fraldas', a: 'Lia', b: '', d: '2027-02-14' }
      ];
      var auto = !reduce, di = 0;
      var slug = function (v) { return v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); };
      var usarModelo = function (i) {
        modelos.forEach(function (x, j) { x.classList.toggle('lv-on', j === i); x.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
        inv.classList.remove('lv-t-monograma', 'lv-t-classico', 'lv-t-moderno', 'lv-t-data');
        inv.classList.add('lv-t-' + modelos[i].dataset.t);
      };
      var mostrar = function (x) {
        inv.classList.toggle('lv-solo', !x.b);
        $('#lv-kick').textContent = x.k;
        var n = $('#lv-names'); n.textContent = ''; n.append(x.a);
        if (x.b) { var em = document.createElement('em'); em.textContent = '&'; n.append(em, x.b); }
        $('#lv-i1').textContent = x.a[0]; $('#lv-i2').textContent = x.b ? x.b[0] : '';
        var u = slug(x.b ? x.a + ' e ' + x.b : x.k.split(' ').slice(-2).join(' ') + ' ' + x.a);
        $('#lv-pub').textContent = 'love.com.br/' + u;
        var d = new Date(x.d + 'T16:30:00-03:00'), p = function (v) { return String(v).padStart(2, '0'); };
        $('#lv-date').textContent = p(d.getDate()) + ' · ' + p(d.getMonth() + 1) + ' · ' + d.getFullYear();
        $('#lv-big').textContent = p(d.getDate()) + '.' + p(d.getMonth() + 1);
        var dias = Math.ceil((d - Date.now()) / 864e5);
        $('#lv-left').textContent = dias > 1 ? 'faltam ' + dias + ' dias' : 'é hoje';
      };
      var passo = function (k) { inv.style.opacity = '.3'; setTimeout(function () { usarModelo(k); mostrar(demo[k]); inv.style.opacity = '1'; }, 250); };
      modelos.forEach(function (b, i) { b.addEventListener('click', function () { auto = false; di = i; passo(i); }); });
      usarModelo(0); mostrar(demo[0]);
      setInterval(function () { if (auto && visivel()) { di = (di + 1) % demo.length; passo(di); } }, 3800);
    }

    // Convidados confirmando.
    var pendentes = $$('#lv-gl .lv-p1'), k = 0, c = 128;
    var avisos = [['Tio Carlos confirmou presença', 'Agora são 129 convidados'], ['Rafa e Bia confirmaram', 'Agora são 131 convidados']];
    var contar = function () { $('#lv-cnt').textContent = c; $('#lv-cbar').style.width = (c / 150 * 100) + '%'; };
    if (!reduce && pendentes.length) setInterval(function () {
      if (!visivel()) return;
      if (k >= pendentes.length) {
        pendentes.forEach(function (p) { var st = p.querySelector('.lv-st'); st.className = 'lv-st'; st.textContent = 'Aguardando'; p.querySelector('small').textContent = 'Aguardando resposta'; });
        k = 0; c = 128; contar(); trocarTexto($('#lv-ct'), 'Ana confirmou presença', 'Agora são 128 convidados'); return;
      }
      var el = pendentes[k], mais = k === 1 ? 2 : 1, st = el.querySelector('.lv-st');
      st.className = 'lv-st lv-ok'; st.textContent = mais > 1 ? 'Confirmados' : 'Confirmado';
      el.querySelector('small').textContent = mais > 1 ? '2 pessoas · sem restrição' : '1 pessoa · sem restrição';
      c += mais; contar(); trocarTexto($('#lv-ct'), avisos[k][0], avisos[k][1]); k++;
    }, 2800);

    // Presentes e vaquinha.
    var presentes = [['Novo presente recebido', 'R$ 250,00 via Pix · agora', 6120], ['Novo presente recebido', 'R$ 400,00 via Pix · agora', 6520], ['Novo presente recebido', 'R$ 150,00 no cartão · agora', 6670]];
    var gi = 0;
    var vaquinha = function (v) {
      var pc = Math.round(v / 9000 * 100);
      $('#lv-vbar').style.width = pc + '%'; $('#lv-vpct').textContent = pc + '%';
      $('#lv-vval').textContent = 'R$ ' + v.toLocaleString('pt-BR') + ' de R$ 9.000';
    };
    if (!reduce && $('#lv-gt')) setInterval(function () {
      if (!visivel()) return;
      gi = (gi + 1) % presentes.length;
      var g = presentes[gi];
      trocarTexto($('#lv-gt'), g[0], g[1]);
      setTimeout(function () { vaquinha(g[2]); }, 400);
    }, 3600);

    // Mesas: lugares em volta e a dica ao passar.
    $$('#lv-floor .lv-tbl').forEach(function (t) {
      var ocupados = t.classList.contains('lv-full') ? 8 : +t.dataset.n[0];
      for (var i = 0; i < 8; i++) {
        var a = i / 8 * Math.PI * 2 - Math.PI / 2, s = document.createElement('i');
        s.className = 'lv-seat';
        s.style.left = (35 + Math.cos(a) * 43 - 5.5) + 'px';
        s.style.top = (35 + Math.sin(a) * 43 - 5.5) + 'px';
        if (i >= ocupados) s.style.background = '#E3E8EE';
        t.appendChild(s);
      }
      var dica = function () { var tip = $('#lv-tip'); tip.textContent = ''; var b = document.createElement('b'); b.textContent = t.dataset.t; tip.append(b, ' · ' + t.dataset.n); };
      ['mouseenter', 'focus', 'click'].forEach(function (ev) { t.addEventListener(ev, dica); });
    });

    // Carteira: olho esconde o saldo.
    var olho = $('#lv-eye'), saldo = $('#lv-saldo');
    if (olho && saldo) olho.addEventListener('click', function () {
      var on = saldo.classList.toggle('lv-hide');
      olho.setAttribute('aria-pressed', on ? 'true' : 'false');
      olho.setAttribute('aria-label', on ? 'Mostrar saldo' : 'Ocultar saldo');
    });

    // Ao entrar na tela: check desenhado e saldo contando.
    if ('IntersectionObserver' in window && !reduce) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target;
          if (el.id === 'lv-check') { el.classList.remove('lv-draw'); void el.offsetWidth; el.classList.add('lv-draw'); }
          if (el.id === 'lv-saldo') {
            var fim = 12480, t0 = performance.now();
            var f = function (agora) {
              var q = Math.min(1, (agora - t0) / 1100), v = fim * (1 - Math.pow(1 - q, 3));
              el.textContent = 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              if (q < 1) requestAnimationFrame(f);
            };
            requestAnimationFrame(f);
          }
          io.unobserve(el);
        });
      }, { threshold: 0.6 });
      ['#lv-check', '#lv-saldo'].forEach(function (s) { var el = $(s); if (el) io.observe(el); });
    }

    // Polaroides: uma de cada vez levanta.
    var polas = $$('#lv-polas .lv-pola'), ci = 0;
    if (!reduce && polas.length) setInterval(function () {
      if (!visivel()) return;
      polas.forEach(function (x, j) { x.classList.toggle('lv-on', j === ci); });
      ci = (ci + 1) % polas.length;
    }, 2200);

    // Perguntas frequentes: uma aberta por vez.
    $$('#lv-faq .lv-qa').forEach(function (q) {
      q.querySelector('button').addEventListener('click', function () {
        var abrir = !q.classList.contains('lv-open');
        $$('#lv-faq .lv-qa').forEach(function (o) { o.classList.remove('lv-open'); o.querySelector('button').setAttribute('aria-expanded', 'false'); });
        if (abrir) { q.classList.add('lv-open'); q.querySelector('button').setAttribute('aria-expanded', 'true'); }
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
