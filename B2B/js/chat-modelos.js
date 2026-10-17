/* ==========================================================================
   LOVE B2B — Chat: menu ⋮ das mensagens + modelos de mensagem (comandos)
   - Em cada mensagem enviada pelo fornecedor, o ⋮ abre: Copiar | Salvar
     modelo.
   - "Salvar modelo" abre o drawer "Modelo de mensagem": o texto (editável)
     e o comando (ex.: orcamento → /orcamento).
   - Na caixa de mensagem, digitar "/" mostra os comandos; clicar (ou
     Enter) manda o texto salvo na hora.
   Modelos ficam na tabela mensagem_modelos (migration 046). Se ela ainda
   não existir no banco, ficam só neste navegador (localStorage).
   Depende de mensagens.js (b2bConversations, activeConvId, b2bChatSend).
   ========================================================================== */

const MODELOS_LOCAL_KEY = 'b2b-mensagem-modelos';
let chatModelos = [];
let modelosNoBanco = true;

function slugComando(valor) {
  return String(valor || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^\/+/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function lerModelosLocais() {
  try { return JSON.parse(localStorage.getItem(MODELOS_LOCAL_KEY) || '[]'); } catch (e) { return []; }
}
function gravarModelosLocais() {
  localStorage.setItem(MODELOS_LOCAL_KEY, JSON.stringify(chatModelos));
}

async function carregarModelos() {
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  if (!session) return;
  const { data, error } = await supabaseClient
    .from('mensagem_modelos')
    .select('id, comando, texto')
    .eq('fornecedor_id', empresaId(session))
    .order('comando');
  if (error) {
    modelosNoBanco = false;
    chatModelos = lerModelosLocais();
    return;
  }
  modelosNoBanco = true;
  chatModelos = data || [];
}

async function salvarModelo(comando, texto) {
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  if (!session) return false;
  if (modelosNoBanco) {
    const { data, error } = await supabaseClient
      .from('mensagem_modelos')
      .upsert({ fornecedor_id: empresaId(session), comando, texto }, { onConflict: 'fornecedor_id,comando' })
      .select('id, comando, texto')
      .single();
    if (!error && data) {
      chatModelos = chatModelos.filter(m => m.comando !== comando).concat(data).sort((a, b) => a.comando.localeCompare(b.comando));
      return true;
    }
    console.warn('Modelo salvo só neste navegador (tabela mensagem_modelos indisponível).', error);
    modelosNoBanco = false;
  }
  chatModelos = chatModelos.filter(m => m.comando !== comando)
    .concat({ id: 'local-' + Date.now(), comando, texto })
    .sort((a, b) => a.comando.localeCompare(b.comando));
  gravarModelosLocais();
  return true;
}

async function excluirModelo(id) {
  const modelo = chatModelos.find(m => m.id === id);
  if (!modelo) return;
  chatModelos = chatModelos.filter(m => m.id !== id);
  if (modelosNoBanco && !String(id).startsWith('local-')) {
    const { error } = await supabaseClient.from('mensagem_modelos').delete().eq('id', id);
    if (error) console.error('Não foi possível excluir o modelo.', error);
  } else {
    gravarModelosLocais();
  }
}

/* ---------------- Menu ⋮ das mensagens ---------------- */

let menuMensagemTexto = '';
let menuMensagemIndice = -1;

function fecharMenuMensagem() {
  document.getElementById('chat-msg-menu')?.classList.remove('show');
}

function abrirMenuMensagem(btn, texto) {
  const menu = document.getElementById('chat-msg-menu');
  if (!menu) return;
  menuMensagemTexto = texto;
  const r = btn.getBoundingClientRect();
  menu.classList.add('show');
  const w = menu.offsetWidth, h = menu.offsetHeight;
  let left = r.left - w - 6;
  if (left < 8) left = Math.min(window.innerWidth - w - 8, r.right + 6);
  let top = r.top;
  if (top + h > window.innerHeight - 8) top = window.innerHeight - h - 8;
  menu.style.left = `${Math.max(8, left)}px`;
  menu.style.top = `${Math.max(8, top)}px`;
}

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch (e) {
    // Sem permissão de área de transferência: mostra o texto para copiar à mão.
    window.prompt('Copie a mensagem:', texto);
    return;
  }
  showToast('Mensagem copiada.');
}

/* ---------------- Drawer "Meus comandos" ----------------
   Duas telas no mesmo drawer: a lista (aberta pelo botão "Meus comandos"
   do cabeçalho) e o formulário (aberto por "Adicionar comando" ou pelo
   "Salvar comando" do ⋮ de uma mensagem, já com o texto dela). */

// De onde o formulário foi aberto: 'lista' volta pra lista ao salvar/cancelar;
// 'mensagem' (⋮) fecha o drawer.
let origemFormularioComando = 'lista';

function mostrarDrawerComandos() {
  document.getElementById('template-drawer')?.classList.add('show');
  document.getElementById('template-drawer-backdrop')?.classList.add('show');
}

function mostrarListaComandos() {
  document.getElementById('template-drawer-title').textContent = 'Comandos rápidos';
  document.getElementById('template-list-view').hidden = false;
  document.getElementById('template-form-view').hidden = true;
  // Sem nenhum comando, o "Adicionar comando" fica no meio da tela (logo
  // abaixo do aviso), não no rodapé.
  document.getElementById('template-add-btn').hidden = chatModelos.length === 0;
  document.getElementById('template-save-btn').hidden = true;
  // Na lista não tem "Fechar" (já tem o X); sem comandos, o rodapé some.
  document.getElementById('template-drawer-cancel').hidden = true;
  document.getElementById('template-drawer-footer').hidden = chatModelos.length === 0;
  renderListaModelosDrawer();
}

function mostrarFormularioComando(texto, origem) {
  origemFormularioComando = origem;
  // Primeiro comando (lista vazia): continua "Meus comandos", só aparecem os
  // campos abaixo do aviso.
  const primeiroComando = origem === 'lista' && chatModelos.length === 0;
  document.getElementById('template-drawer-title').textContent = primeiroComando ? 'Comandos rápidos' : 'Adicionar comando';
  document.getElementById('template-list-view').hidden = true;
  document.getElementById('template-form-view').hidden = false;
  document.getElementById('template-add-btn').hidden = true;
  document.getElementById('template-save-btn').hidden = false;
  document.getElementById('template-drawer-cancel').textContent = origem === 'lista' ? 'Voltar' : 'Cancelar';
  document.getElementById('template-drawer-cancel').hidden = false;
  document.getElementById('template-drawer-footer').hidden = false;
  document.getElementById('template-text').value = texto || '';
  document.getElementById('template-command').value = '';
  document.getElementById('template-error').hidden = true;
  setTimeout(() => document.getElementById(texto ? 'template-command' : 'template-text')?.focus(), 50);
}

function abrirMeusComandos() {
  mostrarListaComandos();
  mostrarDrawerComandos();
}

function abrirDrawerModelo(texto) {
  mostrarFormularioComando(texto, 'mensagem');
  mostrarDrawerComandos();
}

function cancelarDrawerComandos() {
  const noFormulario = !document.getElementById('template-form-view').hidden;
  if (noFormulario && origemFormularioComando === 'lista') { mostrarListaComandos(); return; }
  fecharDrawerModelo();
}

function fecharDrawerModelo() {
  document.getElementById('template-drawer')?.classList.remove('show');
  document.getElementById('template-drawer-backdrop')?.classList.remove('show');
}

function renderListaModelosDrawer() {
  const lista = document.getElementById('template-list');
  const vazio = document.getElementById('template-list-empty');
  if (!lista) return;
  if (vazio) vazio.hidden = chatModelos.length > 0;
  lista.innerHTML = chatModelos.map(m => `
    <div class="chat-template-item">
      <div class="min-w-0">
        <p class="chat-template-command">/${escapeHtml(m.comando)}</p>
        <p class="chat-template-preview">${escapeHtml(m.texto)}</p>
      </div>
      <button type="button" class="chat-template-remove" data-remove-template="${escapeHtml(m.id)}" title="Excluir comando">✕</button>
    </div>
  `).join('');
  lista.querySelectorAll('[data-remove-template]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await excluirModelo(btn.dataset.removeTemplate);
      mostrarListaComandos();
    });
  });
}

async function enviarFormularioModelo() {
  const texto = document.getElementById('template-text').value.trim();
  const comando = slugComando(document.getElementById('template-command').value);
  const erro = document.getElementById('template-error');
  const mostrarErro = (msg) => { erro.textContent = msg; erro.hidden = false; };
  if (!texto) return mostrarErro('Escreva a mensagem.');
  if (!comando) return mostrarErro('Dê um nome ao comando.');
  const btn = document.getElementById('template-save-btn');
  btn.disabled = true;
  const ok = await salvarModelo(comando, texto);
  btn.disabled = false;
  if (!ok) return mostrarErro('Não foi possível salvar o comando.');
  showToast(`Comando salvo. Digite /${comando} no chat para usar.`);
  if (origemFormularioComando === 'lista') mostrarListaComandos();
  else fecharDrawerModelo();
}

/* ---------------- "Salvar comando" do ⋮: pop-up pequeno ----------------
   Em vez do drawer: "Adicionar comando", a mensagem, o nome do comando e,
   embaixo, Cancelar | Salvar comando divididos ao meio. */
function abrirPopupSalvarComando(texto) {
  if (!texto) return;
  document.querySelector('.comando-popup-fundo')?.remove();
  const fundo = document.createElement('div');
  fundo.className = 'modal-backdrop show hub-confirmar comando-popup-fundo';
  fundo.innerHTML = `
    <div class="modal-card comando-popup" role="dialog" aria-modal="true" aria-labelledby="comando-popup-titulo">
      <div class="comando-popup-corpo">
        <h3 class="comando-popup-titulo" id="comando-popup-titulo">Adicionar comando</h3>
        <p class="comando-popup-rotulo">Mensagem</p>
        <p class="comando-popup-mensagem">${escapeHtml(texto)}</p>
        <label class="comando-popup-rotulo" for="comando-popup-nome">Nome do comando</label>
        <div class="comando-popup-campo">
          <span aria-hidden="true">/</span>
          <input id="comando-popup-nome" type="text" class="field-input" maxlength="40" autocomplete="off" spellcheck="false">
        </div>
        <p class="comando-popup-erro" hidden></p>
      </div>
      <div class="comando-popup-acoes">
        <button type="button" data-comando-cancelar>Cancelar</button>
        <button type="button" data-comando-salvar>Salvar comando</button>
      </div>
    </div>`;
  document.body.appendChild(fundo);
  const input = fundo.querySelector('#comando-popup-nome');
  const erro = fundo.querySelector('.comando-popup-erro');
  const salvarBtn = fundo.querySelector('[data-comando-salvar]');
  const fechar = () => { fundo.remove(); document.removeEventListener('keydown', aoTeclar); };
  const salvar = async () => {
    const comando = slugComando(input.value);
    if (!comando) { erro.textContent = 'Dê um nome ao comando.'; erro.hidden = false; input.focus(); return; }
    salvarBtn.disabled = true;
    const ok = await salvarModelo(comando, texto);
    salvarBtn.disabled = false;
    if (!ok) { erro.textContent = 'Não foi possível salvar o comando.'; erro.hidden = false; return; }
    fechar();
    showToast(`Comando salvo. Digite /${comando} no chat para usar.`);
  };
  const aoTeclar = (e) => { if (e.key === 'Escape') fechar(); };
  document.addEventListener('keydown', aoTeclar);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); salvar(); } });
  fundo.querySelector('[data-comando-cancelar]').addEventListener('click', fechar);
  salvarBtn.addEventListener('click', salvar);
  fundo.addEventListener('click', (e) => { if (e.target === fundo) fechar(); });
  setTimeout(() => input.focus(), 30);
}

/* ---------------- Comandos "/" na caixa de mensagem ---------------- */

let comandoSelecionado = 0;
let comandosVisiveis = [];

function filtrarComandos(valor) {
  if (!valor.startsWith('/') || /\s/.test(valor)) return null;
  const termo = slugComando(valor.slice(1));
  return chatModelos.filter(m => !termo || m.comando.startsWith(termo) || m.comando.includes(termo));
}

function renderMenuComandos() {
  const menu = document.getElementById('chat-command-menu');
  const input = document.getElementById('chat-input');
  if (!menu || !input) return;
  const filtrados = filtrarComandos(input.value);
  if (filtrados === null) { menu.hidden = true; comandosVisiveis = []; return; }
  comandosVisiveis = filtrados;
  if (comandoSelecionado >= filtrados.length) comandoSelecionado = 0;
  menu.hidden = false;
  menu.innerHTML = filtrados.length
    ? filtrados.map((m, i) => `
        <button type="button" class="chat-command-option ${i === comandoSelecionado ? 'is-active' : ''}" data-command-index="${i}">
          <span class="chat-template-command">/${escapeHtml(m.comando)}</span>
          <span class="chat-template-preview">${escapeHtml(m.texto)}</span>
        </button>
      `).join('')
    : `<p class="chat-command-empty">${chatModelos.length
        ? 'Nenhum comando com esse nome.'
        : 'Você ainda não tem comandos. Crie em "Comandos rápidos", no raio ao lado da caixa de mensagem.'}</p>`;
  menu.querySelectorAll('[data-command-index]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => e.preventDefault()); // não tira o foco do campo
    btn.addEventListener('click', () => usarComando(Number(btn.dataset.commandIndex)));
  });
}

async function usarComando(index) {
  const modelo = comandosVisiveis[index];
  const input = document.getElementById('chat-input');
  if (!modelo || !input) return;
  input.value = '';
  document.getElementById('chat-command-menu').hidden = true;
  if (typeof window.b2bChatSend === 'function') await window.b2bChatSend(modelo.texto);
}

/* ---------------- Ligações ---------------- */

async function initChatModelos() {
  const authed = await window.b2bAuthReady;
  if (!authed) return;
  await carregarModelos();

  // Copiar da mensagem do anfitrião: copia na hora, sem menu.
  document.getElementById('chat-messages')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-msg-copiar]');
    if (!btn) return;
    const conv = b2bConversations.find(c => c.id === activeConvId);
    const msg = conv && conv.messages[Number(btn.dataset.msgCopiar)];
    if (msg && msg.text) copiarTexto(msg.text);
  });

  // ⋮ das mensagens (delegação: o chat redesenha as mensagens o tempo todo)
  document.getElementById('chat-messages')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-msg-menu]');
    if (!btn) return;
    e.stopPropagation();
    const conv = b2bConversations.find(c => c.id === activeConvId);
    const msg = conv && conv.messages[Number(btn.dataset.msgMenu)];
    menuMensagemIndice = Number(btn.dataset.msgMenu);
    // Editar só uma vez: mensagem já editada fica só com Copiar (e Salvar comando).
    const editar = document.getElementById('chat-msg-menu-edit');
    if (editar) editar.hidden = !!(msg && msg.editedAt);
    if (msg && msg.text) abrirMenuMensagem(btn, msg.text);
  });
  document.getElementById('chat-msg-menu-edit')?.addEventListener('click', () => { fecharMenuMensagem(); window.iniciarEdicaoMensagem?.(menuMensagemIndice); });
  document.getElementById('chat-msg-menu-copy')?.addEventListener('click', () => { fecharMenuMensagem(); copiarTexto(menuMensagemTexto); });
  document.getElementById('chat-msg-menu-template')?.addEventListener('click', () => { fecharMenuMensagem(); abrirPopupSalvarComando(menuMensagemTexto); });
  document.addEventListener('click', (e) => { if (!e.target.closest('#chat-msg-menu')) fecharMenuMensagem(); });
  document.getElementById('chat-messages')?.addEventListener('scroll', fecharMenuMensagem);

  // Drawer
  document.getElementById('template-drawer-close')?.addEventListener('click', fecharDrawerModelo);
  document.getElementById('template-drawer-cancel')?.addEventListener('click', cancelarDrawerComandos);
  document.getElementById('template-add-btn')?.addEventListener('click', () => mostrarFormularioComando('', 'lista'));
  document.getElementById('template-empty-add-btn')?.addEventListener('click', () => mostrarFormularioComando('', 'lista'));
  document.getElementById('chat-commands-btn')?.addEventListener('click', abrirMeusComandos);
  document.getElementById('template-drawer-backdrop')?.addEventListener('click', fecharDrawerModelo);
  document.getElementById('template-save-btn')?.addEventListener('click', enviarFormularioModelo);
  const comandoInput = document.getElementById('template-command');
  comandoInput?.addEventListener('input', () => {
    const limpo = slugComando(comandoInput.value);
    if (comandoInput.value !== limpo) comandoInput.value = limpo;
  });

  // "/" na caixa de mensagem. Captura: roda antes do Enter-envia do mensagens.js.
  const input = document.getElementById('chat-input');
  if (input) {
    input.addEventListener('input', () => { comandoSelecionado = 0; renderMenuComandos(); });
    input.addEventListener('keydown', (e) => {
      const menu = document.getElementById('chat-command-menu');
      if (!menu || menu.hidden) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const n = comandosVisiveis.length;
        if (!n) return;
        comandoSelecionado = (comandoSelecionado + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
        renderMenuComandos();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (comandosVisiveis.length) usarComando(comandoSelecionado);
      } else if (e.key === 'Escape') {
        menu.hidden = true;
      }
    }, true);
    input.addEventListener('blur', () => setTimeout(() => {
      const menu = document.getElementById('chat-command-menu');
      if (menu) menu.hidden = true;
    }, 150));
  }
  // O submit do formulário (botão Enviar) também respeita o comando aberto.
  document.getElementById('chat-form')?.addEventListener('submit', (e) => {
    const menu = document.getElementById('chat-command-menu');
    if (menu && !menu.hidden && comandosVisiveis.length) {
      e.preventDefault();
      e.stopImmediatePropagation();
      usarComando(comandoSelecionado);
    }
  }, true);
}

document.addEventListener('DOMContentLoaded', initChatModelos);
