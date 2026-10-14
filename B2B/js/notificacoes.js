/* ==========================================================================
   LOVE B2B — Notificações
   Mesmo desenho e comportamento da página /notificacoes da plataforma do
   anfitrião (js/app.js da raiz: loadNotificationsFeed, renderNotificationsPage,
   markNotificationRead, markAllNotificationsRead). A busca e o número do
   sino ficam em js/shell.js (fetchB2BNotificacoes / updateNotificationsBadge),
   que roda em todas as páginas.
   ========================================================================== */

const NOTIFICATION_ICON_PATH = 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9';

let notificationsCache = [];

function notificationUserId() {
  return window.b2bSession && window.b2bSession.user.id;
}

// "agora", "há 5 min", "há 3h", "há 2d"; passou de uma semana, a data.
function formatNotificationTime(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `há ${diffD}d`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function unreadNotificationsCount() {
  return notificationsCache.filter(n => n.unread).length;
}

async function loadNotificationsFeed() {
  const userId = notificationUserId();
  if (!userId) return;
  const [rows, lidas] = await Promise.all([fetchB2BNotificacoes(userId), fetchB2BNotificacoesLidas(userId)]);
  notificationsCache = rows.map(n => ({
    id: n.id,
    titulo: n.titulo,
    mensagem: n.mensagem,
    linkUrl: n.link_url || null,
    linkLabel: n.link_label || null,
    time: n.created_at ? formatNotificationTime(n.created_at) : '',
    unread: !lidas.has(n.id)
  }));
  renderNotificationsPage();
  updateNotificationsBadge(unreadNotificationsCount());
}

async function markNotificationRead(notificacaoId) {
  const userId = notificationUserId();
  if (!userId) return;
  await supabaseClient
    .from('notificacao_leituras')
    .upsert({ notificacao_id: notificacaoId, user_id: userId }, { onConflict: 'notificacao_id,user_id', ignoreDuplicates: true });
}

async function markAllNotificationsRead() {
  const userId = notificationUserId();
  const unreadIds = notificationsCache.filter(n => n.unread).map(n => n.id);
  if (!userId || !unreadIds.length) return true;
  const rows = unreadIds.map(id => ({ notificacao_id: id, user_id: userId }));
  const { error } = await supabaseClient
    .from('notificacao_leituras')
    .upsert(rows, { onConflict: 'notificacao_id,user_id', ignoreDuplicates: true });
  if (error) { console.error('Erro ao marcar notificações como lidas:', error); return false; }
  await loadNotificationsFeed();
  return true;
}

function openNotificationLink(url) {
  if (!url) return;
  if (/^https?:\/\//i.test(url)) { window.open(url, '_blank', 'noopener'); return; }
  window.location.href = url;
}

function renderNotificationsPage() {
  const listEl = document.getElementById('notifications-list');
  if (!listEl) return;

  if (!notificationsCache.length) {
    listEl.innerHTML = '<div class="py-16 text-center text-sm text-zinc-400">Nenhuma notificação por enquanto.</div>';
    return;
  }

  // Todo texto que vem do banco passa por escapeHtml antes do innerHTML.
  listEl.innerHTML = notificationsCache.map((n, i) => `
    <div class="notification-row flex items-start gap-3.5 ${n.unread ? 'is-unread' : 'is-read'}" data-index="${i}">
      <div class="notification-row-icon">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${NOTIFICATION_ICON_PATH}"/></svg>
      </div>
      <div class="flex-1 min-w-0 flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-sm font-bold text-zinc-900">${escapeHtml(n.titulo)}</p>
          <p class="text-sm text-zinc-600 mt-0.5 leading-snug">${escapeHtml(n.mensagem)}</p>
          ${n.linkUrl && n.linkLabel ? `<p class="text-xs font-semibold mt-1.5" style="color:#537bae;">${escapeHtml(n.linkLabel)} →</p>` : ''}
        </div>
        <div class="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
          ${n.unread ? '<span class="notification-row-dot"></span>' : ''}
          <span class="text-xs text-zinc-400 whitespace-nowrap">${escapeHtml(n.time)}</span>
        </div>
      </div>
    </div>
  `).join('');

  listEl.querySelectorAll('.notification-row').forEach(row => {
    const n = notificationsCache[Number(row.dataset.index)];
    if (!n) return;
    row.addEventListener('click', () => {
      if (n.unread) {
        n.unread = false;
        markNotificationRead(n.id);
        updateNotificationsBadge(unreadNotificationsCount());
        renderNotificationsPage();
      }
      openNotificationLink(n.linkUrl);
    });
  });
}

async function initNotificacoesPage() {
  const authed = await window.b2bAuthReady;
  if (!authed) return;

  const markAllBtn = document.getElementById('notifications-mark-all-btn');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', async () => {
      if (markAllBtn.disabled) return;
      markAllBtn.disabled = true;
      const ok = await markAllNotificationsRead();
      markAllBtn.disabled = false;
      if (ok) showToast('Todas as notificações foram marcadas como lidas.');
      else showToast('Não foi possível marcar as notificações como lidas.', true);
    });
  }

  await loadNotificationsFeed();
  window.b2bPageReady?.();
}

document.addEventListener('DOMContentLoaded', initNotificacoesPage);
