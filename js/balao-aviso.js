/* ==========================================================================
   LOVE — Balão de aviso (notificação em formato "balão", migration 114)

   Cartão no canto inferior esquerdo, ao lado da barra lateral: imagem à
   esquerda, título, texto e um botão. Criado no Admin em CMS › Notificações
   › Nova notificação › Formato: Balão.

   Mostra um balão por vez (o mais recente que a pessoa ainda não viu).
   Fechar ou clicar no botão chama aoVer(id), que grava a leitura — assim o
   balão não volta.

   Mesmo arquivo em js/balao-aviso.js (anfitriões) e B2B/js/balao-aviso.js
   (Hub): mudou um, copie para o outro.

   Uso:
     LoveBalao.mostrar(notificacoes, {
       aoVer: id => ...,                  // grava a leitura
       abrirLink: url => ...,             // opcional: links internos
       barra: '.sidebar-icon-rail'        // o balão fica à direita dela
     });
   ========================================================================== */

(function () {
  const ESTILO = `
    .love-balao { position: fixed; z-index: 70; bottom: 24px; left: 24px; width: 360px; max-width: calc(100vw - 32px);
      display: flex; background: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 10px; overflow: hidden;
      box-shadow: 0 8px 24px rgba(0,0,0,0.08); font-family: Inter, system-ui, sans-serif;
      opacity: 0; transform: translateY(12px); transition: opacity .25s ease, transform .25s ease; }
    .love-balao.is-visivel { opacity: 1; transform: none; }
    .love-balao-imagem { flex: 0 0 112px; background: #F4F4F5 center / cover no-repeat; }
    .love-balao-corpo { flex: 1; min-width: 0; padding: 16px 16px 16px 18px; }
    .love-balao-titulo { margin: 0 24px 6px 0; font-size: 15px; line-height: 1.3; font-weight: 600; color: #18181B; letter-spacing: -0.01em; }
    .love-balao-texto { margin: 0 0 14px; font-size: 13px; line-height: 1.45; color: #71717A; }
    .love-balao-botao { display: inline-flex; align-items: center; height: 36px; padding: 0 16px; border: 0; border-radius: 8px;
      background: #183b54; color: #FFFFFF; font: 600 13px/1 Inter, system-ui, sans-serif; cursor: pointer; text-decoration: none; }
    .love-balao-botao:hover { background: #122c3f; }
    .love-balao-fechar { position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; padding: 0; border: 0;
      background: transparent; color: #A1A1AA; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
    .love-balao-fechar:hover { color: #181D24; }
    .love-balao-fechar svg { width: 16px; height: 16px; }
    @media (max-width: 767px) {
      .love-balao { left: 16px !important; right: 16px; bottom: 96px; width: auto; }
      .love-balao-imagem { flex-basis: 96px; }
    }`;

  const vistos = new Set(); // fechados nesta visita (não reaparecem antes de a leitura gravar)
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function mostrar(lista, opcoes) {
    const o = opcoes || {};
    const n = (lista || []).filter(x => x && x.formato === 'balao' && x.imagem_url && !vistos.has(x.id))[0];
    if (!n || document.querySelector('.love-balao')) return;

    if (!document.getElementById('love-balao-estilo')) {
      const st = document.createElement('style');
      st.id = 'love-balao-estilo';
      st.textContent = ESTILO;
      document.head.appendChild(st);
    }

    const el = document.createElement('div');
    el.className = 'love-balao';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', n.titulo || 'Aviso');
    el.innerHTML = `
      <div class="love-balao-imagem" style="background-image:url('${esc(n.imagem_url)}')"></div>
      <div class="love-balao-corpo">
        <p class="love-balao-titulo">${esc(n.titulo)}</p>
        <p class="love-balao-texto">${esc(n.mensagem)}</p>
        ${n.link_url ? `<button type="button" class="love-balao-botao">${esc(n.link_label || 'Ver mais')}</button>` : ''}
      </div>
      <button type="button" class="love-balao-fechar" aria-label="Fechar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>`;

    // À direita da barra lateral da plataforma (o rail de 80px ou a sidebar do Hub).
    const barra = o.barra && document.querySelector(o.barra);
    if (barra && window.innerWidth >= 768) {
      const direita = barra.getBoundingClientRect().right;
      if (direita > 0 && direita < window.innerWidth / 2) el.style.left = `${Math.round(direita + 24)}px`;
    }

    const fechar = () => {
      vistos.add(n.id);
      el.classList.remove('is-visivel');
      setTimeout(() => el.remove(), 250);
      try { o.aoVer && o.aoVer(n.id); } catch (e) { /* segue */ }
    };
    el.querySelector('.love-balao-fechar').addEventListener('click', fechar);
    el.querySelector('.love-balao-botao')?.addEventListener('click', () => {
      fechar();
      const url = n.link_url;
      if (o.abrirLink && o.abrirLink(url)) return;
      if (/^https?:\/\//i.test(url)) window.open(url, '_blank', 'noopener');
      else window.location.href = url;
    });

    document.body.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-visivel')));
  }

  window.LoveBalao = { mostrar };
})();
