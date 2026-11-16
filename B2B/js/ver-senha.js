/* ==========================================================================
   LOVE B2B — Olhinho da senha: olho todo quando a senha aparece, olho com
   a barra quando está oculta
   Todo campo de senha da página ganha, à direita, um botão que alterna
   entre mostrar e esconder o que foi digitado. Campo de e-mail não tem.
   ========================================================================== */
(function () {
  const EN = document.documentElement.classList.contains('hub-en');
  const TXT = EN ? { verSenha: 'Show password', esconderSenha: 'Hide password' }
                 : { verSenha: 'Mostrar senha', esconderSenha: 'Ocultar senha' };
  const ABERTO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
  const CORTADO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/></svg>';

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
    btn.setAttribute('aria-label', TXT.verSenha);
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = CORTADO;
    caixa.appendChild(btn);

    const usaBolinhasPorCss = getComputedStyle(campo).webkitTextSecurity === 'disc';
    btn.addEventListener('click', () => {
      const mostrando = btn.getAttribute('aria-pressed') === 'true';
      const mostrar = !mostrando;
      if (usaBolinhasPorCss) campo.style.webkitTextSecurity = mostrar ? 'none' : 'disc';
      else campo.type = mostrar ? 'text' : 'password';
      btn.innerHTML = mostrar ? ABERTO : CORTADO;
      btn.setAttribute('aria-pressed', String(mostrar));
      btn.setAttribute('aria-label', mostrar ? TXT.esconderSenha : TXT.verSenha);
      campo.focus();
    });
  }

  function ligarTodos() {
    document.querySelectorAll('input[type="password"]').forEach(ligar);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligarTodos);
  else ligarTodos();
})();
