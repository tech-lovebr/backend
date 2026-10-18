/* ==========================================================================
   LOVE B2B — Olhinho para ver a senha (igual ao love.com.br)
   Todo campo de senha da página ganha, à direita, um botão que alterna
   entre mostrar e esconder o que foi digitado. Campo de e-mail não tem.
   ========================================================================== */
(function () {
  const OLHO_ABERTO = '<svg class="ver-senha-aberto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
  const OLHO_RISCADO = '<svg class="ver-senha-riscado" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" hidden><path d="M3 3l18 18"/><path d="M10.6 5.6A9.9 9.9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.8M6.3 6.9C3.9 8.6 2.5 12 2.5 12S6 18.5 12 18.5a9.6 9.6 0 0 0 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

  function ligar(campo) {
    if (campo.dataset.verSenhaLigado) return;
    campo.dataset.verSenhaLigado = '1';
    const caixa = document.createElement('div');
    caixa.className = 'campo-com-ver-senha';
    campo.parentNode.insertBefore(caixa, campo);
    caixa.appendChild(campo);
    campo.classList.add('campo-senha-com-olho');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ver-senha-btn';
    btn.setAttribute('data-ver-senha', '');
    btn.setAttribute('aria-label', 'Mostrar senha');
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = OLHO_ABERTO + OLHO_RISCADO;
    caixa.appendChild(btn);

    const usaBolinhasPorCss = getComputedStyle(campo).webkitTextSecurity === 'disc';
    btn.addEventListener('click', () => {
      const mostrando = btn.getAttribute('aria-pressed') === 'true';
      const mostrar = !mostrando;
      if (usaBolinhasPorCss) campo.style.webkitTextSecurity = mostrar ? 'none' : 'disc';
      else campo.type = mostrar ? 'text' : 'password';
      btn.querySelector('.ver-senha-aberto').hidden = mostrar;
      btn.querySelector('.ver-senha-riscado').hidden = !mostrar;
      btn.setAttribute('aria-pressed', String(mostrar));
      btn.setAttribute('aria-label', mostrar ? 'Esconder senha' : 'Mostrar senha');
      campo.focus();
    });
  }

  function ligarTodos() {
    document.querySelectorAll('input[type="password"]').forEach(ligar);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligarTodos);
  else ligarTodos();
})();
