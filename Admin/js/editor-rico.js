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
  const BARRA = `
    <div class="editor-barra">
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

      <button type="button" class="editor-btn" data-comando="insertUnorderedList" title="Lista" aria-label="Lista">&bull;&mdash;</button>
      <button type="button" class="editor-btn" data-comando="insertOrderedList" title="Lista numerada" aria-label="Lista numerada">1&mdash;</button>

      <span class="editor-separador"></span>

      <label class="editor-cor" title="Cor do texto">
        <span>A</span>
        <input type="color" data-cor value="#101828" aria-label="Cor do texto">
      </label>

      <button type="button" class="editor-btn" data-link title="Inserir link" aria-label="Inserir link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 15l6 -6" /><path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464" /><path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463" /></svg>
      </button>
      <button type="button" class="editor-btn" data-comando="unlink" title="Remover link" aria-label="Remover link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 22v-2" /><path d="M9 15l3 -3" /><path d="M22 17h-2" /><path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072" /><path d="M3 3l18 18" /><path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463" /></svg>
      </button>
    </div>`;

  function montar(host, { placeholder = 'Escreva aqui.', aoMudar } = {}) {
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

    const aplicar = (comando, valor) => {
      devolver();
      document.execCommand(comando, false, valor ?? null);
      guardar();
      corpo.focus();
      contar();
    };

    function contar() {
      const texto = corpo.innerText.trim();
      const total = texto ? texto.split(/\s+/).length : 0;
      contador.textContent = `${formatNumber(total)} ${total === 1 ? 'palavra' : 'palavras'}`;
      aoMudar?.();
    }

    corpo.addEventListener('input', contar);

    // Colar entra como texto puro: HTML vindo do Word ou de outro site traria
    // estilos que não são os da plataforma e que depois ninguém limpa.
    corpo.addEventListener('paste', (e) => {
      e.preventDefault();
      const texto = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, texto);
    });

    host.querySelectorAll('[data-comando]').forEach(btn => {
      btn.addEventListener('mousedown', e => e.preventDefault());
      btn.addEventListener('click', () => aplicar(btn.dataset.comando));
    });

    const seletorDeBloco = host.querySelector('[data-bloco]');

    seletorDeBloco.addEventListener('change', (e) => {
      aplicar('formatBlock', `<${e.target.value}>`);
      sincronizarBloco();
    });

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
    botaoLink.addEventListener('click', () => {
      const url = window.prompt('Endereço do link (comece com https://)');
      if (url) aplicar('createLink', url);
    });

    /* Texto solto na raiz do contenteditable faz o formatBlock agir sobre o
       editor inteiro em vez do parágrafo — é a origem do "cliquei em Título 3
       e o resultado foi diferente a cada vez". Envolver em <p> na entrada
       deixa todo bloco com o mesmo ponto de partida. */
    function normalizar(html) {
      const caixa = document.createElement('div');
      caixa.innerHTML = html || '';

      const blocos = ['P', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'UL', 'OL', 'DIV', 'PRE'];
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

    return {
      html: () => corpo.innerHTML,
      texto: () => corpo.innerText,
      definir: (html) => { corpo.innerHTML = normalizar(html); contar(); sincronizarBloco(); },
      focar: () => corpo.focus()
    };
  }

  return { montar };
})();
