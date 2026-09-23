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
  setupChatEvents();
  subscribeToB2BMessages();
}

async function loadB2BConversations() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  const { data: rows, error } = await supabaseClient
    .from('conversations')
    .select('id, last_message_at, cliente:clientes(id, couple_name, avatar_url), messages(id, text, created_at, sender_role, attachment_url, attachment_type)')
    .eq('fornecedor_id', session.user.id)
    .order('last_message_at', { ascending: false });

  if (error || !rows) { b2bConversations = []; return; }

  b2bConversations = rows.map(row => {
    const msgs = (row.messages || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const last = msgs[msgs.length - 1];
    return {
      id: row.id,
      name: (row.cliente && row.cliente.couple_name) || 'Cliente',
      category: '',
      avatar: (row.cliente && row.cliente.avatar_url) || '../assets/wedding_hero_banner.jpg',
      online: false,
      lastMessage: last ? (last.text || (last.attachment_url ? '[Anexo]' : '')) : 'Nova conversa',
      time: last ? formatB2BMsgTime(last.created_at) : '',
      unread: 0,
      messages: msgs.map(m => ({
        sender: m.sender_role === 'fornecedor' ? 'me' : 'them',
        text: m.text,
        time: formatB2BMsgTime(m.created_at),
        attachment: m.attachment_url ? { type: m.attachment_type || 'doc', url: m.attachment_url, name: 'Anexo' } : null
      }))
    };
  });
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
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async () => {
      const searchInput = document.getElementById('chat-search-input');
      await loadB2BConversations();
      if (!b2bConversations.some(c => c.id === activeConvId) && b2bConversations.length) {
        activeConvId = b2bConversations[0].id;
      }
      renderContactsList(searchInput ? searchInput.value : '');
      renderActiveChat();
    })
    .subscribe();
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
        <img src="${conv.avatar}" alt="${conv.name}" class="w-10 h-10 rounded-full object-cover border border-zinc-200">
        ${conv.online ? '<span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>' : ''}
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-1 mb-0.5">
          <h4 class="text-xs sm:text-sm font-medium ${isActive ? 'font-semibold' : 'text-zinc-900'} truncate">${conv.name}</h4>
          <span class="text-[10px] text-zinc-400 flex-shrink-0">${conv.time}</span>
        </div>
        <p class="text-xs text-zinc-500 truncate leading-tight">${conv.lastMessage}</p>
      </div>
    `;

    item.addEventListener('click', () => {
      activeConvId = conv.id;
      renderContactsList(document.getElementById('chat-search-input') ? document.getElementById('chat-search-input').value : '');
      renderActiveChat();
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
    return;
  }

  if (nameEl) nameEl.textContent = activeConv.name;
  if (statusEl) {
    statusEl.innerHTML = `<span class="${activeConv.online ? 'text-emerald-600 font-medium' : 'text-zinc-400'}">${activeConv.online ? 'Online agora' : ''}</span>`;
  }
  if (avatarEl) avatarEl.src = activeConv.avatar;
  if (onlineDotEl) onlineDotEl.style.display = activeConv.online ? 'block' : 'none';

  container.innerHTML = `
    <div class="flex justify-center my-2">
      <span class="px-3 py-1 bg-white border border-zinc-200 text-zinc-400 text-[11px] rounded-full shadow-2xs">Hoje</span>
    </div>
  `;

  activeConv.messages.forEach(msg => {
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
      row.innerHTML = `
        <div class="max-w-[80%] sm:max-w-[70%] space-y-1 text-right">
          <div class="chat-bubble-user-glass p-3.5 rounded-2xl rounded-br-xs text-xs sm:text-sm leading-relaxed text-left">
            ${msg.text ? `<p class="whitespace-pre-wrap break-words">${escapeMsg(msg.text)}</p>` : ''}
            ${attachmentHTML}
          </div>
          <div class="flex items-center justify-end gap-1 text-[10px] text-zinc-400 pr-1">
            <span>${msg.time || 'Agora'}</span>
          </div>
        </div>
      `;
    } else {
      row.innerHTML = `
        <img src="${activeConv.avatar}" alt="${activeConv.name}" class="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-zinc-200 mb-4">
        <div class="max-w-[80%] sm:max-w-[70%] space-y-1">
          <div class="bg-white border border-zinc-200/80 text-zinc-800 p-3.5 rounded-2xl rounded-bl-xs text-xs sm:text-sm leading-relaxed shadow-2xs">
            ${msg.text ? `<p class="whitespace-pre-wrap break-words">${escapeMsg(msg.text)}</p>` : ''}
            ${attachmentHTML}
          </div>
          <span class="text-[10px] text-zinc-400 pl-1 block">${msg.time || 'Agora'}</span>
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

  const closeAttachDropdown = () => attachDropdown && attachDropdown.classList.remove('show');

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
      closeAttachDropdown();
      openFormPickerModal(sendMessage);
    });
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

function openFormPickerModal(onPick) {
  const modal = document.getElementById('chat-form-modal');
  const list = document.getElementById('chat-form-modal-list');
  const closeBtn = document.getElementById('chat-form-modal-close');
  if (!modal || !list) return;

  const forms = (typeof B2B_DATA !== 'undefined' && B2B_DATA.siteForms) || [];

  list.innerHTML = forms.length
    ? forms.map(form => `
      <div class="form-list-item chat-form-pick-item" data-pick-form="${form.id}">
        <div class="form-list-item-icon form-list-item-icon-edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 3.75h6M9 8.25h2.25M9 21h6a2.25 2.25 0 0 0 2.25-2.25V6.622a2.25 2.25 0 0 0-.659-1.591l-2.622-2.622A2.25 2.25 0 0 0 12.378 1.75H9A2.25 2.25 0 0 0 6.75 4v14.75A2.25 2.25 0 0 0 9 21Z"/></svg>
        </div>
        <div class="form-list-item-info">
          <p class="form-list-item-title">${escapeMsg(form.title)}</p>
          <p class="form-list-item-meta">${form.fields.length} ${form.fields.length === 1 ? 'pergunta' : 'perguntas'}</p>
        </div>
      </div>
    `).join('')
    : `<p class="text-sm text-zinc-500 text-center py-4">Você ainda não criou nenhum formulário.</p>`;

  list.querySelectorAll('[data-pick-form]').forEach(item => {
    item.addEventListener('click', () => {
      const form = forms.find(f => f.id === item.dataset.pickForm);
      if (!form) return;
      close();
      onPick('', { type: 'form', name: form.title });
    });
  });

  const close = () => modal.classList.remove('show');
  modal.classList.add('show');

  if (closeBtn) closeBtn.onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };
}

function escapeMsg(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
