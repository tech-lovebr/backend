/* ==========================================================================
   LOVE B2B — Onboarding da empresa (primeiro passo depois de criar a conta)
   Quem cria a conta pelo Google chega sem categoria (o cadastro por e-mail
   já pede). Na Home, a conta recém-criada pelo Google (js/shell.js marca
   em localStorage b2b-onboarding-empresa) e ainda sem categoria vê uma tela em dois passos:
   1) a categoria da empresa; 2) as tags do que ela oferece (as mesmas
   sugestões de Meus produtos, TAGS_POR_CATEGORIA em js/data.js).
   Salva em fornecedores.category e fornecedores.tags (migration 122). Sem a
   coluna tags, as tags ficam nos dados da conta (user_metadata.tags_empresa).
   Depois, segue para as boas-vindas de sempre (js/dashboard.js).
   ========================================================================== */

(function () {
  let categoria = '';
  let tags = [];
  let passo = 1;
  let tela = null;

  const esc = s => (typeof escapeHtml === 'function' ? escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s));
  const categorias = () => (typeof FORNECEDOR_CATEGORIAS !== 'undefined' ? FORNECEDOR_CATEGORIAS : []);
  const sugeridas = () => ((typeof TAGS_POR_CATEGORIA !== 'undefined' && TAGS_POR_CATEGORIA[categoria]) || []);
  const temTag = t => tags.some(x => x.toLowerCase() === t.toLowerCase());

  const ICONE_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>';

  function htmlPasso1() {
    return `
      <p class="onb-passo">Passo 1 de 2</p>
      <h1 class="onb-titulo">Qual é a categoria da sua empresa?</h1>
      <p class="onb-sub">Assim a Love mostra a sua empresa para quem procura esse serviço.</p>
      <div class="onb-opcoes" role="radiogroup" aria-label="Categoria da empresa">
        ${categorias().map(c => `
          <button type="button" class="onb-opcao${c === categoria ? ' is-marcada' : ''}" role="radio" aria-checked="${c === categoria}" data-onb-categoria="${esc(c)}">
            <span>${esc(c)}</span>${ICONE_CHECK}
          </button>`).join('')}
      </div>
      <p class="onb-erro" hidden></p>
      <div class="onb-acoes">
        <button type="button" class="btn-primary onb-continuar" data-onb-continuar${categoria ? '' : ' disabled'}>Continuar</button>
      </div>`;
  }

  function htmlPasso2() {
    const lista = sugeridas();
    const minhas = tags.filter(t => !lista.some(s => s.toLowerCase() === t.toLowerCase()));
    const todas = lista.concat(minhas);
    return `
      <p class="onb-passo">Passo 2 de 2</p>
      <h1 class="onb-titulo">O que a sua empresa oferece?</h1>
      <p class="onb-sub">Escolha as tags que combinam com o seu serviço em ${esc(categoria)}. Elas ajudam a Love a mostrar você nas buscas certas.</p>
      <div class="produto-tags-lista onb-tags">
        ${todas.map(t => `<button type="button" class="produto-tag${temTag(t) ? ' is-marcada' : ''}" data-onb-tag="${esc(t)}" aria-pressed="${temTag(t)}">${esc(t)}</button>`).join('')}
        <button type="button" class="produto-tag produto-tag-outro" data-onb-outro>Outro</button>
      </div>
      <div class="produto-tags-nova" data-onb-nova${lista.length ? ' hidden' : ''}>
        <input type="text" class="field-input" maxlength="40" placeholder="Escreva uma tag e aperte Enter" autocomplete="off" data-onb-input>
      </div>
      <p class="onb-erro" hidden></p>
      <div class="onb-acoes">
        <button type="button" class="onb-voltar" data-onb-voltar>Voltar</button>
        <button type="button" class="btn-primary onb-continuar" data-onb-concluir>Concluir</button>
      </div>`;
  }

  function desenhar() {
    if (!tela) return;
    tela.querySelector('.onb-caixa').innerHTML = passo === 1 ? htmlPasso1() : htmlPasso2();
    tela.scrollTop = 0;
  }

  function adicionarTagEscrita(input) {
    const texto = input.value.replace(/\s+/g, ' ').trim().replace(/,$/, '');
    if (!texto) return;
    if (!temTag(texto)) tags.push(texto);
    desenhar();
    const novo = tela.querySelector('[data-onb-input]');
    if (novo) { novo.closest('[data-onb-nova]').hidden = false; novo.focus(); }
  }

  async function concluir(botao) {
    const erro = tela.querySelector('.onb-erro');
    botao.disabled = true;
    botao.textContent = 'Salvando…';
    const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
    const fid = session ? empresaId(session) : null;
    let falhou = !fid;
    if (fid) {
      const r = await supabaseClient.from('fornecedores').update({ category: categoria, tags }).eq('id', fid);
      if (r.error) {
        // Coluna tags ainda não existe (migration 122): salva a categoria e
        // guarda as tags nos dados da conta.
        const r2 = await supabaseClient.from('fornecedores').update({ category: categoria }).eq('id', fid);
        falhou = !!r2.error;
        if (!falhou) await supabaseClient.auth.updateUser({ data: { tags_empresa: tags } });
      }
    }
    if (falhou) {
      botao.disabled = false;
      botao.textContent = 'Concluir';
      erro.textContent = 'Não foi possível salvar agora. Tente de novo.';
      erro.hidden = false;
      return;
    }
    if (typeof B2B_DATA !== 'undefined') Object.assign(B2B_DATA.professional, { category: categoria, tags: tags.slice() });
    fechar();
    try { localStorage.removeItem('b2b-onboarding-empresa'); } catch (e) { /* sem armazenamento */ }
    // Segue para as boas-vindas (js/dashboard.js).
    try { localStorage.setItem('b2b-onboarding-pending', '1'); } catch (e) { /* sem armazenamento */ }
    if (typeof window.initOnboardingModal === 'function') window.initOnboardingModal();
  }

  function fechar() {
    tela?.remove();
    tela = null;
    document.body.classList.remove('onb-aberto');
  }

  function abrir() {
    if (tela) return;
    tela = document.createElement('div');
    tela.className = 'onb-tela';
    tela.setAttribute('role', 'dialog');
    tela.setAttribute('aria-modal', 'true');
    tela.setAttribute('aria-label', 'Conte sobre a sua empresa');
    tela.innerHTML = `
      <div class="onb-topo"><img src="assets/logo.png" alt="Love" class="onb-logo"></div>
      <div class="onb-caixa"></div>`;
    document.body.appendChild(tela);
    document.body.classList.add('onb-aberto');
    desenhar();

    tela.addEventListener('click', e => {
      const alvo = e.target instanceof Element ? e.target : null;
      if (!alvo) return;
      const opcao = alvo.closest('[data-onb-categoria]');
      if (opcao) {
        // Trocou de categoria: as tags marcadas eram da outra.
        if (opcao.dataset.onbCategoria !== categoria) tags = [];
        categoria = opcao.dataset.onbCategoria;
        desenhar();
        return;
      }
      if (alvo.closest('[data-onb-continuar]') && categoria) { passo = 2; desenhar(); return; }
      if (alvo.closest('[data-onb-voltar]')) { passo = 1; desenhar(); return; }
      if (alvo.closest('[data-onb-outro]')) {
        const nova = tela.querySelector('[data-onb-nova]');
        if (nova) nova.hidden = false;
        tela.querySelector('[data-onb-input]')?.focus();
        return;
      }
      const chip = alvo.closest('[data-onb-tag]');
      if (chip) {
        const t = chip.dataset.onbTag;
        const i = tags.findIndex(x => x.toLowerCase() === t.toLowerCase());
        if (i >= 0) tags.splice(i, 1); else tags.push(t);
        desenhar();
        return;
      }
      const fim = alvo.closest('[data-onb-concluir]');
      if (fim) concluir(fim);
    });
    tela.addEventListener('keydown', e => {
      const input = e.target instanceof Element ? e.target.closest('[data-onb-input]') : null;
      if (input && (e.key === 'Enter' || e.key === ',') && !e.isComposing) { e.preventDefault(); adicionarTagEscrita(input); }
    });
  }

  async function verificar() {
    if (window.b2bAuthReady && !(await window.b2bAuthReady)) return;
    const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
    if (!session) return;
    // Só para conta criada agora pelo Google (marcada em js/shell.js).
    let marcada = null;
    try { marcada = localStorage.getItem('b2b-onboarding-empresa'); } catch (e) { /* sem armazenamento */ }
    if (marcada !== session.user.id) return;
    const { data, error } = await supabaseClient.from('fornecedores').select('category').eq('id', empresaId(session)).maybeSingle();
    if (error || !data) return;
    if (String(data.category || '').trim()) { try { localStorage.removeItem('b2b-onboarding-empresa'); } catch (e) { /* sem armazenamento */ } return; }
    abrir();
  }

  document.addEventListener('DOMContentLoaded', verificar);
})();
