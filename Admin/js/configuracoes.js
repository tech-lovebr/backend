/* ==========================================================================
   LOVE ADMIN — Configurações
   Dados da própria conta de administrador. E-mail e senha ficam no Supabase.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  const admin = await window.adminReady;
  if (!admin) return;

  const form = document.getElementById('form-perfil');
  form.name.value = admin.name || '';
  form.email.value = admin.email || '';

  document.getElementById('btn-salvar-perfil').addEventListener('click', async () => {
    const nome = form.name.value.trim();

    if (!nome) {
      toast('O nome não pode ficar vazio.');
      return;
    }

    const botao = document.getElementById('btn-salvar-perfil');
    botao.disabled = true;
    const { error } = await supabaseClient.from('admins').update({ name: nome }).eq('id', admin.id);
    botao.disabled = false;

    if (error) {
      toast(`Não foi possível salvar: ${error.message}`);
      return;
    }

    toast('Dados atualizados.');
    // A topbar mostra o nome e as iniciais — recarrega para refletir a mudança.
    setTimeout(() => window.location.reload(), 900);
  });
});
