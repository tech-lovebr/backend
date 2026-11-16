// Landing do Hub (index.html): menu fixo, quadros animados, agenda, saldo e perguntas.
(function(){
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  /* ---------- hub.planwithlove.com: a mesma landing em inglês (Estados Unidos) ----------
     O <head> do index.html marca html.hub-en pelo endereço; aqui os textos da página
     são trocados pelo dicionário abaixo (valores em dólar, sem Pix/boleto) e a página
     aparece. No love.com.br nada disso roda. */
  const EN = document.documentElement.classList.contains('hub-en');
  const D = {
    'Love Hub: CRM para Encontrar Clientes & Gerenciar Eventos': 'Love Hub: CRM to Find Clients & Manage Events',
    'Encontre clientes': 'Find clients', 'Perguntas frequentes': 'FAQ', 'Abrir menu': 'Open menu', 'Fechar menu': 'Close menu', 'Seções': 'Sections', 'Receba pagamentos': 'Get paid', 'Entrar': 'Log in', 'Cadastre-se grátis': 'Sign up free',
    'Love Hub, início': 'Love Hub, home', 'Escolha seu perfil': 'Choose your profile',
    'Para anfitriões': 'For hosts', 'Para fornecedores': 'For vendors',
    'Clientes e cobranças num lugar só': 'Clients and payments in one place',
    'Mais eventos na agenda.': 'More events on your calendar.', 'Mais dinheiro na conta.': 'More money in your account.',
    'Encontre novos clientes na Love, envie propostas rápidas e receba por link sem burocracia.': 'Find new clients on Love, send quick proposals and get paid by link, with no red tape.',
    'Ver como funciona': 'See how it works',
    'Mesa comprida de festa ao ar livre, com guardanapos azuis, flores brancas e azuis e velas': 'Long outdoor party table with blue napkins, white and blue flowers and candles',
    'Casamento': 'Wedding', 'Aniversário': 'Birthday', 'Chá de bebê': 'Baby shower', 'Decoração': 'Decor', 'Bolos e doces': 'Cakes and sweets', 'Bufê': 'Catering',
    'Proposta aceita': 'Proposal accepted', 'Proposta enviada': 'Proposal sent', 'Contrato gerado': 'Contract created',
    '3 parcelas': '3 installments', 'datas preenchidas': 'dates filled in',
    'Pix recebido': 'Payment received', 'Cartão aprovado': 'Card approved', 'Boleto pago': 'Apple Pay received', 'Boleto gerado': 'Apple Pay received',
    'Sinal do casamento': 'Wedding deposit', 'Parcela 2 de 3': 'Installment 2 of 3', 'em 3 vezes': 'in 3 installments', 'vence em 3 dias': 'due in 3 days',
    'Tudo o que o seu negócio de eventos': 'Everything your event business', 'precisa': 'needs',
    'Vender, organizar e receber, num sistema só.': 'Sell, organize and get paid, all in one system.',
    'Pedidos de clientes': 'Client requests', 'Propostas e contratos': 'Proposals and contracts', 'Link de cobrança': 'Payment links',
    'Agenda e tarefas': 'Calendar and tasks', 'Saldo e saque via Pix': 'Balance and payouts', 'Mensagens com clientes': 'Client messages',
    'Clientes que já estão': 'Clients who are already', 'procurando você': 'looking for you',
    'Quem organiza casamento, aniversário ou chá na Love procura fornecedores ali mesmo. Cadastre seus serviços e receba pedidos com data, cidade e número de convidados.': 'People planning a wedding, birthday or shower on Love look for vendors right there. List your services and get requests with the date, city and guest count.',
    'Quero receber pedidos': 'I want to get requests', 'Oportunidades': 'Opportunities',
    'set': 'Sep', 'out': 'Oct', 'Recife': 'Austin', 'Olinda': 'Dallas', 'Enviar proposta': 'Send proposal',
    'Do orçamento ao contrato,': 'From quote to contract,', 'sem papelada': 'without the paperwork',
    'Monte a proposta com seus produtos e envie com um link. Quando o cliente aceita, ela vira contrato com as parcelas e as datas já preenchidas.': 'Build the proposal with your products and send it as a link. When the client accepts, it becomes a contract with the installments and dates already filled in.',
    'Enviar minha proposta': 'Send my proposal', 'Proposta': 'Proposal', 'Casamento Marina e Pedro': 'Marina & Pedro’s wedding',
    'Enviada': 'Sent', 'Aceita': 'Accepted', 'Aceite': 'Accepted', 'Contrato': 'Contract',
    'Decoração da cerimônia': 'Ceremony decor', 'Arranjos de mesa × 15': 'Centerpieces × 15', 'Arco de flores na entrada': 'Floral arch at the entrance',
    'Sinal': 'Deposit', '2ª parcela': '2nd payment', '3ª parcela': '3rd payment', 'hoje': 'today', 'ontem': 'yesterday',
    '12 ago': 'Aug 12', '12 set': 'Sep 12', '12 mai': 'May 12',
    'A sua maquininha agora': 'Your card reader now', 'cabe num link': 'fits in a link',
    'Gere um link de cobrança em segundos e mande pelo WhatsApp. O cliente paga com Pix, cartão ou boleto, e o valor entra no seu saldo.': 'Create a payment link in seconds and send it by text. The client pays by card, bank transfer or Apple Pay, and the money lands in your balance.',
    'Criar meu primeiro link': 'Create my first link', 'Formas de pagamento': 'Payment methods',
    'Pix': 'Bank transfer', 'Cartão': 'Card', 'Boleto': 'Apple Pay',
    'Copiar link': 'Copy link', 'Link copiado': 'Link copied', 'love.com.br/pagar/7f3a91c0': 'planwithlove.com/pay/7f3a91c0',
    'Confeiteira decorando um bolo de casamento com flores': 'Baker decorating a wedding cake with flowers',
    'Cada data': 'Every date', 'no lugar certo': 'in the right place',
    'As datas do mês, os dias livres e o que falta fazer em cada evento, com a equipe vendo o mesmo calendário.': 'The month’s dates, your open days and what’s left to do for each event, with your team on the same calendar.',
    'Organizar minha agenda': 'Organize my calendar', 'Setembro': 'September',
    'Aniversário de 15 anos da Helena': 'Helena’s 15th birthday', 'Chá de bebê da Lia': 'Lia’s baby shower', 'Bodas de ouro de Lourdes e Antônio': 'Lourdes & Antônio’s golden anniversary',
    'Confirmar cardápio': 'Confirm the menu', 'Equipe de 3 pessoas': 'Team of 3', 'Montagem às 15h': 'Setup at 3 pm', 'Montagem às 14h': 'Setup at 2 pm',
    'Confirmar flores com o fornecedor': 'Confirm flowers with the supplier', 'Receber a 3ª parcela': 'Collect the 3rd payment',
    'Mesa de doces': 'Dessert table', 'Painel de balões': 'Balloon wall', 'Visita técnica ao espaço': 'Venue walkthrough', 'Fechar decoração': 'Finalize the decor',
    'O seu dinheiro,': 'Your money,', 'com transparência': 'fully transparent',
    'Cada pagamento entra no seu saldo com o nome do cliente e do contrato. Acompanhe o extrato e saque para a sua conta via Pix quando quiser.': 'Every payment lands in your balance with the client and contract name. Follow your statement and withdraw to your bank account whenever you want.',
    'Começar agora': 'Get started', 'Saldo disponível': 'Available balance', 'Ocultar saldo': 'Hide balance', 'Mostrar saldo': 'Show balance',
    'Saque para sua conta': 'Withdrawal to your bank', 'Sacar via Pix': 'Withdraw to my bank',
    'A diferença está': 'The difference is', 'nos detalhes': 'in the details',
    'Vitrine e site próprio': 'Storefront and your own website', 'Fotos, serviços e preços numa página para divulgar onde quiser.': 'Photos, services and prices on one page to share anywhere.',
    'Formulários para o cliente': 'Client forms', 'Pergunte cardápio, horários e preferências e receba tudo organizado.': 'Ask about the menu, timing and preferences and get it all organized.',
    'Toda a conversa de cada evento num lugar só, com o histórico à mão.': 'Every event’s conversation in one place, with the history at hand.',
    'Equipe com acesso próprio': 'Team members with their own access', 'Convide quem trabalha com você e escolha o que cada pessoa vê.': 'Invite the people you work with and choose what each one sees.',
    'Saque via Pix': 'Fast payouts', 'O dinheiro das cobranças vai para a sua conta quando você quiser, sem complicação.': 'The money from your payments goes to your bank account whenever you want, hassle-free.',
    'Segurança': 'Security', 'Tecnologia que cuida do seu dinheiro': 'Technology that protects your money', 'e dos dados dos seus clientes': 'and your clients’ data',
    'Cada cobrança é registrada, rastreável e chega ao seu saldo com transparência total, do sinal à quitação.': 'Every charge is recorded, traceable and reaches your balance with full transparency, from deposit to final payment.',
    'Criptografia em todas as conexões': 'Encryption on every connection', 'Os dados trafegam protegidos por HTTPS, da proposta ao pagamento.': 'Data travels protected by HTTPS, from proposal to payment.',
    'Privacidade de acordo com a LGPD': 'Privacy built in', 'As informações dos seus clientes são usadas só para o seu trabalho.': 'Your clients’ information is used only for your work.',
    'Histórico de cada centavo': 'A record of every cent', 'Extrato com quem pagou, quanto, quando e como foi pago.': 'A statement showing who paid, how much, when and how.',
    'Pagamentos com parceiro regulado': 'Payments through a regulated partner', 'Pix, cartão e boleto processados por instituição de pagamento parceira.': 'Cards, bank transfers and Apple Pay processed by a licensed payment partner.',
    'Pagamento recebido': 'Payment received', 'Pagamento aprovado': 'Payment approved', 'De': 'From', 'Identificador': 'Reference',
    'Para quem faz': 'For the people who make', 'a festa acontecer': 'the party happen',
    'Bufês': 'Catering', 'Foto e vídeo': 'Photo and video', 'Cerimonial': 'Event planning', 'Espaços': 'Venues',
    'Bufê servido numa festa': 'Catering served at a party', 'Confeiteira decorando um bolo': 'Baker decorating a cake', 'Decoradora montando um arranjo de flores': 'Decorator arranging flowers',
    'Cerimonialista organizando o evento': 'Event planner organizing the event', 'Espaço de festa': 'Party venue',
    'Perguntas': 'Frequently asked', 'frequentes': 'questions',
    'Não achou o que procurava? Fale com a gente pela': 'Didn’t find what you were looking for? Reach us through the', 'Central de ajuda': 'Help Center',
    'Quanto custa para começar?': 'How much does it cost to get started?',
    'O cadastro é grátis. Você monta a vitrine, cadastra seus produtos e começa a receber pedidos de orçamento sem pagar nada para começar.': 'Signing up is free. You set up your storefront, add your products and start getting quote requests without paying anything to get started.',
    'Sou MEI ou autônomo. Posso usar?': 'I’m a freelancer or a one-person business. Can I use it?',
    'Pode. O Hub foi pensado para quem trabalha sozinho ou com uma equipe pequena, da confeiteira que faz os doces em casa ao bufê com vários funcionários.': 'Yes. The Hub was built for people who work alone or with a small team, from the baker making sweets at home to the caterer with a full staff.',
    'Preciso de maquininha para receber?': 'Do I need a card reader to get paid?',
    'Não. Você gera um link de cobrança e o cliente paga por Pix, cartão ou boleto pelo celular. O valor entra no seu saldo e você saca para a sua conta quando quiser.': 'No. You create a payment link and the client pays by card, bank transfer or Apple Pay from their phone. The money lands in your balance and you withdraw it to your bank account whenever you want.',
    'Como os clientes chegam até mim?': 'How do clients find me?',
    'Quem organiza um evento na Love procura fornecedores pelo tipo de serviço e pela cidade. Quando o seu serviço combina com o evento, o pedido aparece em Oportunidades.': 'People planning an event on Love search for vendors by service type and city. When your service matches their event, the request shows up in Opportunities.',
    'Posso usar com clientes que não vieram pela Love?': 'Can I use it with clients who didn’t come through Love?',
    'Pode. Cadastre qualquer cliente e use propostas, contratos, cobranças e agenda do mesmo jeito.': 'Yes. Add any client and use proposals, contracts, payments and the calendar the same way.',
    'Para os dias que ficam para sempre': 'For the days that last forever',
    'Tem uma festa acontecendo.': 'There’s a party happening.', 'Faça parte dela.': 'Be part of it.',
    'Cadastre a sua empresa grátis e receba o primeiro pedido de orçamento.': 'Sign up your business for free and get your first quote request.',
    'Clientes, propostas, contratos e cobranças numa plataforma só, feita para quem faz os eventos acontecerem.': 'Clients, proposals, contracts and payments on one platform, built for the people who make events happen.',
    'Cadastrar minha empresa': 'Sign up my business', 'Suporte': 'Support', 'Love para anfitriões': 'Love for hosts', 'Recebimentos via Pix': 'Fast payouts',
    '© 2026 Love Hub Ltda. Todos os direitos reservados.': '© 2026 Love Hub. All rights reserved.', 'Privacidade': 'Privacy', 'Termos e condições': 'Terms and conditions'
  };
  const dolar = s => s.replace(/R\$ ?(\d{1,3}(?:\.\d{3})*)(?:,(\d{2}))?/g, (_, a, b) => '$' + a.replace(/\./g, ',') + (b ? '.' + b : ''));
  const tr = s => {
    if (!EN || !s) return s;
    if (D[s] != null) return D[s];
    if (s.includes(' · ')) return s.split(' · ').map(tr).join(' · ');
    let m;
    if ((m = s.match(/^(\d+) convidados$/))) return m[1] + ' guests';
    if ((m = s.match(/^(\d+) novas solicitações$/))) return m[1] + ' new requests';
    if ((m = s.match(/^(\d+) novas$/))) return m[1] + ' new';
    if ((m = s.match(/^(\d+) dias livres$/))) return m[1] + ' open days';
    return dolar(s);
  };
  if (EN) {
    try {
      document.title = tr(document.title);
      const desc = document.querySelector('meta[name="description"]');
      if (desc) desc.content = 'For caterers, decorators, photographers, planners and bakers: get requests from people planning an event on Love, send proposals and get paid by link.';
      const andar = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => /^(SCRIPT|STYLE)$/.test(n.parentNode.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
      for (let n; (n = andar.nextNode());) {
        const m = n.nodeValue.match(/^(\s*)([\s\S]*?)(\s*)$/);
        const t = tr(m[2]);
        if (t !== m[2]) n.nodeValue = m[1] + t + m[3];
      }
      $$('[alt],[aria-label]').forEach(el => ['alt', 'aria-label'].forEach(a => { if (el.hasAttribute(a)) el.setAttribute(a, tr(el.getAttribute(a))); }));
      // "Para anfitriões" leva para a Love em inglês.
      $$('a[href^="https://love.com.br"]').forEach(a => { a.href = 'https://planwithlove.com'; });
    } finally {
      document.documentElement.classList.add('hub-en-pronta');
    }
  }

  const swapText = (el, b, s) => { el.classList.add('out'); setTimeout(() => { el.querySelector('b').textContent = tr(b); el.querySelector('small').textContent = tr(s); el.classList.remove('out'); }, 450); };

  /* Menu do celular (☰): abre/fecha o painel; tocar numa seção leva até ela e fecha. */
  (() => {
    const bt = $('#burger'), menu = $('#menu-cel'), topo = $('#nav');
    if (!bt || !menu) return;
    const abrir = on => {
      menu.hidden = !on; bt.classList.toggle('aberto', on); topo.classList.toggle('menu-aberto', on);
      bt.setAttribute('aria-expanded', String(on)); bt.setAttribute('aria-label', tr(on ? 'Fechar menu' : 'Abrir menu'));
    };
    bt.addEventListener('click', () => abrir(menu.hidden));
    menu.addEventListener('click', e => { if (e.target.closest('a')) abrir(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { abrir(false); bt.focus(); } });
    document.addEventListener('click', e => { if (!menu.hidden && !e.target.closest('#nav')) abrir(false); });
    matchMedia('(max-width: 768px)').addEventListener('change', e => { if (!e.matches) abrir(false); });
  })();

  const nav = $('#nav'); const sc = () => nav.classList.toggle('on', scrollY > 40);
  addEventListener('scroll', sc, {passive:true}); sc();

  /* quadros do hero */
  const h0 = [['15 novas solicitações','Casamento · 150 convidados'],['16 novas solicitações','Aniversário · 80 convidados'],['17 novas solicitações','Chá de bebê · 40 convidados']];
  const h1 = [['Proposta aceita','Marina Souza · Decoração'],['Contrato gerado','3 parcelas · datas preenchidas'],['Proposta aceita','Rafael Lima · Bolos e doces']];
  const h2 = [['Pix recebido','R$ 2.800,00 · Sinal do casamento'],['Cartão aprovado','R$ 1.450,00 · Parcela 2 de 3'],['Boleto pago','R$ 980,00 · Chá de bebê']];
  let hi = 0;
  if (!reduce) setInterval(() => { hi = (hi + 1) % 3; swapText($('#hs0'), ...h0[hi]); setTimeout(() => swapText($('#hs1'), ...h1[hi]), 700); setTimeout(() => swapText($('#hs2'), ...h2[hi]), 1400); }, 4200);

  /* pedidos */
  let left = 15;
  $$('.send').forEach(b => b.addEventListener('click', () => { if (b.classList.contains('done')) return; b.classList.add('done'); b.textContent = tr('Proposta enviada'); left--; $('#nreq').textContent = tr(left + ' novas'); }));

  /* proposta: enviada → aceita → contrato */
  const pst = $('#pst'), st = [$('#s1'),$('#s2'),$('#s3')];
  const states = [['Enviada','','Proposta enviada','Marina Souza · Decoração'],['Aceita','ok','Proposta aceita','Marina Souza · Decoração'],['Contrato','bl','Contrato gerado','3 parcelas · datas preenchidas']];
  let pi = 0;
  const setP = i => { const [l,c,b,s] = states[i]; pst.className = 'pill ' + c; pst.textContent = tr(l); st.forEach((x,j) => x.classList.toggle('on', j <= i)); swapText($('#pt'), b, s); };
  if (!reduce) setInterval(() => { pi = (pi + 1) % 3; setP(pi); }, 2600);

  /* link de cobrança */
  const ms = $$('.m');
  const msg = [['Pix recebido','R$ 2.800,00 · Sinal do casamento'],['Cartão aprovado','R$ 2.800,00 · em 3 vezes'],['Boleto gerado','R$ 2.800,00 · vence em 3 dias']];
  ms.forEach((b, i) => b.addEventListener('click', () => { ms.forEach(x => { x.classList.toggle('on', x===b); x.setAttribute('aria-pressed', x===b); }); swapText($('#lt'), ...msg[i]); }));
  const cp = $('#copy');
  cp.addEventListener('click', () => {
    const done = () => { cp.textContent = tr('Link copiado'); setTimeout(() => cp.textContent = tr('Copiar link'), 1800); };
    try { navigator.clipboard.writeText(tr('love.com.br/pagar/7f3a91c0')).then(done, () => { const r = document.createRange(); r.selectNodeContents(cp.previousElementSibling); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }); } catch(e) { done(); }
  });

  /* agenda: setembro de 2026 começa numa terça */
  const ev = {
    5:['Aniversário de 15 anos da Helena',['Confirmar cardápio','Equipe de 3 pessoas','Montagem às 15h']],
    12:['Casamento Marina e Pedro',['Confirmar flores com o fornecedor','Montagem às 14h','Receber a 3ª parcela']],
    19:['Chá de bebê da Lia',['Mesa de doces','Painel de balões']],
    26:['Bodas de ouro de Lourdes e Antônio',['Visita técnica ao espaço','Fechar decoração']]
  };
  const wd = EN ? ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] : ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const dataDoDia = d => EN ? wd[(d + 1) % 7] + ', September ' + d : wd[(d + 1) % 7] + ', ' + d + ' de setembro';
  const grid = $('#grid');
  (EN ? ['S','M','T','W','T','F','S'] : ['D','S','T','Q','Q','S','S']).forEach(w => { const s = document.createElement('span'); s.className = 'w'; s.textContent = w; grid.append(s); });
  for (let i = 0; i < 2; i++) { const s = document.createElement('span'); s.className = 'day off'; grid.append(s); }
  const showDay = d => {
    $$('.day.e').forEach(x => x.classList.toggle('sel', +x.dataset.d === d));
    $('#evd').textContent = dataDoDia(d); $('#evn').textContent = tr(ev[d][0]);
    const t = $('#tasks'); t.textContent = '';
    ev[d][1].forEach((x,k) => { const b = document.createElement('button'); b.className = 'task' + (k === 0 && d === 12 ? ' ok' : ''); b.innerHTML = '<span class="bx"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12.5 10 17 19 7.5"/></svg></span><span></span>'; b.lastChild.textContent = tr(x); b.addEventListener('click', () => b.classList.toggle('ok')); t.append(b); });
  };
  for (let d = 1; d <= 30; d++) {
    const b = document.createElement('button'); b.className = 'day' + (ev[d] ? ' e' : ''); b.textContent = d; b.dataset.d = d;
    if (ev[d]) { b.setAttribute('aria-label', (EN ? 'September ' + d : d + ' de setembro') + ': ' + tr(ev[d][0])); b.addEventListener('click', () => showDay(d)); } else b.tabIndex = -1;
    grid.append(b);
  }
  showDay(12);

  /* saldo */
  $('#eye').addEventListener('click', () => { const on = $('#saldo-v').classList.toggle('hide'); $('#eye').setAttribute('aria-pressed', on); $('#eye').setAttribute('aria-label', tr(on ? 'Mostrar saldo' : 'Ocultar saldo')); });
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return; const el = e.target;
      if (el.id === 'check') { el.classList.remove('draw'); void el.offsetWidth; el.classList.add('draw'); }
      if (el.id === 'saldo-v') { const end = 12480, t0 = performance.now(); const f = now => { const q = Math.min(1,(now-t0)/1100), v = end*(1-Math.pow(1-q,3)); el.textContent = (EN ? '$' : 'R$ ') + v.toLocaleString(EN ? 'en-US' : 'pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); if (q<1) requestAnimationFrame(f); }; requestAnimationFrame(f); }
      io.unobserve(el);
    }), {threshold:.6});
    ['#check','#saldo-v'].forEach(s => io.observe($(s)));
  }

  /* Tudo num só lugar: o destaque (.all-luz) passa por cima de um recurso de
     cada vez, a cada 5 s; ao passar o mouse, vai direto para aquele recurso. */
  const all = $('#all'), luz = $('#all-luz');
  if (all && luz) {
    const itens = $$('#all > a');
    let ai = 0;
    const por = i => {
      ai = i; const a = itens[i];
      itens.forEach((x, k) => x.classList.toggle('all-on', k === i));
      Object.assign(luz.style, { left: a.offsetLeft + 'px', top: a.offsetTop + 'px', width: a.offsetWidth + 'px', height: a.offsetHeight + 'px' });
    };
    // Com o mouse em cima da caixa a troca pausa; ao sair, volta a girar.
    let pausado = false;
    all.addEventListener('mouseenter', () => { pausado = true; });
    all.addEventListener('mouseleave', () => { pausado = false; });
    itens.forEach((a, i) => a.addEventListener('mouseenter', () => por(i)));
    addEventListener('resize', () => por(ai));
    por(0);
    if (!reduce) setInterval(() => { if (!pausado && !document.hidden) por((ai + 1) % itens.length); }, 5000);
  }

  const chips = $$('#chips .chip'); let ci = 0;
  if (!reduce) setInterval(() => { chips.forEach((x,j) => x.classList.toggle('on', j===ci)); ci = (ci + 1) % chips.length; }, 1800);

  $$('#faq .qa').forEach(q => q.querySelector('button').addEventListener('click', () => {
    const open = !q.classList.contains('open');
    $$('#faq .qa').forEach(o => { o.classList.remove('open'); o.querySelector('button').setAttribute('aria-expanded','false'); });
    if (open) { q.classList.add('open'); q.querySelector('button').setAttribute('aria-expanded','true'); }
  }));
})();
