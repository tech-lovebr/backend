/* ==========================================================================
   LOVE B2B — Mensagens (Chat com Fornecedores / Clientes)
   Layout e funcionalidades idênticos ao padrão do App Love
   ========================================================================== */

const DEFAULT_B2B_MESSAGES_CONVERSATIONS = [
  {
    id: 'mariana-assessoria',
    name: 'Mariana & Co. Assessoria',
    category: 'Assessoria & Cerimonial',
    avatar: '../assets/theme_garden.jpg',
    online: true,
    lastMessage: 'Acabei de anexar nossa apresentação ...',
    time: '14:20',
    unread: 1,
    messages: [
      { sender: 'them', text: 'Olá Beatriz & Lucas! Tudo bem? Recebemos a solicitação de vocês para a data do casamento em 2026.', time: '14:10' },
      { sender: 'me', text: 'Olá Mariana! Que ótimo! Adoramos o portfólio de vocês. Poderia nos enviar a proposta detalhada com assessoria completa?', time: '14:15' },
      { sender: 'them', text: 'Com certeza! Acabei de anexar nossa apresentação com os valores e fotos dos últimos casamentos. Fico à disposição para agendarmos uma reunião ou degustação!', time: '14:20' }
    ]
  },
  {
    id: 'villa-bisutti',
    name: 'Villa Bisutti Casa do Ator',
    category: 'Espaço & Gastronomia',
    avatar: '../assets/theme_blacktie.jpg',
    online: true,
    lastMessage: 'A data de 28/08/2026 está pré-reservada ...',
    time: '11:05',
    unread: 0,
    messages: [
      { sender: 'them', text: 'Olá Beatriz & Lucas! Sejam muito bem-vindos ao Villa Bisutti.', time: '10:45' },
      { sender: 'me', text: 'Bom dia! Gostaríamos de saber sobre a capacidade máxima e o formato do buffet para 250 convidados.', time: '11:00' },
      { sender: 'them', text: 'A Casa do Ator comporta confortavelmente até 320 convidados sentados! A data de 28/08/2026 está pré-reservada para vocês. Gostariam de agendar uma visita guiada?', time: '11:05' }
    ]
  },
  {
    id: 'palacio-tangara',
    name: 'Palácio Tangará Hotel',
    category: 'Espaço de Luxo & Hotel',
    avatar: '../assets/theme_garden.jpg',
    online: false,
    lastMessage: 'Será um prazer recebê-los para o tour no j...',
    time: 'Ontem',
    unread: 0,
    messages: [
      { sender: 'me', text: 'Boa tarde! Qual é o procedimento para reservar o salão nobre e a suíte nupcial?', time: 'Ontem 16:30' },
      { sender: 'them', text: 'Olá! Será um prazer recebê-los para o tour no jardim Burle Marx nesta sexta-feira. Podemos preparar um welcome drink para o casal.', time: 'Ontem 17:15' }
    ]
  },
  {
    id: 'felipe-ramos-foto',
    name: 'Felipe Ramos Fotografia',
    category: 'Foto & Vídeo Cinema',
    avatar: '../assets/wedding_hero_banner.jpg',
    online: true,
    lastMessage: 'Enviei o link da nossa galeria completa de ...',
    time: 'Ontem',
    unread: 0,
    messages: [
      { sender: 'them', text: 'Olá noivos! Que honra poder registrar a história de vocês.', time: 'Ontem 13:00' },
      { sender: 'them', text: 'Enviei o link da nossa galeria completa de casamentos na praia e campo. Trabalhamos com cobertura de drone e fotos analógicas também!', time: 'Ontem 13:02' }
    ]
  },
  {
    id: 'espaco-wood',
    name: 'Espaço Wood Garden',
    category: 'Espaço Rústico Chic',
    avatar: '../assets/theme_coastal.jpg',
    online: false,
    lastMessage: 'Temos opções de cardápio vegetariano e t...',
    time: '26 Ago',
    unread: 0,
    messages: [
      { sender: 'them', text: 'Olá! Segue em anexo as opções de plantas baixas e cenários para a cerimônia no gazebo.', time: '26 Ago' },
      { sender: 'them', text: 'Temos opções de cardápio vegetariano e tradicional inclusas na contratação.', time: '26 Ago' }
    ]
  },
  {
    id: 'juliana-toledo',
    name: 'Juliana Toledo Cerimonial',
    category: 'Assessoria & Cerimonial',
    avatar: '../assets/theme_garden.jpg',
    online: false,
    lastMessage: 'Combinado! Nos falamos na quinta-feira p...',
    time: '22 Ago',
    unread: 0,
    messages: [
      { sender: 'me', text: 'Oi Juliana! Recebemos sua mensagem e já aprovamos os fornecedores de doces.', time: '22 Ago' },
      { sender: 'them', text: 'Combinado! Nos falamos na quinta-feira para o alinhamento do cronograma.', time: '22 Ago' }
    ]
  }
];

let b2bConversations = [];
let activeConvId = 'mariana-assessoria';

document.addEventListener('DOMContentLoaded', initB2BMensagens);

function initB2BMensagens() {
  // Carregar conversas do storage ou usar padrão
  try {
    const saved = localStorage.getItem('love_b2b_standalone_conversations');
    if (saved) {
      b2bConversations = JSON.parse(saved);
    }
  } catch (e) {
    b2bConversations = [];
  }

  if (!b2bConversations || !b2bConversations.length) {
    b2bConversations = JSON.parse(JSON.stringify(DEFAULT_B2B_MESSAGES_CONVERSATIONS));
  }

  activeConvId = b2bConversations[0] ? b2bConversations[0].id : 'mariana-assessoria';

  renderContactsList();
  renderActiveChat();
  setupChatEvents();
}

function saveConversations() {
  try {
    localStorage.setItem('love_b2b_standalone_conversations', JSON.stringify(b2bConversations));
  } catch (e) {}
}

function renderContactsList(searchQuery = '') {
  const listEl = document.getElementById('conv-list');
  if (!listEl) return;

  listEl.innerHTML = '';
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
    item.className = `p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
      isActive ? 'bg-[#EBF4FF] border-l-4 border-[#537bae]' : 'hover:bg-zinc-200/50 border-l-4 border-transparent'
    }`;

    item.innerHTML = `
      <div class="relative flex-shrink-0">
        <img src="${conv.avatar}" alt="${conv.name}" class="w-10 h-10 rounded-full object-cover border border-zinc-200">
        ${conv.online ? '<span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>' : ''}
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-1 mb-0.5">
          <h4 class="text-xs sm:text-sm font-medium ${isActive ? 'text-[#44688F] font-semibold' : 'text-zinc-900'} truncate">${conv.name}</h4>
          <span class="text-[10px] text-zinc-400 flex-shrink-0">${conv.time}</span>
        </div>
        <span class="inline-block text-[10px] font-medium text-zinc-500 bg-white/70 px-1.5 py-0.5 rounded border border-zinc-200/60 mb-1">${conv.category}</span>
        <p class="text-xs text-zinc-500 truncate leading-tight">${conv.lastMessage}</p>
      </div>
      ${conv.unread > 0 ? `<span class="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-2 ring-2 ring-white shadow-2xs" style="background-color: #27394f;"></span>` : ''}
    `;

    item.addEventListener('click', () => {
      activeConvId = conv.id;
      conv.unread = 0;
      saveConversations();
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

  const activeConv = b2bConversations.find(c => c.id === activeConvId) || b2bConversations[0];
  if (!activeConv) return;
  activeConvId = activeConv.id;

  if (nameEl) nameEl.textContent = activeConv.name;
  if (statusEl) {
    statusEl.innerHTML = `${activeConv.category} • <span class="${activeConv.online ? 'text-emerald-600 font-medium' : 'text-zinc-400'}">${activeConv.online ? 'Online agora' : 'Online recentemente'}</span>`;
  }
  if (avatarEl) avatarEl.src = activeConv.avatar;
  if (onlineDotEl) onlineDotEl.style.display = activeConv.online ? 'block' : 'none';

  container.innerHTML = `
    <div class="flex justify-center my-2">
      <span class="px-3 py-1 bg-white border border-zinc-200 text-zinc-400 text-[11px] rounded-full shadow-2xs">Hoje</span>
    </div>
  `;

  activeConv.messages.forEach(msg => {
    const isMe = msg.sender === 'me' || msg.from === 'me';
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
      } else {
        attachmentHTML = `
          <div class="mt-2 inline-flex items-center gap-2.5 px-3 py-2 rounded-xl ${isMe ? 'bg-white/15' : 'bg-zinc-100'} border border-zinc-200/50 text-xs">
            <span class="text-base">📄</span>
            <div class="min-w-0">
              <p class="font-medium truncate max-w-[170px]">${msg.attachment.name || 'Arquivo'}</p>
              ${msg.attachment.size ? `<span class="text-[10px] opacity-75">${msg.attachment.size}</span>` : ''}
            </div>
          </div>
        `;
      }
    }

    if (isMe) {
      row.innerHTML = `
        <div class="max-w-[80%] sm:max-w-[70%] space-y-1 text-right">
          <div class="chat-bubble-user-glass text-white p-3.5 rounded-2xl rounded-br-xs text-xs sm:text-sm leading-relaxed text-left" style="color: #FFFFFF !important;">
            ${msg.text ? `<p class="whitespace-pre-wrap break-words text-white" style="color: #FFFFFF !important;">${escapeMsg(msg.text)}</p>` : ''}
            ${attachmentHTML}
          </div>
          <div class="flex items-center justify-end gap-1 text-[10px] text-zinc-400 pr-1">
            <span>${msg.time || 'Agora'}</span>
            <span class="text-[#537bae] font-bold">✓✓</span>
          </div>
        </div>
        <div class="w-7 h-7 rounded-full bg-zinc-800 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 shadow-2xs">
          BL
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

  function sendMessage(text, attachment = null) {
    if (!text && !attachment) return;
    const conv = b2bConversations.find(c => c.id === activeConvId);
    if (!conv) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    conv.messages.push({
      sender: 'me',
      text: text || '',
      time: timeStr,
      attachment: attachment
    });

    conv.lastMessage = text || (attachment ? `[${attachment.name || 'Arquivo'}]` : '');
    conv.time = timeStr;

    // Move a conversa ativa para o topo da lista
    const idx = b2bConversations.indexOf(conv);
    if (idx > 0) {
      b2bConversations.splice(idx, 1);
      b2bConversations.unshift(conv);
    }

    saveConversations();
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

  if (attachBtn && fileInput) {
    attachBtn.addEventListener('click', (e) => {
      e.preventDefault();
      fileInput.click();
    });

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
          name: file.name,
          size: `${Math.round(file.size / 1024)} KB`
        });
      }
      fileInput.value = '';
    });
  }
}

function escapeMsg(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
