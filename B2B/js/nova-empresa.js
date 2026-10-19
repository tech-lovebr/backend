/* ==========================================================================
   LOVE B2B — Nova empresa (mesmo login, outra empresa)
   Um login pode ter várias empresas (migration 066): cada uma com o seu
   nome, CNPJ, responsável, imagens e dados (serviços, leads, chat…).
   Limite pelo plano do login: Gratuito = 1 empresa; Pro = até 3.

   Ambiente isolado: sem sidebar, sem nome da empresa e sem busca no topo
   (são da empresa atual). Para voltar, a pessoa abre o perfil e clica na
   empresa atual. Cadastro em 3 etapas: dados → categoria → imagens. Ao
   concluir, a nova empresa vira a ativa e o Hub abre nela.
   ========================================================================== */

const LIMITE_POR_PLANO = { Gratuito: 1, Pro: 3 };

// Categorias principais (as mesmas de Meus produtos, sem as subcategorias).
const CATEGORIAS_DA_EMPRESA = [
  'Buffet e Gastronomia',
  'Bar e Bebidas',
  'Espaços para Locação',
  'Staff e Mão de Obra',
  'Mídia e Audiovisual',
  'Música e Entretenimento',
  'Decoração',
  'Assessoria e Cerimonialista',
  'Trajes, Beleza e Estilo'
];

const TOTAL_DE_ETAPAS = 3;
let etapaAtual = 1;

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

// CNPJ da empresa atual (só quando o documento dela é um CNPJ completo).
function cnpjDaEmpresaAtual() {
  const p = B2B_DATA.professional || {};
  const digitos = String(p.documentNumber || '').replace(/\D/g, '');
  return digitos.length === 14 ? formatDocumentValue(digitos, 'cnpj') : '';
}

function mostrarEtapa(n) {
  etapaAtual = n;
  document.querySelectorAll('[data-etapa]').forEach(s => { s.hidden = Number(s.dataset.etapa) !== n; });
  document.querySelectorAll('[data-etapa-indicador]').forEach(el => {
    const i = Number(el.dataset.etapaIndicador);
    el.classList.toggle('is-ativa', i === n);
    el.classList.toggle('is-feita', i < n);
  });
  document.getElementById('nova-empresa-voltar').hidden = n === 1;
  document.getElementById('nova-empresa-salvar').textContent = n === TOTAL_DE_ETAPAS ? 'Criar empresa e entrar' : 'Avançar';
  document.getElementById('nova-empresa-erro').hidden = true;
  const primeiro = document.querySelector(`[data-etapa="${n}"] input:not([type="radio"]):not([type="file"])`);
  if (primeiro) primeiro.focus();
}

async function initNovaEmpresa() {
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  if (!session) return;
  const uid = session.user.id;

  const quantas = Math.max(1, (window.b2bEmpresas || []).length);
  const limite = await limiteDeEmpresas();
  const form = document.getElementById('nova-empresa-form');

  // Só o Pro cria outra empresa (até 3); o Gratuito vê o convite para o Pro.
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
  document.getElementById('nova-empresa-etapas').hidden = false;
  ligarUpload('nova-empresa-perfil', 'nova-empresa-perfil-zona');
  ligarUpload('nova-empresa-capa', 'nova-empresa-capa-zona');

  const cnpjInput = document.getElementById('nova-empresa-cnpj');
  const telefoneInput = document.getElementById('nova-empresa-telefone');
  wireDocumentMaskInput(cnpjInput, () => 'cnpj');
  wirePhoneMaskInput(telefoneInput);
  if (typeof wireNameCaseInput === 'function') wireNameCaseInput(document.getElementById('nova-empresa-responsavel'));

  // CNPJ: se a empresa atual tem CNPJ, pergunta se é o mesmo (Sim copia;
  // Não abre o campo). Sem CNPJ na atual, o campo já aparece.
  const cnpjAtual = cnpjDaEmpresaAtual();
  const pergunta = document.getElementById('nova-empresa-cnpj-pergunta');
  const campoCnpj = document.getElementById('nova-empresa-cnpj-campo');
  const copiado = document.getElementById('nova-empresa-cnpj-copiado');
  if (cnpjAtual) {
    pergunta.hidden = false;
    form.querySelectorAll('input[name="nova-empresa-mesmo-cnpj"]').forEach(r => {
      r.addEventListener('change', () => {
        const mesmo = r.value === 'sim';
        campoCnpj.hidden = mesmo;
        copiado.hidden = !mesmo;
        copiado.textContent = mesmo ? `Vamos usar o mesmo CNPJ: ${cnpjAtual}` : '';
        // Mesmo CNPJ: é outra marca da mesma empresa, então pede o nome fantasia.
        document.getElementById('nova-empresa-nome-rotulo').textContent = mesmo ? 'Nome fantasia' : 'Nome da empresa';
        if (mesmo) { cnpjInput.value = cnpjAtual; document.getElementById('nova-empresa-nome').focus(); }
        else { cnpjInput.value = ''; cnpjInput.focus(); }
      });
    });
  } else {
    campoCnpj.hidden = false;
  }

  // Etapa 2: categorias principais, uma só.
  document.getElementById('nova-empresa-categorias').innerHTML = CATEGORIAS_DA_EMPRESA.map(c => `
    <label class="nova-empresa-opcao nova-empresa-categoria">
      <input type="radio" name="nova-empresa-categoria" value="${escapeHtml(c)}"> ${escapeHtml(c)}
    </label>`).join('');

  const erro = document.getElementById('nova-empresa-erro');
  const mostrarErro = (msg) => { erro.textContent = msg; erro.hidden = false; };

  const validarEtapa1 = () => {
    const nome = document.getElementById('nova-empresa-nome').value.trim();
    const responsavel = document.getElementById('nova-empresa-responsavel').value.trim();
    const telefone = telefoneInput.value.replace(/\D/g, '');
    if (cnpjAtual && !form.querySelector('input[name="nova-empresa-mesmo-cnpj"]:checked')) return 'Responda se o CNPJ é o mesmo da empresa atual.';
    if (cnpjInput.value.replace(/\D/g, '').length !== 14) return 'Confira o CNPJ: são 14 números.';
    if (!nome) return 'Preencha o ' + document.getElementById('nova-empresa-nome-rotulo').textContent.toLowerCase() + '.';
    if (!responsavel) return 'Preencha o responsável principal.';
    if (telefone.length < 10) return 'Confira o WhatsApp com o DDD.';
    return '';
  };
  const categoriaEscolhida = () => (form.querySelector('input[name="nova-empresa-categoria"]:checked') || {}).value || '';

  document.getElementById('nova-empresa-voltar').addEventListener('click', () => mostrarEtapa(Math.max(1, etapaAtual - 1)));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    erro.hidden = true;
    if (etapaAtual === 1) {
      const msg = validarEtapa1();
      if (msg) return mostrarErro(msg);
      return mostrarEtapa(2);
    }
    if (etapaAtual === 2) {
      if (!categoriaEscolhida()) return mostrarErro('Escolha a categoria da empresa.');
      return mostrarEtapa(3);
    }

    const salvar = document.getElementById('nova-empresa-salvar');
    salvar.disabled = true;
    try {
      const { data: nova, error } = await supabaseClient.from('fornecedores').insert({
        dono_id: uid,
        company_name: document.getElementById('nova-empresa-nome').value.trim(),
        email: session.user.email,
        contact_name: document.getElementById('nova-empresa-responsavel').value.trim(),
        phone: telefoneInput.value.trim(),
        category: categoriaEscolhida(),
        document_type: 'cnpj',
        cnpj: cnpjInput.value.trim()
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

      // A nova empresa vira a ativa e a pessoa já entra nela.
      localStorage.setItem('b2b-empresa-ativa', nova.id);
      localStorage.removeItem('b2b-professional-profile');
      window.location.href = 'dashboard';
    } finally {
      salvar.disabled = false;
    }
  });

  mostrarEtapa(1);
  window.b2bPageReady?.();
}

document.addEventListener('DOMContentLoaded', async () => {
  const authed = await window.b2bAuthReady;
  if (!authed) return;
  initNovaEmpresa();
});
