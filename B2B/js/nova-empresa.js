/* ==========================================================================
   LOVE B2B — Adicionar empresa (mesmo login, outra empresa)
   Um login pode ter várias empresas (migration 066): cada uma com o seu
   nome, CNPJ, responsável, imagens e dados (serviços, leads, chat…).
   Limite pelo plano do login: Gratuito = 1 empresa; Pro = até 3.
   Ao criar, a nova empresa vira a ativa e o Hub abre nela.
   ========================================================================== */

const LIMITE_POR_PLANO = { Gratuito: 1, Pro: 3 };

async function limiteDeEmpresas() {
  const { data, error } = await supabaseClient.rpc('limite_de_empresas');
  if (!error && Number.isFinite(data)) return data;
  return LIMITE_POR_PLANO[B2B_DATA.professional.plan] || 1;
}

/* Imagem escolhida: prévia na caixa e o arquivo guardado para subir. */
function ligarUpload(inputId, zonaId) {
  const input = document.getElementById(inputId);
  const zona = document.getElementById(zonaId);
  const img = zona.querySelector('img');
  const mais = zona.querySelector('.nova-empresa-upload-mais');
  input.addEventListener('change', () => {
    const arquivo = input.files && input.files[0];
    if (!arquivo) return;
    if (!arquivo.type.startsWith('image/')) { showToast('Escolha uma imagem.', true); input.value = ''; return; }
    img.src = URL.createObjectURL(arquivo);
    img.hidden = false;
    mais.hidden = true;
    zona.classList.add('tem-imagem');
  });
}

async function subirImagem(arquivo, pasta, uid) {
  if (!arquivo) return null;
  const ext = (arquivo.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const caminho = `${pasta}/${uid}/${Date.now()}-${Math.round(performance.now())}.${ext}`;
  const { error } = await supabaseClient.storage.from('fornecedores')
    .upload(caminho, arquivo, { cacheControl: '31536000', contentType: arquivo.type || 'image/jpeg' });
  if (error) { console.warn('Imagem não subiu.', error); return null; }
  return supabaseClient.storage.from('fornecedores').getPublicUrl(caminho).data.publicUrl;
}

async function initNovaEmpresa() {
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  if (!session) return;
  const uid = session.user.id;

  const quantas = Math.max(1, (window.b2bEmpresas || []).length);
  const limite = await limiteDeEmpresas();
  const form = document.getElementById('nova-empresa-form');

  if (quantas >= limite) {
    const pro = B2B_DATA.professional.plan === 'Pro';
    document.getElementById('nova-empresa-limite-texto').textContent = pro
      ? `Você já tem ${quantas} empresas, o limite do plano Pro.`
      : 'No plano Gratuito, cada login tem 1 empresa. Com o Pro, você pode ter até 3 empresas no mesmo acesso.';
    document.getElementById('nova-empresa-limite-btn').hidden = pro;
    document.getElementById('nova-empresa-limite').hidden = false;
    window.b2bPageReady?.();
    return;
  }

  form.hidden = false;
  ligarUpload('nova-empresa-perfil', 'nova-empresa-perfil-zona');
  ligarUpload('nova-empresa-capa', 'nova-empresa-capa-zona');
  const cnpjInput = document.getElementById('nova-empresa-cnpj');
  if (typeof wireDocumentMaskInput === 'function') wireDocumentMaskInput(cnpjInput, () => 'cnpj');
  if (typeof wireNameCaseInput === 'function') wireNameCaseInput(document.getElementById('nova-empresa-responsavel'));

  const erro = document.getElementById('nova-empresa-erro');
  const mostrarErro = (msg) => { erro.textContent = msg; erro.hidden = false; };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    erro.hidden = true;
    const nome = document.getElementById('nova-empresa-nome').value.trim();
    const cnpj = cnpjInput.value.trim();
    const responsavel = document.getElementById('nova-empresa-responsavel').value.trim();
    if (!nome || !cnpj || !responsavel) return mostrarErro('Preencha nome da empresa, CNPJ e responsável principal.');
    if (cnpj.replace(/\D/g, '').length !== 14) return mostrarErro('Confira o CNPJ: são 14 números.');

    const salvar = document.getElementById('nova-empresa-salvar');
    salvar.disabled = true;
    try {
      const { data: nova, error } = await supabaseClient.from('fornecedores').insert({
        dono_id: uid,
        company_name: nome,
        email: session.user.email,
        contact_name: responsavel,
        document_type: 'cnpj',
        cnpj
      }).select('id').single();
      if (error || !nova) {
        console.error('Não foi possível criar a empresa.', error);
        return mostrarErro(/row-level security|policy/i.test((error && error.message) || '')
          ? 'Seu plano não permite mais empresas neste acesso.'
          : 'Não foi possível criar a empresa. Tente de novo.');
      }

      const [avatarUrl, capaUrl] = await Promise.all([
        subirImagem(document.getElementById('nova-empresa-perfil').files[0], 'avatar', uid),
        subirImagem(document.getElementById('nova-empresa-capa').files[0], 'capa', uid)
      ]);
      if (avatarUrl || capaUrl) {
        await supabaseClient.from('fornecedores')
          .update({ ...(avatarUrl ? { avatar_url: avatarUrl } : {}), ...(capaUrl ? { logo_url: capaUrl } : {}) })
          .eq('id', nova.id);
      }

      // A nova empresa vira a ativa.
      localStorage.setItem('b2b-empresa-ativa', nova.id);
      localStorage.removeItem('b2b-professional-profile');
      window.location.href = 'dashboard';
    } finally {
      salvar.disabled = false;
    }
  });

  window.b2bPageReady?.();
}

document.addEventListener('DOMContentLoaded', async () => {
  const authed = await window.b2bAuthReady;
  if (!authed) return;
  initNovaEmpresa();
});
