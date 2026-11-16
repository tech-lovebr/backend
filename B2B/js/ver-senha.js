/* ==========================================================================
   LOVE B2B — Mostrar/Ocultar a senha (texto, igual ao login do Admin)
   Todo campo de senha da página ganha, à direita, um botão que alterna
   entre mostrar e esconder o que foi digitado. Campo de e-mail não tem.
   ========================================================================== */
(function () {
  const EN = document.documentElement.classList.contains('hub-en');
  const TXT = EN ? { ver: 'Show', esconder: 'Hide', verSenha: 'Show password', esconderSenha: 'Hide password' }
                 : { ver: 'Mostrar', esconder: 'Ocultar', verSenha: 'Mostrar senha', esconderSenha: 'Ocultar senha' };

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
    btn.textContent = TXT.ver;
    caixa.appendChild(btn);

    const usaBolinhasPorCss = getComputedStyle(campo).webkitTextSecurity === 'disc';
    btn.addEventListener('click', () => {
      const mostrando = btn.getAttribute('aria-pressed') === 'true';
      const mostrar = !mostrando;
      if (usaBolinhasPorCss) campo.style.webkitTextSecurity = mostrar ? 'none' : 'disc';
      else campo.type = mostrar ? 'text' : 'password';
      btn.textContent = mostrar ? TXT.esconder : TXT.ver;
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
