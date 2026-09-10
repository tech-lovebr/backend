/* ==========================================================================
   LOVE B2B — CRM (lista de clientes captados)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  renderCrmLeads();
});

function renderCrmLeads() {
  const tbody = document.getElementById('crm-leads-table-body');
  if (!tbody) return;

  tbody.innerHTML = B2B_DATA.leads.map(l => `
    <tr>
      <td class="font-medium text-zinc-900">${escapeHtml(l.name)}</td>
      <td>${escapeHtml(l.event)}</td>
      <td>${escapeHtml(l.date)}</td>
      <td>${formatCurrency(l.value)}</td>
      <td><span class="status-badge status-${l.status}">${statusLabel(l.status)}</span></td>
    </tr>
  `).join('');
}
