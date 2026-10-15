/* ==========================================================================
   LOVE B2B — Mensagens (Chat real com clientes, via Supabase)
   ========================================================================== */

let b2bConversations = [];
let activeConvId = null;
let b2bMessagesChannel = null;

document.addEventListener('DOMContentLoaded', initB2BMensagens);

async function initB2BMensagens() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return; // shell.js já redireciona pro login nesse caso

  await loadB2BConversations();
  if (b2bConversations.length) activeConvId = b2bConversations[0].id;

  renderContactsList();
  renderActiveChat();
  markActiveConversationRead();
  // Formulários (+ › Formulário) vêm do banco — site_formularios.
  if (typeof loadSiteForms === 'function') loadSiteForms();
  setupChatEvents();
  subscribeToB2BMessages();
  window.b2bPageReady?.();
}

async function loadB2BConversations() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  // edited_at vem da migration 057_editar_mensagem_chat; sem ela, carrega sem.
  const consultar = (campos) => supabaseClient
    .from('conversations')
    .select(`id, last_message_at, cliente:clientes(id, couple_name, avatar_url), messages(${campos})`)
    .eq('fornecedor_id', session.user.id)
    .order('last_message_at', { ascending: false });
  let { data: rows, error } = await consultar('id, text, created_at, sender_role, attachment_url, attachment_type, read_at, edited_at');
  if (error) ({ data: rows, error } = await consultar('id, text, created_at, sender_role, attachment_url, attachment_type, read_at'));

  if (error || !rows) { b2bConversations = []; return; }

  b2bConversations = rows.map(row => {
    const msgs = (row.messages || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const last = msgs[msgs.length - 1];
    return {
      id: row.id,
      clienteId: (row.cliente && row.cliente.id) || null,
      name: (row.cliente && row.cliente.couple_name) || 'Cliente',
      category: '',
      avatar: (row.cliente && row.cliente.avatar_url) || null,
      online: false,
      lastMessage: last ? (last.text || (last.attachment_url ? '[Anexo]' : '')) : 'Nova conversa',
      time: last ? formatB2BMsgTime(last.created_at) : '',
      unread: msgs.filter(m => m.sender_role === 'cliente' && !m.read_at).length,
      messages: msgs.map(m => ({
        id: m.id,
        editedAt: m.edited_at || null,
        sender: m.sender_role === 'fornecedor' ? 'me' : 'them',
        text: m.text,
        time: formatB2BMsgTime(m.created_at),
        attachment: m.attachment_url ? { type: m.attachment_type || 'doc', url: m.attachment_url, name: 'Anexo' } : null
      }))
    };
  });
}

// Conversa aberta = mensagens do cliente lidas (marcar_conversa_lida,
// migration 045); o número do ícone do chat atualiza junto.
async function markActiveConversationRead() {
  const conv = b2bConversations.find(c => c.id === activeConvId);
  if (!conv || !conv.unread) return;
  conv.unread = 0;
  renderContactsList(document.getElementById('chat-search-input')?.value || '');
  const { error } = await supabaseClient.rpc('marcar_conversa_lida', { p_conversation_id: conv.id });
  if (error) console.error('Não foi possível marcar a conversa como lida.', error);
  window.b2bRefreshChatUnreadBadge?.();
}

function formatB2BMsgTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (isToday) return hhmm;
  if (isYesterday) return `Ontem ${hhmm}`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function subscribeToB2BMessages() {
  if (b2bMessagesChannel) supabaseClient.removeChannel(b2bMessagesChannel);
  b2bMessagesChannel = supabaseClient
    .channel('b2b-mensagens')
    // Mensagem editada (aqui ou pelo anfitrião): redesenha com o texto novo.
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, async () => {
      if (mensagemEmEdicaoId) return;
      await loadB2BConversations();
      renderActiveChat();
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async () => {
      const searchInput = document.getElementById('chat-search-input');
      await loadB2BConversations();
      if (!b2bConversations.some(c => c.id === activeConvId) && b2bConversations.length) {
        activeConvId = b2bConversations[0].id;
      }
      renderContactsList(searchInput ? searchInput.value : '');
      renderActiveChat();
      // Chegou mensagem na conversa que está aberta: já conta como lida.
      markActiveConversationRead();
    })
    .subscribe();
}

// Mesmo ícone de perfil padrão usado no cabeçalho (B2B_PROFILE_ICON, definido
// em shell.js) — quadrado com cantos arredondados, nunca foto/placeholder
// genérico quando o cliente ainda não tem avatar cadastrado.
function b2bAvatarHtml(url, name) {
  // Avatar "de iniciais" gerado pelo love.com.br (SVG com fundo azul claro):
  // desenha as iniciais aqui mesmo, em fundo branco, como as outras caixinhas.
  const ehIniciaisGeradas = url && /^data:image\/svg\+xml/i.test(url);
  if (url && !ehIniciaisGeradas) return `<img src="${url}" alt="">`;
  return typeof initialsAvatarHtml === 'function' ? initialsAvatarHtml(name) : '';
}

function renderContactsList(searchQuery = '') {
  const listEl = document.getElementById('conv-list');
  if (!listEl) return;

  listEl.innerHTML = '';

  if (!b2bConversations.length) {
    listEl.innerHTML = '<div class="p-6 text-center text-xs text-zinc-400">Nenhuma conversa ainda. Quando um cliente falar com você, ela aparece aqui.</div>';
    return;
  }

  const q = searchQuery.toLowerCase().trim();
  const filtered = b2bConversations.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.category.toLowerCase().includes(q) ||
    c.lastMessage.toLowerCase().includes(q)
  );

  if (filtered.length === 0) {
    listEl.innerHTML = '<div class="p-6 text-center text-xs text-zinc-400">Nenhuma conversa encontrada.</div>';
    return;
  }

  filtered.forEach(conv => {
    const isActive = conv.id === activeConvId;
    const item = document.createElement('div');
    item.className = `conv-item p-3.5 flex items-start gap-3 cursor-pointer transition-colors border-l-4 ${
      isActive ? 'active' : 'hover:bg-zinc-200/50 border-transparent'
    }`;

    item.innerHTML = `
      <div class="relative flex-shrink-0">
        <span class="w-10 h-10 b2b-avatar-square border border-zinc-200">${b2bAvatarHtml(conv.avatar, conv.name)}</span>
        ${conv.online ? '<span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>' : ''}
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-1 mb-0.5">
          <h4 class="text-xs sm:text-sm font-medium ${isActive ? 'font-semibold' : 'text-zinc-900'} truncate">${conv.name}</h4>
          <span class="text-[10px] text-zinc-400 flex-shrink-0">${conv.time}</span>
        </div>
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs ${conv.unread ? 'text-zinc-900 font-semibold' : 'text-zinc-500'} truncate leading-tight">${conv.lastMessage}</p>
          ${conv.unread ? `<span class="chat-unread-count">${conv.unread > 99 ? '99+' : conv.unread}</span>` : ''}
        </div>
      </div>
    `;

    item.addEventListener('click', () => {
      activeConvId = conv.id;
      renderContactsList(document.getElementById('chat-search-input') ? document.getElementById('chat-search-input').value : '');
      renderActiveChat();
      markActiveConversationRead();
    });

    listEl.appendChild(item);
  });
}

function renderActiveChat() {
  const container = document.getElementById('chat-messages');
  const nameEl = document.getElementById('chat-header-name');
  const statusEl = document.getElementById('chat-header-status');
  const avatarEl = document.getElementById('chat-header-avatar');
  const onlineDotEl = document.getElementById('chat-header-online-dot');
  if (!container) return;

  const activeConv = b2bConversations.find(c => c.id === activeConvId);
  if (!activeConv) {
    container.innerHTML = '<div class="flex items-center justify-center h-full text-sm text-zinc-400">Nenhuma conversa selecionada.</div>';
    if (nameEl) nameEl.textContent = '';
    if (statusEl) statusEl.innerHTML = '';
    if (avatarEl) avatarEl.innerHTML = b2bAvatarHtml(null);
    return;
  }

  if (nameEl) nameEl.textContent = activeConv.name;
  if (statusEl) {
    statusEl.innerHTML = `<span class="${activeConv.online ? 'text-emerald-600 font-medium' : 'text-zinc-400'}">${activeConv.online ? 'Online agora' : ''}</span>`;
  }
  if (avatarEl) avatarEl.innerHTML = b2bAvatarHtml(activeConv.avatar, activeConv.name);
  if (onlineDotEl) onlineDotEl.style.display = activeConv.online ? 'block' : 'none';

  container.innerHTML = `
    <div class="flex justify-center my-2">
      <span class="px-3 py-1 bg-white border border-zinc-200 text-zinc-400 text-[11px] rounded-full shadow-2xs">Hoje</span>
    </div>
  `;

  activeConv.messages.forEach((msg, msgIndex) => {
    const isMe = msg.sender === 'me';
    const row = document.createElement('div');
    row.className = `flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`;

    let attachmentHTML = '';
    if (msg.attachment) {
      if (msg.attachment.type === 'image') {
        attachmentHTML = `
          <div class="mt-2 rounded-xl overflow-hidden max-w-xs border border-white/20 shadow-xs cursor-pointer">
            <img src="${msg.attachment.url}" alt="${msg.attachment.name || 'Foto'}" class="w-full h-auto object-cover max-h-56 hover:scale-102 transition-transform">
          </div>
        `;
      } else if (msg.attachment.type === 'form') {
        attachmentHTML = `
          <div class="mt-2 inline-flex items-center px-3 py-2 rounded-xl ${isMe ? 'bg-white/15' : 'bg-zinc-100'} border border-zinc-200/50 text-xs">
            <p class="font-medium truncate max-w-[220px]">${escapeMsg(msg.attachment.name || 'Formulário')}</p>
          </div>
        `;
      } else {
        attachmentHTML = `
          <div class="mt-2 inline-flex items-center gap-2.5 px-3 py-2 rounded-xl ${isMe ? 'bg-white/15' : 'bg-zinc-100'} border border-zinc-200/50 text-xs">
            <span class="text-base">📄</span>
            <div class="min-w-0">
              <p class="font-medium truncate max-w-[170px]">${msg.attachment.name || 'Arquivo'}</p>
            </div>
          </div>
        `;
      }
    }

    if (isMe) {
      const myPhoto = typeof B2B_DATA !== 'undefined' && B2B_DATA.professional && B2B_DATA.professional.profilePhoto;
      // ⋮ (vertical) à esquerda da bolha, na mesma linha dela: Editar /
      // Copiar / Salvar comando (js/chat-modelos.js). A hora fica embaixo.
      row.innerHTML = `
        <div class="max-w-[80%] sm:max-w-[70%] space-y-1 text-right">
          <div class="chat-msg-linha chat-msg-linha--minha">
          ${msg.text ? `<button type="button" class="chat-msg-acao-btn chat-msg-menu-btn" data-msg-menu="${msgIndex}" title="Opções" aria-label="Opções da mensagem"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg></button>` : ''}
          <div class="chat-bubble-user-glass p-3.5 rounded-2xl rounded-br-xs text-xs sm:text-sm leading-relaxed text-left">
            ${msg.id && msg.id === mensagemEmEdicaoId
              ? `<div class="chat-msg-edicao">
                  <textarea class="chat-msg-edicao-campo" data-edicao-campo rows="2">${escapeMsg(msg.text || '')}</textarea>
                  <div class="chat-msg-edicao-acoes">
                    <button type="button" class="btn-secondary" data-edicao-cancelar>Cancelar</button>
                    <button type="button" class="btn-primary" data-edicao-salvar="${msgIndex}">Salvar</button>
                  </div>
                </div>`
              : (msg.text ? `<p class="whitespace-pre-wrap break-words">${escapeMsg(msg.text)}</p>` : '')}
            ${attachmentHTML}
          </div>
          </div>
          <div class="flex items-center justify-end gap-1 text-[10px] text-zinc-400 pr-1">
            ${msg.editedAt ? '<span class="chat-msg-editado">(editado)</span>' : ''}
            <span>${msg.time || 'Agora'}</span>
          </div>
        </div>
        <span class="w-7 h-7 b2b-avatar-square border border-zinc-200 mb-4">${b2bAvatarHtml(myPhoto, B2B_DATA.professional.company || B2B_DATA.professional.name)}</span>
      `;
    } else {
      // Pedido de orçamento enviado pelo love.com.br vira um card destacado
      // com o botão "Criar orçamento".
      const pedido = typeof lerPedidoOrcamento === 'function' ? lerPedidoOrcamento(msg.text) : null;
      row.innerHTML = `
        <span class="w-7 h-7 b2b-avatar-square border border-zinc-200 mb-4">${b2bAvatarHtml(activeConv.avatar, activeConv.name)}</span>
        <div class="max-w-[80%] sm:max-w-[70%] space-y-1">
          <div class="chat-msg-linha">
          ${pedido ? pedidoOrcamentoCardHtml(pedido, `data-criar-orcamento="${msgIndex}"`) : `<div class="bg-white border border-zinc-200/80 text-zinc-800 p-3.5 rounded-2xl rounded-bl-xs text-xs sm:text-sm leading-relaxed shadow-2xs">
            ${msg.text ? `<p class="whitespace-pre-wrap break-words">${escapeMsg(msg.text)}</p>` : ''}
            ${attachmentHTML}
          </div>`}
          ${msg.text ? `<button type="button" class="chat-msg-acao-btn" data-msg-copiar="${msgIndex}" title="Copiar" aria-label="Copiar mensagem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg></button>` : ''}
          </div>
          <span class="text-[10px] text-zinc-400 pl-1 block">${msg.editedAt ? '(editado) ' : ''}${msg.time || 'Agora'}</span>
        </div>
      `;
    }

    container.appendChild(row);
  });

  container.scrollTop = container.scrollHeight;
}

function setupChatEvents() {
  const searchInput = document.getElementById('chat-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderContactsList(e.target.value);
    });
  }

  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const attachBtn = document.getElementById('chat-attach-btn');
  const fileInput = document.getElementById('chat-file-input');

  async function sendMessage(text, attachment = null) {
    if (!text && !attachment) return;
    if (!activeConvId) return;

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    const { error } = await supabaseClient.from('messages').insert({
      conversation_id: activeConvId,
      sender_id: session.user.id,
      sender_role: 'fornecedor',
      text: text || null,
      attachment_url: attachment ? attachment.url : null,
      attachment_type: attachment ? attachment.type : null
    });

    if (error) { console.error('Erro ao enviar mensagem:', error); return; }

    await supabaseClient.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', activeConvId);

    await loadB2BConversations();
    renderContactsList(searchInput ? searchInput.value : '');
    renderActiveChat();

    if (input) input.value = '';
  }

  // Usado pelos comandos de modelo (js/chat-modelos.js) pra mandar o texto salvo.
  window.b2bChatSend = (text) => sendMessage(text);

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!input) return;
      sendMessage(input.value.trim());
    });
  }

  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input.value.trim());
      }
    });
  }

  const attachDropdown = document.getElementById('chat-attach-dropdown');
  const attachFileOption = document.getElementById('chat-attach-file-option');
  const attachFormOption = document.getElementById('chat-attach-form-option');
  const attachMenuView = document.getElementById('chat-attach-menu-view');
  const attachFormView = document.getElementById('chat-attach-form-view');
  const attachFormBack = document.getElementById('chat-attach-form-back');

  const showAttachMenuView = () => {
    if (attachMenuView) attachMenuView.hidden = false;
    if (attachFormView) attachFormView.hidden = true;
  };

  const closeAttachDropdown = () => {
    if (!attachDropdown) return;
    attachDropdown.classList.remove('show');
    // Sempre volta pro menu principal (Arquivo/Formulário) da próxima vez
    // que o "+" for aberto, em vez de continuar na lista de formulários.
    showAttachMenuView();
  };

  if (attachBtn && attachDropdown) {
    attachBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      attachDropdown.classList.toggle('show');
    });
    attachDropdown.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', closeAttachDropdown);
  }

  if (attachFileOption && fileInput) {
    attachFileOption.addEventListener('click', () => {
      closeAttachDropdown();
      fileInput.click();
    });
  }

  if (attachFormOption) {
    attachFormOption.addEventListener('click', () => {
      // Em vez de abrir um popup separado, troca pra lista de formulários
      // dentro da mesma caixa que já mostrava Arquivo/Formulário.
      renderAttachFormList(sendMessage);
      if (attachMenuView) attachMenuView.hidden = true;
      if (attachFormView) attachFormView.hidden = false;
    });
  }

  if (attachFormBack) {
    attachFormBack.addEventListener('click', showAttachMenuView);
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          sendMessage('', {
            type: 'image',
            url: evt.target.result,
            name: file.name
          });
        };
        reader.readAsDataURL(file);
      } else {
        sendMessage('', {
          type: 'doc',
          name: file.name
        });
      }
      fileInput.value = '';
    });
  }
}

function renderAttachFormList(onPick) {
  const list = document.getElementById('chat-attach-form-list');
  if (!list) return;

  const forms = (typeof B2B_DATA !== 'undefined' && B2B_DATA.siteForms) || [];

  list.innerHTML = forms.length
    ? forms.map(form => `
      <div class="chat-attach-form-item" data-pick-form="${form.id}">
        <p class="chat-attach-form-item-title">${escapeMsg(form.title)}</p>
        <p class="chat-attach-form-item-meta">${form.fields.length} ${form.fields.length === 1 ? 'pergunta' : 'perguntas'}</p>
      </div>
    `).join('')
    : `<div class="chat-attach-form-empty">
        <p>Você ainda não criou nenhum formulário.</p>
        <a href="paginas-site?tab=formularios&novo=1" class="btn-primary chat-attach-form-create">Criar formulário</a>
      </div>`;

  list.querySelectorAll('[data-pick-form]').forEach(item => {
    item.addEventListener('click', () => {
      const form = forms.find(f => f.id === item.dataset.pickForm);
      if (!form) return;
      document.getElementById('chat-attach-dropdown')?.classList.remove('show');
      document.getElementById('chat-attach-menu-view').hidden = false;
      document.getElementById('chat-attach-form-view').hidden = true;
      onPick('', { type: 'form', name: form.title });
    });
  });
}

function escapeMsg(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* "Criar orçamento" no card de pedido: acha o lead do anfitrião (mesmo
   cliente, de preferência o do mesmo serviço — é o que solicitar_orcamento
   criou) e abre a Proposta em Vendas já preenchida. */
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-criar-orcamento]');
  if (!btn) return;
  const conv = b2bConversations.find(c => c.id === activeConvId);
  const msg = conv && conv.messages[Number(btn.dataset.criarOrcamento)];
  const pedido = msg && lerPedidoOrcamento(msg.text);
  if (!pedido) return;
  btn.disabled = true;

  let leadId = null;
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && conv.clienteId) {
      const { data } = await supabaseClient.from('leads')
        .select('id, event_name')
        .eq('fornecedor_id', session.user.id)
        .eq('cliente_id', conv.clienteId)
        .order('created_at', { ascending: false });
      const leads = data || [];
      const doServico = pedido.servico && leads.find(l => (l.event_name || '').trim().toLowerCase() === pedido.servico.toLowerCase());
      leadId = (doServico || leads[0] || {}).id || null;
    }
  } catch (err) { /* segue sem o lead: a Proposta usa o cliente */ }

  window.location.href = urlCriarOrcamento({
    leadId, clienteId: conv.clienteId, servico: pedido.servico,
    data: pedido.data, convidados: pedido.convidados, evento: pedido.evento
  });
});

/* ---------------- Editar mensagem (⋮ › Editar) ----------------
   Edição no próprio balão: o texto vira um campo com Cancelar/Salvar.
   Salvar grava o texto novo e edited_at (migration 057_editar_mensagem_chat:
   só o autor altera a própria mensagem); o chat mostra "(editado)". */
let mensagemEmEdicaoId = null;

window.iniciarEdicaoMensagem = function (msgIndex) {
  const conv = b2bConversations.find(c => c.id === activeConvId);
  const msg = conv && conv.messages[msgIndex];
  if (!msg || !msg.id || msg.sender !== 'me') return;
  mensagemEmEdicaoId = msg.id;
  renderActiveChat();
  const campo = document.querySelector('[data-edicao-campo]');
  if (campo) {
    campo.focus();
    campo.setSelectionRange(campo.value.length, campo.value.length);
    campo.style.height = 'auto';
    campo.style.height = campo.scrollHeight + 'px';
  }
};

function cancelarEdicaoMensagem() {
  mensagemEmEdicaoId = null;
  renderActiveChat();
}

async function salvarEdicaoMensagem(msgIndex) {
  const conv = b2bConversations.find(c => c.id === activeConvId);
  const msg = conv && conv.messages[msgIndex];
  const campo = document.querySelector('[data-edicao-campo]');
  if (!msg || !campo) return;
  const texto = campo.value.trim();
  if (!texto) { showToast('A mensagem não pode ficar vazia.', true); return; }
  if (texto === (msg.text || '').trim()) { cancelarEdicaoMensagem(); return; }

  const { data, error } = await supabaseClient.from('messages')
    .update({ text: texto, edited_at: new Date().toISOString() })
    .eq('id', msg.id)
    .select('id');
  if (error || !data || !data.length) {
    showToast('Não foi possível editar a mensagem.', true);
    return;
  }
  msg.text = texto;
  msg.editedAt = new Date().toISOString();
  mensagemEmEdicaoId = null;
  renderActiveChat();
  showToast('Mensagem editada.');
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-edicao-cancelar]')) { cancelarEdicaoMensagem(); return; }
  const salvar = e.target.closest('[data-edicao-salvar]');
  if (salvar) salvarEdicaoMensagem(Number(salvar.dataset.edicaoSalvar));
});

document.addEventListener('keydown', (e) => {
  const campo = e.target.closest && e.target.closest('[data-edicao-campo]');
  if (!campo) return;
  if (e.key === 'Escape') { e.preventDefault(); cancelarEdicaoMensagem(); }
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const btn = document.querySelector('[data-edicao-salvar]');
    if (btn) salvarEdicaoMensagem(Number(btn.dataset.edicaoSalvar));
  }
});

document.addEventListener('input', (e) => {
  const campo = e.target.closest && e.target.closest('[data-edicao-campo]');
  if (!campo) return;
  campo.style.height = 'auto';
  campo.style.height = campo.scrollHeight + 'px';
});
