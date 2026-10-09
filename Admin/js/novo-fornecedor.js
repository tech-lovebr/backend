/* ==========================================================================
   LOVE ADMIN — Cadastrar fornecedor

   Os mesmos campos que o fornecedor preencheria em Configurações no Hub,
   menos "Minha empresa" e "Preferências". Ao salvar, a conta nasce sem
   senha e a pessoa recebe o e-mail para definir a dela.
   ========================================================================== */

const NovoFornecedor = (() => {
  const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

  let AVATAR_URL = null;
  let TIPO_DOC = 'cnpj';

  function abrir() {
    AVATAR_URL = null;
    TIPO_DOC = 'cnpj';

    const campo = (id, rotulo, { tipo = 'text', placeholder = '', obrigatorio = false } = {}) => `
      <label class="field">
        <span class="field-label">${rotulo}${obrigatorio ? ' <span class="campo-obrigatorio">*</span>' : ''}</span>
        <input class="field-input" id="${id}" type="${tipo}" placeholder="${placeholder}" autocomplete="off">
      </label>`;

    Drawer.open({
      title: 'Cadastrar fornecedor',
      subtitle: 'A pessoa recebe um e-mail para definir a senha',
      body: `
        <p class="drawer-section-title">Imagem de perfil</p>
        <label class="foto-perfil" id="previa-avatar">
          <span class="foto-perfil-mais">+</span>
          <span class="foto-perfil-texto">Adicione uma foto</span>
          <input type="file" id="arquivo-avatar" accept="image/*" class="foto-perfil-input">
        </label>

        <p class="drawer-section-title">Identificação</p>
        ${campo('novo-empresa', 'Nome da empresa', { placeholder: 'Ex: Sophia Eventos & Decoração', obrigatorio: true })}
        ${campo('novo-nome', 'Nome do responsável', { placeholder: 'Ex: Sophia Ramos', obrigatorio: true })}

        <div class="field-row">
          ${campo('novo-email', 'E-mail', { tipo: 'email', placeholder: 'contato@empresa.com.br', obrigatorio: true })}
          ${campo('novo-nascimento', 'Data de nascimento', { tipo: 'date' })}
        </div>

        ${campo('novo-telefone', 'Celular', { tipo: 'tel', placeholder: '(00) 00000-0000', obrigatorio: true })}

        <label class="field">
          <span class="field-label">Tipo de documento</span>
          <div class="doc-tipo" id="novo-doc-tipo">
            <button type="button" class="doc-tipo-opcao is-ativa" data-doc="cnpj">CNPJ</button>
            <button type="button" class="doc-tipo-opcao" data-doc="cpf">CPF</button>
          </div>
        </label>

        ${campo('novo-documento', 'CNPJ', { placeholder: '00.000.000/0000-00', obrigatorio: true })}

        <p class="drawer-section-title">Endereço</p>
        ${campo('novo-endereco', 'Endereço', { placeholder: 'Rua, número, bairro' })}
        <div class="field-row">
          <label class="field">
            <span class="field-label">Estado</span>
            <select class="field-select" id="novo-estado">
              <option value="">—</option>
              ${ESTADOS.map(uf => `<option value="${uf}">${uf}</option>`).join('')}
            </select>
          </label>
          ${campo('novo-cidade', 'Cidade', { placeholder: 'Cidade' })}
        </div>

        <p class="drawer-section-title">Sobre</p>
        <label class="field">
          <span class="field-label">Descrição pública</span>
          <textarea class="field-textarea" id="novo-descricao"
                    placeholder="Conte um pouco sobre o trabalho da empresa…"></textarea>
        </label>
`,
      footer: `
        <button type="button" class="btn btn-ghost" id="btn-cancelar">Cancelar</button>
        <button type="button" class="btn btn-primary" id="btn-criar">Cadastrar</button>`
    });

    ligar();
  }

  function ligar() {
    document.getElementById('btn-cancelar').addEventListener('click', () => Drawer.close());
    document.getElementById('btn-criar').addEventListener('click', criar);

    document.querySelectorAll('#novo-doc-tipo [data-doc]').forEach(btn => {
      btn.addEventListener('click', () => {
        TIPO_DOC = btn.dataset.doc;
        document.querySelectorAll('#novo-doc-tipo [data-doc]')
          .forEach(b => b.classList.toggle('is-ativa', b === btn));

        const rotulo = TIPO_DOC === 'cpf' ? 'CPF' : 'CNPJ';
        const campo = document.getElementById('novo-documento');
        campo.parentElement.querySelector('.field-label').innerHTML =
          `${rotulo} <span class="campo-obrigatorio">*</span>`;
        campo.placeholder = TIPO_DOC === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00';
      });
    });

    // O <label> já abre o seletor de arquivo; só o envio precisa de código.
    document.getElementById('arquivo-avatar')
      .addEventListener('change', e => enviarImagem(e.target));
  }

  async function enviarImagem(input) {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      toast('A imagem precisa ter até 3 MB.');
      input.value = '';
      return;
    }

    const caixa = document.getElementById('previa-avatar');
    caixa.classList.add('is-enviando');

    const extensao = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const caminho = `avatar/${Date.now()}-${Math.round(performance.now())}.${extensao}`;

    const { error } = await supabaseClient.storage.from('fornecedores').upload(caminho, file, {
      cacheControl: '31536000',
      contentType: file.type || 'image/jpeg'
    });

    caixa.classList.remove('is-enviando');
    input.value = '';

    if (error) {
      toast(/bucket|not found/i.test(error.message || '')
        ? 'Rode supabase/migrations/030_fornecedor_pelo_admin.sql no Supabase.'
        : `Não foi possível enviar: ${error.message}`);
      return;
    }

    AVATAR_URL = supabaseClient.storage.from('fornecedores').getPublicUrl(caminho).data.publicUrl;
    caixa.classList.add('tem-foto');
    caixa.querySelector('.foto-perfil-mais').remove();
    caixa.querySelector('.foto-perfil-texto').textContent = 'Trocar foto';
    caixa.insertAdjacentHTML('afterbegin', `<img src="${escapeHtml(AVATAR_URL)}" alt="">`);
  }

  const valor = id => document.getElementById(id).value.trim();

  async function criar() {
    const empresa = valor('novo-empresa');
    const nome = valor('novo-nome');
    const email = valor('novo-email').toLowerCase();
    const telefone = valor('novo-telefone');
    const documento = valor('novo-documento');

    const faltando = [
      [!empresa, 'novo-empresa', 'Informe o nome da empresa.'],
      [!nome, 'novo-nome', 'Informe o nome do responsável.'],
      [!email, 'novo-email', 'Informe o e-mail.'],
      [!telefone, 'novo-telefone', 'Informe o celular.'],
      [!documento, 'novo-documento', `Informe o ${TIPO_DOC.toUpperCase()}.`]
    ].find(([vazio]) => vazio);

    if (faltando) {
      toast(faltando[2]);
      document.getElementById(faltando[1]).focus();
      return;
    }

    Drawer.setFooterBusy(true);

    /* Cliente separado, sem guardar sessão: o signUp autentica quem acabou
       de ser criado, e no cliente principal isso derrubaria a sessão do
       admin no meio do cadastro. */
    const avulso = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });

    // Senha descartável: quem define a de verdade é a pessoa, pelo e-mail.
    const senhaProvisoria = `Lv${crypto.randomUUID()}!`;

    const { data: criado, error: erroConta } = await avulso.auth.signUp({
      email,
      password: senhaProvisoria,
      options: { data: { role: 'fornecedor', company_name: empresa } }
    });

    if (erroConta) {
      Drawer.setFooterBusy(false);
      toast(/already registered|already been/i.test(erroConta.message)
        ? 'Já existe uma conta com esse e-mail.'
        : `Não foi possível criar a conta: ${erroConta.message}`);
      return;
    }

    // O trigger handle_new_user() já criou a linha em fornecedores; aqui
    // completamos com o que o formulário coletou.
    const { error: erroPerfil } = await supabaseClient
      .from('fornecedores')
      .update({
        company_name: empresa,
        contact_name: nome,
        email,
        phone: telefone,
        birth_date: valor('novo-nascimento') || null,
        document_type: TIPO_DOC,
        cnpj: documento,
        address: valor('novo-endereco') || null,
        state: document.getElementById('novo-estado').value || null,
        city: valor('novo-cidade') || null,
        description: valor('novo-descricao') || null,
        avatar_url: AVATAR_URL
      })
      .eq('id', criado.user.id);

    // O e-mail de definição de senha é o do fluxo de recuperação do próprio
    // Supabase, apontando para a tela de redefinir do Hub.
    const { error: erroEmail } = await avulso.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://hub.love.com.br/resetar-senha'
    });

    Drawer.setFooterBusy(false);
    Drawer.close();

    if (erroPerfil) {
      toast(`Conta criada, mas o cadastro ficou incompleto: ${erroPerfil.message}`);
    } else if (erroEmail) {
      toast('Fornecedor cadastrado, mas o e-mail de senha não saiu. Peça para usar "Esqueci minha senha".');
    } else {
      toast(`${empresa} cadastrado. O e-mail para definir a senha foi enviado.`);
    }

    window.location.reload();
  }

  return { abrir };
})();
