/* Source do cadastro do anfitrião: de qual landing ou campanha a pessoa veio.
   Vem de ?origem=xxx ou de <body data-origem="xxx"> e fica neste navegador em
   "love-origem-cadastro" = { origem, em } até a conta ser criada.
   Precisa vir antes do js/app.js. */
window.LoveOrigem = (function () {
  const CHAVE = 'love-origem-cadastro';
  const VALIDA = /^[a-z0-9-]{1,40}$/;
  const TRINTA_DIAS = 30 * 864e5;
  const UM_DIA = 864e5;

  function guardar(origem) {
    if (!VALIDA.test(origem || '')) return false;
    try { localStorage.setItem(CHAVE, JSON.stringify({ origem, em: Date.now() })); } catch (e) { /* sem armazenamento */ }
    return true;
  }

  function capturar() {
    let daUrl = '';
    try { daUrl = new URLSearchParams(location.search).get('origem') || ''; } catch (e) { /* URL estranha */ }
    if (guardar(daUrl)) return;
    if (document.body) guardar(document.body.dataset.origem || '');
  }

  /** A origem guardada, se for válida e de menos de 30 dias. */
  function atual() {
    let guardada = null;
    try { guardada = JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) { return ''; }
    if (!guardada || !VALIDA.test(guardada.origem || '')) return '';
    const idade = Date.now() - Number(guardada.em);
    return idade >= 0 && idade < TRINTA_DIAS ? guardada.origem : '';
  }

  function limpar() {
    try { localStorage.removeItem(CHAVE); } catch (e) { /* sem armazenamento */ }
  }

  /** Vai nos metadados do signUp por e-mail. */
  function dadosDoSignUp() {
    const origem = atual();
    return origem ? { origem_cadastro: origem } : {};
  }

  /* Google: só no primeiro acesso de conta criada nas últimas 24h, e nunca
     por cima de uma origem que já exista. Sem a coluna (migration 135 ainda
     não rodou), fica no metadado e a migration copia depois. */
  async function gravarNoGoogle(session, primeiroAcesso) {
    if (!primeiroAcesso || !session || !session.user) return;
    const idadeDaConta = Date.now() - new Date(session.user.created_at).getTime();
    if (!(idadeDaConta >= 0 && idadeDaConta < UM_DIA)) return;
    if ((session.user.user_metadata || {}).origem_cadastro) return;
    const origem = atual();
    if (!origem) return;

    const { error } = await supabaseClient.from('clientes')
      .update({ origem_cadastro: origem })
      .eq('id', session.user.id)
      .is('origem_cadastro', null);
    if (error) {
      const { error: erroMeta } = await supabaseClient.auth.updateUser({ data: { origem_cadastro: origem } });
      if (erroMeta) return; // mantém guardada para não perder a origem
    }
    limpar();
  }

  capturar();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', capturar, { once: true });

  return { atual, limpar, dadosDoSignUp, gravarNoGoogle };
})();
