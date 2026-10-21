/* ==========================================================================
   LOVE ADMIN — Editor de texto rico

   contenteditable com document.execCommand. A API é formalmente obsoleta,
   mas funciona em todos os navegadores atuais e é a única forma de ter
   negrito, cor e link sem trazer um editor inteiro para um projeto sem
   build.

   O que sai daqui é HTML, e é HTML que vai para o banco — sem conversão no
   meio, o que o autor vê ao escrever é o que o leitor recebe.

   Uso:
     const editor = EditorRico.montar(document.getElementById('host'), {
       placeholder: 'Escreva aqui.'
     });
     editor.definir('<p>texto</p>');
     editor.html();
   ========================================================================== */

const EditorRico = (() => {
  /** @param {string} caminhos */
  const ico = caminhos => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${caminhos}</svg>`;
  const CHEVRON = '<svg class="editor-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6l6 -6"/></svg>';
  const ALINHAR = {
    justifyLeft: { rotulo: 'À esquerda', icone: ico('<path d="M4 6h16"/><path d="M4 12h10"/><path d="M4 18h14"/>') },
    justifyCenter: { rotulo: 'Centralizado', icone: ico('<path d="M4 6h16"/><path d="M8 12h8"/><path d="M6 18h12"/>') },
    justifyRight: { rotulo: 'À direita', icone: ico('<path d="M4 6h16"/><path d="M10 12h10"/><path d="M6 18h14"/>') },
    justifyFull: { rotulo: 'Justificado', icone: ico('<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h12"/>') }
  };

  /** Link do YouTube (watch, youtu.be, shorts, embed) → vídeo embutido; senão null.
   *  @param {string} texto */
  function htmlDoVideo(texto) {
    const limpo = String(texto || '').trim();
    if (!limpo || /\s/.test(limpo)) return null;
    const yt = limpo.match(/^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/i);
    if (!yt) return null;
    return `<div class="video-embed" contenteditable="false"><iframe src="https://www.youtube.com/embed/${yt[1]}" title="Vídeo do YouTube" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0;border-radius:8px"></iframe></div><p><br></p>`;
  }

  const BARRA = `
    <div class="editor-barra">
      <button type="button" class="editor-btn" data-historia="-1" title="Desfazer (Ctrl+Z)" aria-label="Desfazer">${ico('<path d="M9 14l-4 -4l4 -4"/><path d="M5 10h11a4 4 0 1 1 0 8h-1"/>')}</button>
      <button type="button" class="editor-btn" data-historia="1" title="Refazer (Ctrl+Y)" aria-label="Refazer">${ico('<path d="M15 14l4 -4l-4 -4"/><path d="M19 10h-11a4 4 0 1 0 0 8h1"/>')}</button>

      <span class="editor-separador"></span>

      <button type="button" class="editor-btn" data-comando="bold" title="Negrito" aria-label="Negrito"><b>B</b></button>
      <button type="button" class="editor-btn" data-comando="italic" title="Itálico" aria-label="Itálico"><i>I</i></button>
      <button type="button" class="editor-btn" data-comando="underline" title="Sublinhado" aria-label="Sublinhado"><u>U</u></button>

      <span class="editor-separador"></span>

      <select class="editor-select" data-bloco aria-label="Estilo do parágrafo">
        <option value="p">Parágrafo</option>
        <option value="h2">Título 2</option>
        <option value="h3">Título 3</option>
        <option value="blockquote">Citação</option>
      </select>

      <span class="editor-separador"></span>

      <button type="button" class="editor-btn" data-comando="insertUnorderedList" title="Lista com marcadores" aria-label="Lista com marcadores">${ico('<path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><path d="M5 6v.01"/><path d="M5 12v.01"/><path d="M5 18v.01"/>')}</button>
      <button type="button" class="editor-btn" data-comando="insertOrderedList" title="Lista numerada" aria-label="Lista numerada">${ico('<path d="M11 6h9"/><path d="M11 12h9"/><path d="M12 18h8"/><path d="M4 16a2 2 0 1 1 4 0c0 .591 -.5 1 -1 1.5l-3 2.5h4"/><path d="M6 10v-6l-2 2"/>')}</button>
      <button type="button" class="editor-btn" data-comando="outdent" title="Diminuir recuo" aria-label="Diminuir recuo">${ico('<path d="M20 6h-7"/><path d="M20 12h-9"/><path d="M20 18h-7"/><path d="M8 8l-4 4l4 4"/>')}</button>
      <button type="button" class="editor-btn" data-comando="indent" title="Aumentar recuo" aria-label="Aumentar recuo">${ico('<path d="M20 6h-11"/><path d="M20 12h-7"/><path d="M20 18h-11"/><path d="M4 8l4 4l-4 4"/>')}</button>

      <div class="editor-menu-wrap">
        <button type="button" class="editor-btn editor-btn-menu" data-abrir="alinhar" title="Alinhamento do parágrafo" aria-label="Alinhamento do parágrafo">
          <span class="editor-btn-icone" data-icone-alinhar>${ALINHAR.justifyLeft.icone}</span>${CHEVRON}
        </button>
        <div class="editor-menu editor-menu-icones" data-menu="alinhar" hidden>
          ${Object.entries(ALINHAR).map(([cmd, a]) => `<button type="button" class="editor-btn" data-alinhar="${cmd}" title="${a.rotulo}" aria-label="${a.rotulo}">${a.icone}</button>`).join('')}
        </div>
      </div>

      <span class="editor-separador"></span>

      <label class="editor-cor" title="Cor do texto">
        <span>A</span>
        <input type="color" data-cor value="#101828" aria-label="Cor do texto">
      </label>

      <label class="editor-btn" data-imagem title="Inserir imagem" aria-label="Inserir imagem">
        ${ico('<path d="M15 8h.01"/><path d="M3 6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-12z"/><path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l5 5"/><path d="M14 14l1 -1c.928 -.893 2.072 -.893 3 0l3 3"/>')}
        <input type="file" accept="image/*" data-arquivo-imagem hidden>
      </label>
      <button type="button" class="editor-btn" data-link title="Inserir link" aria-label="Inserir link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 15l6 -6" /><path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464" /><path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463" /></svg>
      </button>

      <span class="editor-separador"></span>

      <div class="editor-menu-wrap">
        <button type="button" class="editor-btn editor-btn-menu" data-abrir="tabela" title="Tabela" aria-label="Tabela">
          ${ico('<path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z"/><path d="M3 10h18"/><path d="M10 3v18"/>')}${CHEVRON}
        </button>
        <div class="editor-menu editor-menu-tabela" data-menu="tabela" hidden>
          <div class="editor-grade" data-grade>${Array.from({ length: 36 }, (_, i) => `<span data-l="${Math.floor(i / 6) + 1}" data-c="${(i % 6) + 1}"></span>`).join('')}</div>
          <p class="editor-grade-rotulo" data-grade-rotulo>Inserir tabela</p>
          <div class="editor-menu-tabela-acoes" data-acoes-tabela hidden>
            <button type="button" class="editor-menu-item" data-tabela="linha">Adicionar linha abaixo</button>
            <button type="button" class="editor-menu-item" data-tabela="coluna">Adicionar coluna à direita</button>
            <button type="button" class="editor-menu-item" data-tabela="excluir-linha">Excluir linha</button>
            <button type="button" class="editor-menu-item" data-tabela="excluir-coluna">Excluir coluna</button>
            <button type="button" class="editor-menu-item editor-menu-perigo" data-tabela="excluir">Excluir tabela</button>
          </div>
        </div>
      </div>
      <button type="button" class="editor-btn" data-linha title="Linha horizontal" aria-label="Linha horizontal">${ico('<path d="M4 12h16"/>')}</button>
      <button type="button" class="editor-btn" data-limpar title="Limpar formatação" aria-label="Limpar formatação">${ico('<path d="M19 20h-10.5l-4.21 -4.3a1 1 0 0 1 0 -1.41l10 -10a1 1 0 0 1 1.41 0l5 5a1 1 0 0 1 0 1.41l-9.2 9.3"/><path d="M18 13.3l-6.3 -6.3"/>')}</button>
    </div>`;

  /**
   * @param {HTMLElement} host
   * @param {{ placeholder?: string, aoMudar?: () => void, tabela?: boolean, imagem?: boolean }} [opcoes]
   */
  function montar(host, { placeholder = 'Escreva aqui.', aoMudar, tabela = true, imagem = false } = {}) {
    host.innerHTML = `
      ${BARRA}
      <div class="editor-corpo" contenteditable="true" role="textbox" aria-multiline="true"
           data-placeholder="${escapeHtml(placeholder)}"></div>
      <p class="editor-rodape"><span data-palavras>0 palavras</span></p>`;

    const corpo = host.querySelector('.editor-corpo');

    // Sem isto o Enter cria <div>, que o seletor de bloco não reconhece.
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch {}
    const contador = host.querySelector('[data-palavras]');

    /* execCommand age sobre a seleção; clicar num botão da barra tira o foco
       do texto e levaria a seleção junto. Guardar o intervalo antes permite
       devolvê-lo na hora de aplicar o comando.

       A escuta é no selectionchange do documento, não no mouseup do corpo:
       quem arrasta para selecionar e solta o mouse fora do editor — o que
       acontece o tempo todo perto das bordas — nunca dispararia o mouseup
       aqui, e o comando acabaria aplicado à seleção anterior, ou a nada. */
    let selecao = null;

    const dentro = no => no && corpo.contains(no.nodeType === 1 ? no : no.parentNode);

    const guardar = () => {
      const sel = window.getSelection();
      if (sel.rangeCount && dentro(sel.anchorNode) && dentro(sel.focusNode)) {
        selecao = sel.getRangeAt(0);
      }
    };

    document.addEventListener('selectionchange', () => {
      guardar();
      sincronizarBloco();
    });

    const devolver = () => {
      const sel = window.getSelection();

      // Se a seleção viva já está no editor, ela é a verdade — restaurar por
      // cima dela só traria de volta um intervalo mais antigo.
      if (sel.rangeCount && dentro(sel.anchorNode)) return;

      // Intervalo guardado de um conteúdo que já foi substituído não serve.
      if (!selecao || !dentro(selecao.commonAncestorContainer)) return corpo.focus();

      sel.removeAllRanges();
      sel.addRange(selecao);
    };

    /* ---- Desfazer / refazer
       O desfazer do navegador se perde quando o editor mexe no HTML direto
       (tabela, limpeza de tamanhos, carregar o texto), então o editor guarda
       a própria história: uma foto do HTML (e da posição do cursor) a cada
       comando e a cada pausa na digitação. Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z e
       os botões da barra andam por ela. */
    /** @type {{ html: string, cursor: number }[]} */
    let historia = [];
    let passo = -1;
    let emLote = false;
    /** @type {number | undefined} */
    let esperaDigitacao;

    function posicaoDoCursor() {
      const sel = window.getSelection();
      if (!sel.rangeCount || !dentro(sel.focusNode)) return -1;
      const r = document.createRange();
      r.selectNodeContents(corpo);
      r.setEnd(sel.focusNode, sel.focusOffset);
      return r.toString().length;
    }

    /** @param {number} alvo */
    function colocarCursor(alvo) {
      corpo.focus();
      const sel = window.getSelection();
      const r = document.createRange();
      const andar = document.createTreeWalker(corpo, NodeFilter.SHOW_TEXT);
      let resto = alvo;
      let no;
      while ((no = andar.nextNode())) {
        const tamanho = no.textContent.length;
        if (resto <= tamanho) { r.setStart(no, Math.max(0, resto)); break; }
        resto -= tamanho;
      }
      if (!no) { r.selectNodeContents(corpo); r.collapse(false); }
      sel.removeAllRanges();
      sel.addRange(r);
    }

    function registrar() {
      clearTimeout(esperaDigitacao);
      esperaDigitacao = undefined;
      const html = corpo.innerHTML;
      if (historia[passo]?.html === html) { historia[passo].cursor = posicaoDoCursor(); return; }
      historia = historia.slice(0, passo + 1);
      historia.push({ html, cursor: posicaoDoCursor() });
      if (historia.length > 200) historia.shift();
      passo = historia.length - 1;
    }

    /** @param {number} direcao -1 desfaz, +1 refaz */
    function andarNaHistoria(direcao) {
      if (esperaDigitacao !== undefined) registrar();
      const destino = passo + direcao;
      if (destino < 0 || destino >= historia.length) return;
      passo = destino;
      corpo.innerHTML = historia[passo].html;
      colocarCursor(historia[passo].cursor);
      guardar();
      contar();
      sincronizarBloco();
    }

    const aplicar = (comando, valor) => {
      devolver();
      document.execCommand(comando, false, valor ?? null);
      guardar();
      corpo.focus();
      contar();
      if (!emLote) registrar();
    };

    function contar() {
      const texto = corpo.innerText.trim();
      const total = texto ? texto.split(/\s+/).length : 0;
      contador.textContent = `${formatNumber(total)} ${total === 1 ? 'palavra' : 'palavras'}`;
      aoMudar?.();
    }

    corpo.addEventListener('input', () => {
      contar();
      clearTimeout(esperaDigitacao);
      esperaDigitacao = window.setTimeout(registrar, 400);
    });

    corpo.addEventListener('keydown', (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const tecla = e.key.toLowerCase();
      if (tecla === 'z') { e.preventDefault(); andarNaHistoria(e.shiftKey ? 1 : -1); }
      else if (tecla === 'y') { e.preventDefault(); andarNaHistoria(1); }
    });

    historia = [{ html: corpo.innerHTML, cursor: -1 }];
    passo = 0;

    host.querySelectorAll('[data-historia]').forEach(btn => {
      btn.addEventListener('mousedown', e => e.preventDefault());
      btn.addEventListener('click', () => andarNaHistoria(Number(btn.dataset.historia)));
    });

    // Colar entra como texto puro: HTML vindo do Word ou de outro site traria
    // estilos que não são os da plataforma e que depois ninguém limpa.
    corpo.addEventListener('paste', (e) => {
      e.preventDefault();
      const texto = (e.clipboardData || window.clipboardData).getData('text/plain');
      const video = htmlDoVideo(texto);
      if (video) return aplicar('insertHTML', video);
      document.execCommand('insertText', false, texto);
    });

    host.querySelectorAll('[data-comando]').forEach(btn => {
      btn.addEventListener('mousedown', e => e.preventDefault());
      btn.addEventListener('click', () => aplicar(btn.dataset.comando));
    });

    const seletorDeBloco = host.querySelector('[data-bloco]');

    seletorDeBloco.addEventListener('change', (e) => {
      aplicar('formatBlock', `<${e.target.value}>`);
      limparDimensoes();
      sincronizarBloco();
    });

    /* Tamanho, peso e família vêm da folha de estilo — nunca do HTML. Um
       font-size embutido, herdado de um colar antigo ou de um comando do
       navegador, vence a regra do h2/h3 e faz dois títulos do mesmo nível
       aparecerem de tamanhos diferentes. */
    function limparDimensoes() {
      corpo.querySelectorAll('[style]').forEach(el => {
        el.style.fontSize = '';
        el.style.fontWeight = '';
        el.style.fontFamily = '';
        el.style.lineHeight = '';
        if (!el.getAttribute('style')) el.removeAttribute('style');
      });

      // <font size> é o que o execCommand antigo deixa para trás.
      corpo.querySelectorAll('font[size]').forEach(f => f.removeAttribute('size'));

      desembrulharNegritoDeTitulo();
    }

    /* Título já é negrito. Um <b> dentro dele não acrescenta nada e ainda
       atrapalha: a regra de negrito tem peso próprio e rebaixa o do título,
       fazendo dois títulos do mesmo nível saírem diferentes. */
    function desembrulharNegritoDeTitulo() {
      corpo.querySelectorAll('h2 b, h2 strong, h3 b, h3 strong, h4 b, h4 strong').forEach(el => {
        el.replaceWith(...el.childNodes);
      });
    }

    /* O select mostra o bloco onde o cursor está. Antes ele voltava para
       "Parágrafo" depois de cada uso, então nunca dizia o que o trecho era
       — e dois títulos iguais pareciam diferentes só porque o campo mentia. */
    function blocoAtual() {
      const sel = window.getSelection();
      if (!sel.rangeCount) return null;

      let no = sel.anchorNode;
      if (no && no.nodeType === 3) no = no.parentNode;

      while (no && no !== corpo) {
        const tag = no.tagName?.toLowerCase();
        if (['p', 'h2', 'h3', 'blockquote'].includes(tag)) return tag;
        no = no.parentNode;
      }
      return null;
    }

    function sincronizarBloco() {
      if (!dentro(window.getSelection().anchorNode)) return;
      seletorDeBloco.value = blocoAtual() || 'p';
    }

    host.querySelector('[data-cor]').addEventListener('input', (e) => {
      aplicar('foreColor', e.target.value);
    });

    const botaoLink = host.querySelector('[data-link]');
    botaoLink.addEventListener('mousedown', e => e.preventDefault());
    botaoLink.addEventListener('click', async () => {
      const temTexto = !!selecao && !selecao.collapsed;
      const digitado = await pedirTexto({
        titulo: 'Inserir link',
        placeholder: 'https://',
        tipo: 'url'
      });
      if (!digitado) return;
      const url = /^(https?:|mailto:|tel:)/i.test(digitado) ? digitado : `https://${digitado}`;
      const video = htmlDoVideo(url);
      if (video) return aplicar('insertHTML', video);
      if (temTexto) aplicar('createLink', url);
      else aplicar('insertHTML', `<a href="${escapeHtml(url)}">${escapeHtml(digitado)}</a>&nbsp;`);
    });

    /* ---- Imagem no meio do texto: envia para o Storage e entra onde está o cursor */
    const arquivoImagem = /** @type {HTMLInputElement} */ (host.querySelector('[data-arquivo-imagem]'));
    host.querySelector('[data-imagem]').addEventListener('mousedown', e => e.preventDefault());
    arquivoImagem.addEventListener('change', async () => {
      const file = arquivoImagem.files[0];
      arquivoImagem.value = '';
      if (!file) return;
      toast('Enviando imagem…');
      const url = await enviarImagem(file, 'conteudo');
      if (url) aplicar('insertHTML', `<p><img src="${escapeHtml(url)}" alt=""></p><p><br></p>`);
    });

    /* ---- Menus da barra (alinhamento e tabela) */
    const fecharMenus = () => host.querySelectorAll('[data-menu]').forEach(m => { m.hidden = true; });
    host.querySelectorAll('[data-abrir]').forEach(btn => {
      btn.addEventListener('mousedown', e => e.preventDefault());
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = host.querySelector(`[data-menu="${btn.dataset.abrir}"]`);
        const abrir = menu.hidden;
        fecharMenus();
        if (!abrir) return;
        if (btn.dataset.abrir === 'tabela') host.querySelector('[data-acoes-tabela]').hidden = !celulaAtual();
        menu.hidden = false;
      });
    });
    host.querySelectorAll('[data-menu]').forEach(m => m.addEventListener('mousedown', e => e.preventDefault()));
    document.addEventListener('click', (e) => { if (!host.contains(/** @type {Node} */ (e.target))) fecharMenus(); });

    host.querySelectorAll('[data-alinhar]').forEach(btn => btn.addEventListener('click', () => {
      aplicar(btn.dataset.alinhar);
      host.querySelector('[data-icone-alinhar]').innerHTML = ALINHAR[btn.dataset.alinhar].icone;
      fecharMenus();
    }));

    /* ---- Tabela: grade 6×6 para escolher o tamanho, como nos editores de texto */
    const grade = host.querySelector('[data-grade]');
    const rotuloGrade = host.querySelector('[data-grade-rotulo]');
    grade.addEventListener('mouseover', (e) => {
      const alvo = /** @type {HTMLElement} */ (e.target);
      if (!alvo.dataset.l) return;
      const l = Number(alvo.dataset.l), c = Number(alvo.dataset.c);
      grade.querySelectorAll('span').forEach(q => q.classList.toggle('is-on', Number(q.dataset.l) <= l && Number(q.dataset.c) <= c));
      rotuloGrade.textContent = `${l} × ${c}`;
    });
    grade.addEventListener('mouseleave', () => {
      grade.querySelectorAll('span').forEach(q => q.classList.remove('is-on'));
      rotuloGrade.textContent = 'Inserir tabela';
    });
    grade.addEventListener('click', (e) => {
      const alvo = /** @type {HTMLElement} */ (e.target);
      if (!alvo.dataset.l) return;
      const linha = `<tr>${'<td><br></td>'.repeat(Number(alvo.dataset.c))}</tr>`;
      aplicar('insertHTML', `<table><tbody>${linha.repeat(Number(alvo.dataset.l))}</tbody></table><p><br></p>`);
      fecharMenus();
    });

    /** @returns {HTMLTableCellElement | null} */
    function celulaAtual() {
      const sel = window.getSelection();
      let no = sel.rangeCount && dentro(sel.anchorNode) ? sel.anchorNode : (selecao && selecao.startContainer);
      if (no && no.nodeType === 3) no = no.parentNode;
      const cel = no && no.nodeType === 1 ? /** @type {HTMLElement} */ (no).closest('td, th') : null;
      return cel && corpo.contains(cel) ? /** @type {HTMLTableCellElement} */ (cel) : null;
    }

    host.querySelectorAll('[data-tabela]').forEach(btn => btn.addEventListener('click', () => {
      const cel = celulaAtual();
      fecharMenus();
      if (!cel) return;
      const tr = /** @type {HTMLTableRowElement} */ (cel.parentElement);
      const tabela = cel.closest('table');
      const col = cel.cellIndex;
      const acao = btn.dataset.tabela;
      if (acao === 'linha') {
        const nova = /** @type {HTMLTableRowElement} */ (tr.cloneNode(true));
        [...nova.cells].forEach(c => { c.innerHTML = '<br>'; });
        tr.after(nova);
      } else if (acao === 'coluna') {
        [...tabela.rows].forEach(r => {
          const ref = r.cells[col];
          const nova = document.createElement(ref ? ref.tagName.toLowerCase() : 'td');
          nova.innerHTML = '<br>';
          if (ref) ref.after(nova); else r.appendChild(nova);
        });
      } else if (acao === 'excluir-linha') {
        if (tabela.rows.length > 1) tr.remove(); else tabela.remove();
      } else if (acao === 'excluir-coluna') {
        if (tr.cells.length > 1) [...tabela.rows].forEach(r => r.cells[col]?.remove());
        else tabela.remove();
      } else {
        tabela.remove();
      }
      corpo.focus();
      contar();
      registrar();
    }));

    /* ---- Linha horizontal e limpar formatação */
    const botaoLinha = host.querySelector('[data-linha]');
    botaoLinha.addEventListener('mousedown', e => e.preventDefault());
    botaoLinha.addEventListener('click', () => aplicar('insertHTML', '<hr><p><br></p>'));

    /* Limpar: tira negrito, itálico, sublinhado, cor e link da seleção e
       devolve o bloco a parágrafo comum, alinhado à esquerda. */
    const botaoLimpar = host.querySelector('[data-limpar]');
    botaoLimpar.addEventListener('mousedown', e => e.preventDefault());
    botaoLimpar.addEventListener('click', () => {
      emLote = true;
      aplicar('removeFormat');
      aplicar('unlink');
      if (!celulaAtual()) aplicar('formatBlock', '<p>');
      aplicar('justifyLeft');
      emLote = false;
      registrar();
      host.querySelector('[data-icone-alinhar]').innerHTML = ALINHAR.justifyLeft.icone;
      sincronizarBloco();
    });

    /* Texto solto na raiz do contenteditable faz o formatBlock agir sobre o
       editor inteiro em vez do parágrafo — é a origem do "cliquei em Título 3
       e o resultado foi diferente a cada vez". Envolver em <p> na entrada
       deixa todo bloco com o mesmo ponto de partida. */
    function normalizar(html) {
      const caixa = document.createElement('div');
      caixa.innerHTML = html || '';

      const blocos = ['P', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'UL', 'OL', 'DIV', 'PRE', 'TABLE', 'HR'];
      let solto = null;

      [...caixa.childNodes].forEach(no => {
        const ehBloco = no.nodeType === 1 && blocos.includes(no.tagName);
        if (ehBloco) { solto = null; return; }
        if (no.nodeType === 3 && !no.textContent.trim()) return;

        if (!solto) {
          solto = document.createElement('p');
          caixa.insertBefore(solto, no);
        }
        solto.appendChild(no);
      });

      return caixa.innerHTML;
    }

    // Sem tabela (artigos do blog): o botão sai da barra.
    if (!tabela) host.querySelector('[data-abrir="tabela"]').closest('.editor-menu-wrap').remove();
    if (!imagem) host.querySelector('[data-imagem]').remove();

    return {
      html: () => corpo.innerHTML,
      texto: () => corpo.innerText,
      // Entra onde o cursor estiver — é assim que um vídeo fica no meio do texto.
      inserirHtml: (html) => aplicar('insertHTML', html),
      definir: (html) => {
        corpo.innerHTML = normalizar(html);
        limparDimensoes();
        contar();
        sincronizarBloco();
        // Texto carregado é o ponto de partida: o desfazer não volta antes dele.
        historia = [{ html: corpo.innerHTML, cursor: -1 }];
        passo = 0;
      },
      focar: () => corpo.focus()
    };
  }

  return { montar };
})();
