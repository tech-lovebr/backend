/* ==========================================================================
   LOVE B2B — Meu Trabalho (visões de agenda: dia/semana/mês/lista)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const wrap = document.getElementById('work-view-tabs');
  if (!wrap) return;

  wrap.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b === btn));
    });
  });
});
