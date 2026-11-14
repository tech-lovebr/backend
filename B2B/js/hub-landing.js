// Landing do Hub (index.html): menu fixo, quadros animados, agenda, saldo e perguntas.
(function(){
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const swapText = (el, b, s) => { el.classList.add('out'); setTimeout(() => { el.querySelector('b').textContent = b; el.querySelector('small').textContent = s; el.classList.remove('out'); }, 450); };

  const nav = $('#nav'); const sc = () => nav.classList.toggle('on', scrollY > 40);
  addEventListener('scroll', sc, {passive:true}); sc();

  const hero = $('#hero'), glow = $('#glow');
  if (!reduce) hero.addEventListener('mousemove', e => { const r = hero.getBoundingClientRect(); glow.style.left = ((e.clientX - r.left) / r.width * 100) + '%'; glow.style.top = ((e.clientY - r.top) / r.height * 100) + '%'; });

  /* quadros do hero */
  const h0 = [['15 novas solicitações','Casamento · 150 convidados'],['16 novas solicitações','Aniversário · 80 convidados'],['17 novas solicitações','Chá de bebê · 40 convidados']];
  const h1 = [['Proposta aceita','Marina Souza · Decoração'],['Contrato gerado','3 parcelas · datas preenchidas'],['Proposta aceita','Rafael Lima · Bolos e doces']];
  const h2 = [['Pix recebido','R$ 2.800,00 · Sinal do casamento'],['Cartão aprovado','R$ 1.450,00 · Parcela 2 de 3'],['Boleto pago','R$ 980,00 · Chá de bebê']];
  let hi = 0;
  if (!reduce) setInterval(() => { hi = (hi + 1) % 3; swapText($('#hs0'), ...h0[hi]); setTimeout(() => swapText($('#hs1'), ...h1[hi]), 700); setTimeout(() => swapText($('#hs2'), ...h2[hi]), 1400); }, 4200);

  /* pedidos */
  let left = 15;
  $$('.send').forEach(b => b.addEventListener('click', () => { if (b.classList.contains('done')) return; b.classList.add('done'); b.textContent = 'Proposta enviada'; left--; $('#nreq').textContent = left + ' novas'; }));

  /* proposta: enviada → aceita → contrato */
  const pst = $('#pst'), st = [$('#s1'),$('#s2'),$('#s3')];
  const states = [['Enviada','','Proposta enviada','Marina Souza · Decoração'],['Aceita','ok','Proposta aceita','Marina Souza · Decoração'],['Contrato','bl','Contrato gerado','3 parcelas · datas preenchidas']];
  let pi = 0;
  const setP = i => { const [l,c,b,s] = states[i]; pst.className = 'pill ' + c; pst.textContent = l; st.forEach((x,j) => x.classList.toggle('on', j <= i)); swapText($('#pt'), b, s); };
  if (!reduce) setInterval(() => { pi = (pi + 1) % 3; setP(pi); }, 2600);

  /* link de cobrança */
  const ms = $$('.m');
  const msg = {Pix:['Pix recebido','R$ 2.800,00 · Sinal do casamento'],'Cartão':['Cartão aprovado','R$ 2.800,00 · em 3 vezes'],Boleto:['Boleto gerado','R$ 2.800,00 · vence em 3 dias']};
  ms.forEach(b => b.addEventListener('click', () => { ms.forEach(x => { x.classList.toggle('on', x===b); x.setAttribute('aria-pressed', x===b); }); swapText($('#lt'), ...msg[b.textContent]); }));
  const cp = $('#copy');
  cp.addEventListener('click', () => {
    const done = () => { cp.textContent = 'Link copiado'; setTimeout(() => cp.textContent = 'Copiar link', 1800); };
    try { navigator.clipboard.writeText('love.com.br/pagar/7f3a91c0').then(done, () => { const r = document.createRange(); r.selectNodeContents(cp.previousElementSibling); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }); } catch(e) { done(); }
  });

  /* agenda: setembro de 2026 começa numa terça */
  const ev = {
    5:['Aniversário de 15 anos da Helena',['Confirmar cardápio','Equipe de 3 pessoas','Montagem às 15h']],
    12:['Casamento Marina e Pedro',['Confirmar flores com o fornecedor','Montagem às 14h','Receber a 3ª parcela']],
    19:['Chá de bebê da Lia',['Mesa de doces','Painel de balões']],
    26:['Bodas de ouro de Lourdes e Antônio',['Visita técnica ao espaço','Fechar decoração']]
  };
  const wd = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const grid = $('#grid');
  ['D','S','T','Q','Q','S','S'].forEach(w => { const s = document.createElement('span'); s.className = 'w'; s.textContent = w; grid.append(s); });
  for (let i = 0; i < 2; i++) { const s = document.createElement('span'); s.className = 'day off'; grid.append(s); }
  const showDay = d => {
    $$('.day.e').forEach(x => x.classList.toggle('sel', +x.dataset.d === d));
    $('#evd').textContent = wd[(d + 1) % 7] + ', ' + d + ' de setembro'; $('#evn').textContent = ev[d][0];
    const t = $('#tasks'); t.textContent = '';
    ev[d][1].forEach((x,k) => { const b = document.createElement('button'); b.className = 'task' + (k === 0 && d === 12 ? ' ok' : ''); b.innerHTML = '<span class="bx"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12.5 10 17 19 7.5"/></svg></span><span></span>'; b.lastChild.textContent = x; b.addEventListener('click', () => b.classList.toggle('ok')); t.append(b); });
  };
  for (let d = 1; d <= 30; d++) {
    const b = document.createElement('button'); b.className = 'day' + (ev[d] ? ' e' : ''); b.textContent = d; b.dataset.d = d;
    if (ev[d]) { b.setAttribute('aria-label', d + ' de setembro: ' + ev[d][0]); b.addEventListener('click', () => showDay(d)); } else b.tabIndex = -1;
    grid.append(b);
  }
  showDay(12);

  /* saldo */
  $('#eye').addEventListener('click', () => { const on = $('#saldo-v').classList.toggle('hide'); $('#eye').setAttribute('aria-pressed', on); $('#eye').setAttribute('aria-label', on ? 'Mostrar saldo' : 'Ocultar saldo'); });
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return; const el = e.target;
      if (el.id === 'check') { el.classList.remove('draw'); void el.offsetWidth; el.classList.add('draw'); }
      if (el.id === 'saldo-v') { const end = 12480, t0 = performance.now(); const f = now => { const q = Math.min(1,(now-t0)/1100), v = end*(1-Math.pow(1-q,3)); el.textContent = 'R$ ' + v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); if (q<1) requestAnimationFrame(f); }; requestAnimationFrame(f); }
      io.unobserve(el);
    }), {threshold:.6});
    ['#check','#saldo-v'].forEach(s => io.observe($(s)));
  }

  const chips = $$('#chips .chip'); let ci = 0;
  if (!reduce) setInterval(() => { chips.forEach((x,j) => x.classList.toggle('on', j===ci)); ci = (ci + 1) % chips.length; }, 1800);

  $$('#faq .qa').forEach(q => q.querySelector('button').addEventListener('click', () => {
    const open = !q.classList.contains('open');
    $$('#faq .qa').forEach(o => { o.classList.remove('open'); o.querySelector('button').setAttribute('aria-expanded','false'); });
    if (open) { q.classList.add('open'); q.querySelector('button').setAttribute('aria-expanded','true'); }
  }));
})();
