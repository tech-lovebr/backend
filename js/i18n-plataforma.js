/**
 * LOVE — planwithlove.com: a plataforma logada inteira em inglês.
 *
 * A plataforma é escrita em português (HTML e JS). No planwithlove.com este
 * arquivo troca, na tela, cada texto da interface pela versão em inglês do
 * dicionário js/i18n-plataforma-en.js — inclusive o que aparece depois
 * (listas, pop-ups, menus), observando a página. No love.com.br não faz nada
 * e o dicionário nem é baixado.
 *
 * - Texto exato: "Salvar" → "Save".
 * - Texto com partes que mudam: "Faltam {x} dias" → "{x} days left".
 * - Também traduz placeholder, title, aria-label, data-dica e alt.
 * - Nunca traduz o que a pessoa escreveu: o convite e o Save the Date no
 *   editor, campos de texto e o que estiver dentro de [data-love-sem-traducao].
 * - LoveI18nPlataforma.original(el) devolve o texto em português de um
 *   elemento (para código que compara rótulos).
 *
 * Teste local: localStorage 'love-teste-en' = '1' em localhost.
 */
(function () {
  var ehIngles = false;
  try {
    ehIngles = /(^|\.)planwithlove\.com$/i.test(location.hostname) ||
      (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && localStorage.getItem('love-teste-en') === '1');
  } catch (e) {}
  var originais = new WeakMap(); // nó de texto → texto em português

  window.LoveI18nPlataforma = {
    ativo: ehIngles,
    traduzir: function (s) { return typeof traduzirTexto === 'function' ? traduzirTexto(s) : null; },
    original: function (el) {
      if (!el) return '';
      if (!ehIngles) return el.textContent || '';
      var s = '';
      var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      var n;
      while ((n = w.nextNode())) s += originais.has(n) ? originais.get(n) : n.nodeValue;
      return s;
    }
  };
  if (!ehIngles) return;

  document.documentElement.lang = 'en';
  var script = document.createElement('script');
  script.src = 'js/i18n-plataforma-en.js?v=20261123_en24';
  script.onload = iniciar;
  (document.head || document.documentElement).appendChild(script);

  // Áreas com conteúdo da pessoa (nada é traduzido ali dentro).
  var IGNORAR = '#view-public-site, #builder-canvas, .std-bolha, [contenteditable="true"], [contenteditable=""], script, style, code, pre, [data-love-sem-traducao]';
  var ATRIBUTOS = ['placeholder', 'title', 'aria-label', 'data-dica', 'alt'];
  var exato = Object.create(null);
  var padroes = [];
  var cache = new Map();

  function normalizar(s) { return s.replace(/\s+/g, ' ').trim(); }
  function escapar(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function prepararDicionario(dic) {
    Object.keys(dic).forEach(function (pt) {
      var en = dic[pt];
      if (typeof en !== 'string' || !en || en === pt) return;
      var chave = normalizar(pt);
      if (chave.indexOf('{x}') === -1) { exato[chave] = en; return; }
      var partes = chave.split('{x}');
      // Só pedaços fixos com letras viram padrão (evita casar qualquer coisa).

      // Padrão curto e solto dos dois lados ("{x} de {x}", "{x} para {x}")
      // casaria frases que a pessoa escreveu: só vale com números nas partes
      // que mudam ("0 de 36" → "0 of 36").
      var letrasFixas = partes.join('').replace(/[^A-Za-zÀ-ú]/g, '').length;
      var soNumeros = partes[0] === '' && partes[partes.length - 1] === '' && letrasFixas < 12;
      if (letrasFixas < 2 || (!soNumeros && !/[A-Za-zÀ-ú]{3,}/.test(partes.join('')))) return;
      padroes.push({ re: new RegExp('^' + partes.map(escapar).join('(.+?)') + '$'), en: en, fixo: partes.join('').length, soNumeros: soNumeros });
    });
    // Padrões mais específicos (mais texto fixo) primeiro.
    padroes.sort(function (a, b) { return b.fixo - a.fixo; });
  }

  function traduzirTexto(s) {
    if (!s) return null;
    var chave = normalizar(s);
    if (!chave || !/[A-Za-zÀ-ú]/.test(chave)) return null;
    if (cache.has(chave)) return cache.get(chave);
    var en = exato[chave] || traduzirData(chave);
    if (!en && chave.length < 400) {
      for (var i = 0; i < padroes.length; i++) {
        var m = padroes[i].re.exec(chave);
        if (!m) continue;
        if (padroes[i].soNumeros && m.slice(1).some(function (g) { return !/^[\d\s.,:/%+()R$-]+$/.test(g); })) continue;
        var k = 1;
        en = padroes[i].en.replace(/\{x\}/g, function () { var v = m[k++]; return v == null ? '' : (traduzirTexto(v) || v); });
        break;
      }
    }
    cache.set(chave, en);
    return en;
  }

  // Datas escritas em português ("sábado, 18 de outubro de 2025 às 16:30 —
  // até 23:30") → "Saturday, October 18, 2025 at 16:30 — until 23:30".
  var MESES = { janeiro: 'January', fevereiro: 'February', 'março': 'March', marco: 'March', abril: 'April', maio: 'May', junho: 'June', julho: 'July', agosto: 'August', setembro: 'September', outubro: 'October', novembro: 'November', dezembro: 'December',
    jan: 'Jan', fev: 'Feb', mar: 'Mar', abr: 'Apr', mai: 'May', jun: 'Jun', jul: 'Jul', ago: 'Aug', set: 'Sep', out: 'Oct', nov: 'Nov', dez: 'Dec' };
  var DIAS = { domingo: 'Sunday', 'segunda-feira': 'Monday', 'terça-feira': 'Tuesday', 'quarta-feira': 'Wednesday', 'quinta-feira': 'Thursday', 'sexta-feira': 'Friday', 'sábado': 'Saturday',
    segunda: 'Monday', 'terça': 'Tuesday', quarta: 'Wednesday', quinta: 'Thursday', sexta: 'Friday' };
  var RE_MES = '(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\\.?';
  var RE_DATA = new RegExp('\\b(\\d{1,2}) de ' + RE_MES + '(?: de (\\d{4}))?', 'i');
  function traduzirData(s) {
    if (!RE_DATA.test(s)) return null;
    var resto = s.replace(new RegExp('\\b(\\d{1,2}) de ' + RE_MES + '(?: de (\\d{4}))?', 'gi'), function (_, d, mes, ano) {
      var m = MESES[mes.toLowerCase()] || mes;
      return m + ' ' + Number(d) + (ano ? ', ' + ano : '');
    });
    // (\b não funciona com letras acentuadas: usa início/espaço/pontuação.)
    var palavra = function (lista) { return new RegExp('(^|[\\s,(—-])(' + lista + ')(?=$|[\\s,.)—-])', 'gi'); };
    resto = resto.replace(palavra('domingo|segunda-feira|terça-feira|quarta-feira|quinta-feira|sexta-feira|sábado|segunda|terça|quarta|quinta|sexta'), function (_, a, w) {
      return a + (DIAS[w.toLowerCase()] || w);
    });
    var trocas = { 'às': 'at', 'até': 'until', 'das': 'from', 'hoje': 'Today', 'ontem': 'Yesterday' };
    resto = resto.replace(palavra('às|até|das|hoje|ontem'), function (_, a, w) { return a + trocas[w.toLowerCase()]; });
    // Só aceita se não sobrou português (senão era uma frase com uma data no meio).
    return /[ãõçáéíóúâêô]|\b(de|do|da|para|com|que|e)\b/i.test(resto) ? null : resto;
  }

  function comEspacos(original, en) {
    var ini = original.match(/^\s*/)[0];
    var fim = original.match(/\s*$/)[0];
    return ini + en + fim;
  }

  function ignorado(el) {
    try { return !!(el && el.closest && el.closest(IGNORAR)); } catch (e) { return false; }
  }

  function traduzirNoDeTexto(n) {
    var pai = n.parentElement;
    if (!pai || ignorado(pai) || pai.tagName === 'TEXTAREA') return;
    var fixo = pai.closest('[data-love-en]');
    if (fixo) { var enFixo = fixo.getAttribute('data-love-en'); if (fixo.textContent !== enFixo) fixo.textContent = enFixo; return; }
    var valor = n.nodeValue;
    var en = traduzirTexto(valor);
    if (!en) return;
    var novo = comEspacos(valor, en);
    if (novo === valor) return;
    originais.set(n, valor);
    n.nodeValue = novo;
  }

  function traduzirAtributos(el) {
    if (ignorado(el)) return;
    for (var i = 0; i < ATRIBUTOS.length; i++) {
      var a = ATRIBUTOS[i];
      var v = el.getAttribute(a);
      if (!v) continue;
      var en = traduzirTexto(v);
      if (en && en !== v) el.setAttribute(a, en);
    }
    if (el.tagName === 'INPUT' && /^(button|submit|reset)$/i.test(el.type) && el.value) {
      var ev = traduzirTexto(el.value);
      if (ev && ev !== el.value) el.value = ev;
    }
    if (el.tagName === 'OPTION' && el.firstChild == null && el.label) {
      var el2 = traduzirTexto(el.label);
      if (el2) el.label = el2;
    }
  }

  function traduzirArvore(raiz) {
    if (!raiz) return;
    if (raiz.nodeType === 3) { traduzirNoDeTexto(raiz); return; }
    if (raiz.nodeType !== 1 && raiz.nodeType !== 11) return;
    if (raiz.nodeType === 1) {
      if (ignorado(raiz)) return;
      traduzirAtributos(raiz);
    }
    // Palavra com sentido diferente conforme o lugar ("Início" = Home no
    // menu, Start na data): o HTML diz qual é com data-love-en.
    if (raiz.querySelectorAll) raiz.querySelectorAll('[data-love-en]').forEach(function (el) {
      var en = el.getAttribute('data-love-en');
      if (el.textContent !== en) { if (el.firstChild && el.firstChild.nodeType === 3) originais.set(el.firstChild, el.textContent); el.textContent = en; }
    });
    if (raiz.nodeType === 1 && raiz.hasAttribute && raiz.hasAttribute('data-love-en')) {
      var enRaiz = raiz.getAttribute('data-love-en');
      if (raiz.textContent !== enRaiz) raiz.textContent = enRaiz;
      return;
    }
    var w = document.createTreeWalker(raiz, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (n.nodeType === 1 && n.matches && n.matches(IGNORAR)) return NodeFilter.FILTER_REJECT;
        // Campo de texto: traduz o placeholder, nunca o que foi digitado.
        if (n.nodeType === 1 && n.tagName === 'TEXTAREA') { traduzirAtributos(n); return NodeFilter.FILTER_REJECT; }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) traduzirNoDeTexto(n);
      else traduzirAtributos(n);
    }
  }

  var pendentes = new Set();
  var agendado = false;
  function agendar(no) {
    pendentes.add(no);
    if (agendado) return;
    agendado = true;
    Promise.resolve().then(function () {
      agendado = false;
      var lista = Array.from(pendentes);
      pendentes.clear();
      lista.forEach(traduzirArvore);
      traduzirTitulo();
    });
  }

  function traduzirTitulo() {
    var en = traduzirTexto(document.title);
    if (en && en !== document.title) document.title = en;
  }

  function iniciar() {
    if (!document.body) { document.addEventListener('DOMContentLoaded', iniciar, { once: true }); return; }
    prepararDicionario(window.LOVE_PLATAFORMA_EN || {});
    traduzirArvore(document.body);
    traduzirTitulo();
    new MutationObserver(function (mudancas) {
      for (var i = 0; i < mudancas.length; i++) {
        var m = mudancas[i];
        if (m.type === 'childList') m.addedNodes.forEach(agendar);
        else if (m.type === 'characterData') agendar(m.target);
        else if (m.type === 'attributes') agendar(m.target);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATRIBUTOS });
    var tituloEl = document.querySelector('title');
    if (tituloEl) new MutationObserver(traduzirTitulo).observe(tituloEl, { childList: true, characterData: true, subtree: true });
  }
})();
