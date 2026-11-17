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

    // Convite: um botão por tipo de evento; cada um mostra o modelo de
    // convite que a plataforma já usa para esse tipo (o padrão salvo no banco
    // ou o modelo pronto do código), desenhado pelo mesmo motor do Convite
    // digital (js/site-builder.js). Passa sozinho até a pessoa tocar.
    var inv = $('#lv-inv'), tela = $('#lv-inv-tela'), modelos = $$('#lv-tpls .lv-tpl');
    if (inv && tela && modelos.length) {
      var exemplos = {
        wedding: { nome: 'Marina & Pedro', data: '2027-06-12', url: 'marina-e-pedro', sobre: 'A cerimônia será no fim da tarde, seguida de jantar e festa. Contamos com você!' },
        birthday: { nome: 'Rafael', data: '2027-01-30', url: 'aniversario-rafael', sobre: 'Vai ter música, comida boa e muita gente querida. Venha comemorar com a gente!' },
        anniversary: { nome: 'Lourdes & Antônio', data: '2027-09-05', url: 'bodas-lourdes-e-antonio', sobre: 'Cinquenta anos juntos merecem uma festa. Será uma alegria ter você com a gente.' },
        baby_shower: { nome: 'Lia', data: '2027-02-14', url: 'cha-da-lia', sobre: 'A Lia está chegando! Venha celebrar esse momento com a gente.' }
      };
      var cacheModelos = {}, auto = !reduce, di = 0, vez = 0;
      var pronto = function () { return typeof window.conviteDoModelo === 'function' && typeof window.renderAnySectionHtml === 'function'; };
      var modeloDo = function (tipo) {
        if (cacheModelos[tipo]) return cacheModelos[tipo];
        cacheModelos[tipo] = (typeof window.templatePadraoDoTipo === 'function' ? window.templatePadraoDoTipo(tipo) : Promise.resolve(null))
          .catch(function () { return null; })
          .then(function (st) {
            if (!st) st = window.conviteDoModelo(tipo, window.variacoesDoTipo(tipo)[0]);
            var ex = exemplos[tipo];
            try { window.ajustarDatasDoTemplate(st, { data: ex.data, hora: '16:30' }); } catch (e) { /* sem data */ }
            try { window.preencherTituloDoTemplate(st, ex.nome); } catch (e) { /* sem título */ }
            // Textos vazios do modelo: o primeiro vira o "Sobre…", o último a assinatura.
            var vazios = [];
            (st.sections || []).forEach(function (s) { (s.columns || []).forEach(function (c) { (c.elements || []).forEach(function (el) { if (el.type === 'texto' && !String(el.content || '').trim()) vazios.push(el); }); }); });
            if (vazios[0]) vazios[0].content = ex.sobre;
            if (vazios.length > 1) vazios[vazios.length - 1].content = ex.nome;
            return st;
          });
        return cacheModelos[tipo];
      };
      var desenhar = function (i) {
        modelos.forEach(function (x, k) { x.classList.toggle('lv-on', k === i); x.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
        var tipo = modelos[i].dataset.t, minha = ++vez;
        if (!pronto()) return;
        inv.style.opacity = '.3';
        modeloDo(tipo).then(function (st) {
          if (minha !== vez) return;
          var gs = st.globalStyle || {};
          tela.style.setProperty('--bx-primary', gs.primaryColor || '#537bae');
          tela.style.setProperty('--bx-radius', (gs.radius !== undefined ? gs.radius : 16) + 'px');
          tela.style.setProperty('--bx-section-spacing', (gs.sectionSpacing !== undefined ? gs.sectionSpacing : 32) + 'px');
          var visiveis = (st.sections || []).filter(function (s) { return !s.hidden; });
          tela.innerHTML = visiveis.map(function (s) { return window.renderAnySectionHtml(s, 'preview', 'mobile'); }).join('') + window.renderFixedFooterHtml();
          var capa = tela.querySelector(':scope > section');
          if (capa) { capa.style.minHeight = '348px'; capa.classList.add('convite-capa'); }
          tela.scrollTop = 0;
          if (typeof window.startCountdownTicker === 'function') window.startCountdownTicker(tela);
          var pub = $('#lv-pub'); if (pub) pub.textContent = 'love.com.br/' + exemplos[tipo].url;
          inv.style.opacity = '1';
        });
      };
      modelos.forEach(function (b, i) { b.addEventListener('click', function () { auto = false; di = i; desenhar(i); }); });
      var comecar = function () { if (pronto()) desenhar(0); else setTimeout(comecar, 300); };
      comecar();
      setInterval(function () { if (auto && visivel()) { di = (di + 1) % modelos.length; desenhar(di); } }, 6000);
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

    // Tudo num só lugar: uma caixa de vidro no tom do primeiro banner passa
    // por cima de cada recurso (Convite digital, Confirmação de presença…),
    // trocando a cada 5 segundos, como um carrossel. Passar o mouse pausa.
    var todos = document.querySelector('#view-public-site .lv-all');
    if (todos) {
      var itensTodos = $$('#view-public-site .lv-all > a');
      var luz = document.createElement('span');
      luz.className = 'lv-all-luz';
      luz.setAttribute('aria-hidden', 'true');
      todos.insertBefore(luz, todos.firstChild);
      todos.classList.add('lv-all-carrossel');
      var ti = 0, pausado = false;
      var marcar = function (i) {
        ti = i;
        var a = itensTodos[i];
        if (!a) return;
        itensTodos.forEach(function (x, k) { x.classList.toggle('lv-all-on', k === i); });
        luz.style.width = a.offsetWidth + 'px';
        luz.style.height = a.offsetHeight + 'px';
        luz.style.setProperty('left', a.offsetLeft + 'px', 'important');
        luz.style.setProperty('top', a.offsetTop + 'px', 'important');
      };
      marcar(0);
      window.addEventListener('resize', function () { marcar(ti); });
      todos.addEventListener('mouseenter', function () { pausado = true; });
      todos.addEventListener('mouseleave', function () { pausado = false; });
      itensTodos.forEach(function (a, k) { a.addEventListener('mouseenter', function () { marcar(k); }); });
      setInterval(function () {
        if (pausado || !visivel()) return;
        marcar((ti + 1) % itensTodos.length);
      }, 5000);
    }

    // Menu (hambúrguer) do topo: abre e fecha; clicar num item, fora ou Esc fecha.
    var burger = $('#lv-burger'), menu = $('#lv-menu');
    if (burger && menu) {
      var abrirMenu = function (abrir) {
        menu.hidden = !abrir;
        burger.setAttribute('aria-expanded', abrir ? 'true' : 'false');
        burger.classList.toggle('lv-aberto', abrir);
        document.getElementById('lv-nav')?.classList.toggle('lv-menu-aberto', abrir);
      };
      burger.addEventListener('click', function (e) { e.stopPropagation(); abrirMenu(menu.hidden); });
      menu.addEventListener('click', function (e) { if (e.target.closest('a, button')) abrirMenu(false); });
      document.addEventListener('click', function (e) { if (!menu.hidden && !menu.contains(e.target) && e.target !== burger) abrirMenu(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) abrirMenu(false); });
    }

    // Título da abertura: "seu casamento" alterna com "seu aniversário",
    // "seu chá de fraldas" e "sua celebração" (data-palavras; em inglês vem
    // do data-en-html). Com movimento reduzido, fica parado no primeiro.
    var giroTitulo = 0;
    setInterval(function () {
      var el = $('.lv-gira');
      if (!el || reduce || document.hidden || !visivel()) return;
      var palavras = (el.getAttribute('data-palavras') || '').split('|').filter(Boolean);
      if (palavras.length < 2) return;
      giroTitulo = (giroTitulo + 1) % palavras.length;
      el.classList.add('lv-gira-sai');
      // Sai devagar (0,7s), troca a palavra e entra devagar; cada uma fica ~4,5s.
      setTimeout(function () { el.textContent = palavras[giroTitulo]; el.classList.remove('lv-gira-sai'); }, 700);
    }, 4500);

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
