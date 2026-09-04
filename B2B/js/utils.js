/* ==========================================================================
   LOVE B2B — Utilitários compartilhados entre páginas
   ========================================================================== */

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatCurrency(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

const STATUS_LABELS = {
  novo: 'Novo',
  conversa: 'Em conversa',
  proposta: 'Proposta enviada',
  fechado: 'Fechado',
  enviado: 'Enviado',
  assinado: 'Assinado',
  recusado: 'Recusado',
  ativo: 'Ativo',
  inativo: 'Inativo',
  pendente: 'Convite pendente'
};

function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

let toastTimer = null;
function showToast(message, isError = false) {
  let toast = document.getElementById('b2b-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'b2b-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.style.background = isError ? '#B91C1C' : '#18181B';
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}
