/* ==========================================================================
   LOVE ADMIN — Adicionar produto/serviço por uma empresa

   O mesmo passo a passo do cadastro do Hub (1. Categoria · 2. Detalhes ·
   3. Mídia), gravando em products no mesmo formato que o Hub grava
   (extra.subcategory, extra.pricing, extra.venue…). Assim o item aparece
   no catálogo da empresa e na vitrine do love.com.br como se ela mesma
   tivesse cadastrado.

   Uso: NovoProduto.abrir(fornecedores, aoSalvar)
     fornecedores: [{ id, company_name }]
   ========================================================================== */

const NovoProduto = (() => {
  // Mesma árvore do Hub (B2B/js/produtos.js, SUBCATEGORY_MAP).
  const SUBCATEGORIAS = {
    'Buffet e Gastronomia': ['Buffet Completo', 'Finger Food', 'Bolo & Doces', 'Churrasco', 'Café da Manhã', 'Carrinhos / Food Truck', 'Cardápio Vegano', 'Tábua de Frios', 'Buffet Infantil'],
    'Bar e Bebidas': ['Bar Completo / Open Bar', 'Sommelier', 'Aluguel de Cervejeira', 'Consignação de Bebidas', 'Bar Infantil'],
    'Espaços para Locação': ['Salão de Festas', 'Sítio/Chácara', 'Rooftop', 'Igreja/Capela', 'Praia', 'Hotel', 'Espaços Exclusivos'],
    'Staff e Mão de Obra': ['Garçom', 'Bartender', 'Segurança', 'Recepcionista', 'Limpeza', 'Manobrista', 'Montadores', 'Carregadores'],
    'Mídia e Audiovisual': ['Fotografia', 'Filmagem', 'Drone', 'Cabine de Fotos', 'Edição de Vídeo', 'Álbum de Fotos'],
    'Música e Entretenimento': ['DJ', 'Banda ao vivo', 'Mestre de cerimônias', 'Aluguel de Brinquedos', 'Animação de Festa', 'Recreação Infantil', 'Orquestra', 'Personagens Vivos', 'Mágicos'],
    'Decoração': ['Florais', 'Iluminação', 'Mobiliário', 'Cenografia', 'Esculturas em Balões', 'Lembrancinhas', 'Papelaria'],
    'Assessoria e Cerimonialista': ['Assessoria completa', 'Cerimonial no dia', 'Planejamento', 'Day Coordinator', 'Celebrante'],
    'Trajes, Beleza e Estilo': ['Aluguel de Roupa', 'Acessórios', 'Ateliê', 'Trajes de Madrinhas', 'Roupas para Festa', 'Moda Infantil', 'Dia da Noiva', 'Maquiagem', 'Camarim'],
    'Aluguel de Carros': []
  };

  const COBRANCAS = {
    POR_PESSOA: 'Por pessoa',
    POR_HORA: 'Por hora',
    VALOR_FIXO: 'Valor fixo',
    SOB_CONSULTA: 'Sob consulta'
  };

  const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

  let PASSO = 1;
  let CAPA = null;
  let GALERIA = [];
  let FORNECEDORES = [];
  let AO_SALVAR = null;

  const $ = id => document.getElementById(id);
  const num = id => { const v = Number(String($(id)?.value || '').replace(',', '.')); return Number.isFinite(v) && v > 0 ? v : 0; };
  const ehEspaco = () => $('np-categoria')?.value === 'Espaços para Locação';

  function abrir(fornecedores, aoSalvar) {
    FORNECEDORES = (fornecedores || []).slice().sort((a, b) => String(a.company_name || '').localeCompare(String(b.company_name || ''), 'pt-BR'));
    AO_SALVAR = aoSalvar;
    PASSO = 1;
    CAPA = null;
    GALERIA = [];

    const campo = (id, rotulo, { tipo = 'text', placeholder = '', obrigatorio = false, extra = '' } = {}) => `
      <label class="field">
        <span class="field-label">${rotulo}${obrigatorio ? ' <span class="campo-obrigatorio">*</span>' : ''}</span>
        <input class="field-input" id="${id}" type="${tipo}" placeholder="${placeholder}" autocomplete="off" ${extra}>
      </label>`;

    Drawer.open({
      title: 'Adicionar produto/serviço',
      subtitle: 'Cadastro em nome de uma empresa do Hub',
      body: `
        <nav class="np-passos" id="np-passos">
          <button type="button" class="np-passo is-ativo" data-ir="1">1. Categoria</button>
          <button type="button" class="np-passo" data-ir="2">2. Detalhes</button>
          <button type="button" class="np-passo" data-ir="3">3. Mídia</button>
        </nav>

        <section data-painel="1">
          <label class="field">
            <span class="field-label">Empresa <span class="campo-obrigatorio">*</span></span>
            <select class="field-select" id="np-empresa">
              <option value="">Escolha a empresa</option>
              ${FORNECEDORES.map(f => `<option value="${f.id}">${escapeHtml(f.company_name || f.email || 'Sem nome')}</option>`).join('')}
            </select>
          </label>
          <label class="field">
            <span class="field-label">Categoria <span class="campo-obrigatorio">*</span></span>
            <select class="field-select" id="np-categoria">
              <option value="">Escolha a categoria</option>
              ${Object.keys(SUBCATEGORIAS).map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
            </select>
          </label>
          <label class="field" id="np-campo-sub" hidden>
            <span class="field-label">Subcategoria</span>
            <select class="field-select" id="np-subcategoria"></select>
          </label>
        </section>

        <section data-painel="2" hidden>
          ${campo('np-titulo', 'Título do anúncio', { obrigatorio: true, extra: 'maxlength="120"' })}
          <label class="field">
            <span class="field-label">Descrição</span>
            <textarea class="field-textarea" id="np-descricao" placeholder="O que está incluso, diferenciais, como funciona…"></textarea>
          </label>

          <div id="np-cobranca-padrao">
            <label class="field">
              <span class="field-label">Unidade de cobrança <span class="campo-obrigatorio">*</span></span>
              <select class="field-select" id="np-cobranca">
                ${Object.entries(COBRANCAS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
              </select>
            </label>
            <div data-cobranca="POR_PESSOA" class="field-row">
              ${campo('np-pp-preco', 'Preço por pessoa (R$)', { tipo: 'number', extra: 'min="0" step="0.01"' })}
              ${campo('np-pp-min', 'Mínimo de pessoas', { tipo: 'number', extra: 'min="0"' })}
              ${campo('np-pp-max', 'Máximo de pessoas', { tipo: 'number', extra: 'min="0"' })}
            </div>
            <div data-cobranca="POR_HORA" class="field-row" hidden>
              ${campo('np-ph-preco', 'Preço por hora (R$)', { tipo: 'number', extra: 'min="0" step="0.01"' })}
              ${campo('np-ph-min', 'Mínimo de horas', { tipo: 'number', extra: 'min="0"' })}
              ${campo('np-ph-extra', 'Hora extra (R$)', { tipo: 'number', extra: 'min="0" step="0.01"' })}
            </div>
            <div data-cobranca="VALOR_FIXO" hidden>
              ${campo('np-vf-preco', 'Valor (R$)', { tipo: 'number', extra: 'min="0" step="0.01"' })}
            </div>
            <div data-cobranca="SOB_CONSULTA" hidden>
              ${campo('np-sc-preco', 'A partir de (R$, opcional)', { tipo: 'number', extra: 'min="0" step="0.01"' })}
            </div>
          </div>

          <div id="np-espaco" hidden>
            <p class="drawer-section-title">Diárias</p>
            <div class="field-row">
              ${campo('np-ve-semana', 'Seg a sex (R$)', { tipo: 'number', extra: 'min="0" step="0.01"' })}
              ${campo('np-ve-sabado', 'Sábado (R$)', { tipo: 'number', extra: 'min="0" step="0.01"' })}
            </div>
            <div class="field-row">
              ${campo('np-ve-domingo', 'Domingo (R$)', { tipo: 'number', extra: 'min="0" step="0.01"' })}
              ${campo('np-ve-feriado', 'Feriado (R$)', { tipo: 'number', extra: 'min="0" step="0.01"' })}
            </div>
            <p class="drawer-section-title">O espaço</p>
            <div class="field-row">
              ${campo('np-ve-sentados', 'Capacidade sentados', { tipo: 'number', extra: 'min="0"' })}
              ${campo('np-ve-pe', 'Capacidade em pé', { tipo: 'number', extra: 'min="0"' })}
              ${campo('np-ve-tamanho', 'Tamanho (m²)', { tipo: 'number', extra: 'min="0"' })}
            </div>
            ${campo('np-ve-rua', 'Endereço', { placeholder: 'Rua e número' })}
            <div class="field-row">
              <label class="field" style="flex:0 0 96px">
                <span class="field-label">UF</span>
                <select class="field-select" id="np-ve-uf"><option value="">—</option>${UFS.map(u => `<option>${u}</option>`).join('')}</select>
              </label>
              ${campo('np-ve-cidade', 'Cidade')}
            </div>
          </div>
        </section>

        <section data-painel="3" hidden>
          <p class="drawer-section-title" style="margin-top:0">Imagem de capa</p>
          <label class="foto-perfil foto-capa np-capa" id="np-previa-capa">
            <span class="foto-perfil-mais" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span>
            <span class="foto-perfil-texto"></span>
            <input type="file" id="np-arquivo-capa" accept="image/*" class="foto-perfil-input">
          </label>

          <p class="drawer-section-title">Galeria</p>
          <div class="np-galeria" id="np-galeria"></div>
          <label class="btn btn-ghost btn-sm np-galeria-add">
            + Adicionar fotos
            <input type="file" id="np-arquivo-galeria" accept="image/*" multiple hidden>
          </label>

          ${campo('np-video', 'Link de vídeo (opcional)', { tipo: 'url', placeholder: 'https://' })}

          <label class="field">
            <span class="field-label">Status</span>
            <select class="field-select" id="np-ativo">
              <option value="true">Ativo — aparece na vitrine</option>
              <option value="false">Inativo — fica salvo, sem aparecer</option>
            </select>
          </label>
        </section>`,
      footer: `
        <button type="button" class="btn btn-ghost" id="np-voltar">Cancelar</button>
        <button type="button" class="btn btn-neutro" id="np-proximo">Próximo</button>`
    });

    ligar();
    irPara(1);
  }

  function ligar() {
    $('np-categoria').addEventListener('change', () => {
      const subs = SUBCATEGORIAS[$('np-categoria').value] || [];
      $('np-campo-sub').hidden = !subs.length;
      $('np-subcategoria').innerHTML = '<option value="">—</option>' + subs.map(s => `<option>${escapeHtml(s)}</option>`).join('');
      $('np-espaco').hidden = !ehEspaco();
      $('np-cobranca-padrao').hidden = ehEspaco();
    });

    $('np-cobranca').addEventListener('change', () => {
      document.querySelectorAll('[data-cobranca]').forEach(el => { el.hidden = el.dataset.cobranca !== $('np-cobranca').value; });
    });

    document.querySelectorAll('#np-passos [data-ir]').forEach(btn => {
      btn.addEventListener('click', () => {
        const alvo = Number(btn.dataset.ir);
        if (alvo > PASSO && !validar(PASSO)) return;
        irPara(alvo);
      });
    });

    $('np-voltar').addEventListener('click', () => (PASSO === 1 ? Drawer.close() : irPara(PASSO - 1)));
    $('np-proximo').addEventListener('click', () => {
      if (!validar(PASSO)) return;
      if (PASSO < 3) irPara(PASSO + 1); else salvar();
    });

    $('np-arquivo-capa').addEventListener('change', async (e) => {
      const url = await enviar(e.target.files[0], $('np-previa-capa'));
      e.target.value = '';
      if (!url) return;
      CAPA = url;
      const caixa = $('np-previa-capa');
      caixa.classList.add('tem-foto');
      caixa.querySelector('.foto-perfil-mais')?.remove();
      caixa.querySelector('img')?.remove();
      caixa.querySelector('.foto-perfil-texto').textContent = 'Trocar capa';
      caixa.insertAdjacentHTML('afterbegin', `<img src="${escapeHtml(url)}" alt="">`);
    });

    $('np-arquivo-galeria').addEventListener('change', async (e) => {
      for (const file of [...e.target.files].slice(0, 10)) {
        const url = await enviar(file, null);
        if (url) GALERIA.push(url);
      }
      e.target.value = '';
      desenharGaleria();
    });
  }

  function desenharGaleria() {
    $('np-galeria').innerHTML = GALERIA.map((u, i) => `
      <div class="np-galeria-item">
        <img src="${escapeHtml(u)}" alt="">
        <button type="button" data-remover="${i}" aria-label="Remover foto">×</button>
      </div>`).join('');
    document.querySelectorAll('#np-galeria [data-remover]').forEach(b => b.addEventListener('click', () => {
      GALERIA.splice(Number(b.dataset.remover), 1);
      desenharGaleria();
    }));
  }

  function irPara(n) {
    PASSO = n;
    document.querySelectorAll('[data-painel]').forEach(p => { p.hidden = Number(p.dataset.painel) !== n; });
    document.querySelectorAll('#np-passos [data-ir]').forEach(b => b.classList.toggle('is-ativo', Number(b.dataset.ir) === n));
    $('np-voltar').textContent = n === 1 ? 'Cancelar' : 'Voltar';
    $('np-proximo').textContent = n === 3 ? 'Publicar' : 'Próximo';
  }

  function validar(passo) {
    if (passo === 1) {
      if (!$('np-empresa').value) { toast('Escolha a empresa.'); return false; }
      if (!$('np-categoria').value) { toast('Escolha a categoria.'); return false; }
    }
    if (passo === 2) {
      if (!$('np-titulo').value.trim()) { toast('Escreva o título do anúncio.'); return false; }
    }
    return true;
  }

  async function enviar(file, caixa) {
    if (!file) return null;
    if (file.size > 5 * 1024 * 1024) { toast('A imagem precisa ter até 5 MB.'); return null; }
    caixa?.classList.add('is-enviando');
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const caminho = `produtos/${$('np-empresa').value || 'admin'}/${Date.now()}-${Math.round(performance.now())}.${ext}`;
    const { error } = await supabaseClient.storage.from('fornecedores').upload(caminho, file, {
      cacheControl: '31536000', contentType: file.type || 'image/jpeg'
    });
    caixa?.classList.remove('is-enviando');
    if (error) { toast(`Não foi possível enviar a imagem: ${error.message}`); return null; }
    return supabaseClient.storage.from('fornecedores').getPublicUrl(caminho).data.publicUrl;
  }

  async function salvar() {
    const categoria = $('np-categoria').value;
    const espaco = ehEspaco();
    const tipo = $('np-cobranca').value;

    const pricing = espaco ? null : {
      type: tipo,
      perPerson: tipo === 'POR_PESSOA' ? { pricePerPerson: num('np-pp-preco'), minPeople: num('np-pp-min') || null, maxPeople: num('np-pp-max') || null } : null,
      perHour: tipo === 'POR_HORA' ? { pricePerHour: num('np-ph-preco'), minHours: num('np-ph-min') || null, extraHourPrice: num('np-ph-extra') || null } : null,
      fixed: tipo === 'VALOR_FIXO' ? { price: num('np-vf-preco') } : null,
      onRequest: tipo === 'SOB_CONSULTA' ? { startingPrice: num('np-sc-preco') || null } : null
    };

    const venue = espaco ? {
      priceWeekday: num('np-ve-semana') || null,
      priceSaturday: num('np-ve-sabado') || null,
      priceSunday: num('np-ve-domingo') || null,
      priceHoliday: num('np-ve-feriado') || null,
      capacitySeated: num('np-ve-sentados') || null,
      capacityStanding: num('np-ve-pe') || null,
      size: num('np-ve-tamanho') || null,
      street: $('np-ve-rua').value.trim() || null,
      city: $('np-ve-cidade').value.trim() || null,
      state: $('np-ve-uf').value || null
    } : null;

    // Coluna price (legada): o menor valor da cobrança, como o Hub faz.
    let price = 0;
    if (espaco) {
      const dias = [venue.priceWeekday, venue.priceSaturday, venue.priceSunday, venue.priceHoliday].filter(v => v > 0);
      price = dias.length ? Math.min(...dias) : 0;
    } else if (tipo === 'POR_PESSOA') price = pricing.perPerson.pricePerPerson;
    else if (tipo === 'POR_HORA') price = pricing.perHour.pricePerHour;
    else if (tipo === 'VALOR_FIXO') price = pricing.fixed.price;

    const row = {
      fornecedor_id: $('np-empresa').value,
      name: $('np-titulo').value.trim(),
      category: categoria,
      price,
      description: $('np-descricao').value.trim() || null,
      active: $('np-ativo').value === 'true',
      cover_image_url: CAPA,
      gallery: GALERIA,
      extra: {
        offerType: 'servico',
        subcategory: $('np-subcategoria').value || null,
        pricing,
        venue,
        videoUrl: $('np-video').value.trim() || null,
        cadastradoPeloAdmin: true
      }
    };

    Drawer.setFooterBusy(true);
    const { data, error } = await supabaseClient.from('products').insert(row).select('*').single();
    Drawer.setFooterBusy(false);

    if (error) return toast(`Não foi possível adicionar: ${error.message}`);

    Drawer.close();
    toast('Produto/serviço adicionado ao catálogo da empresa.');
    if (AO_SALVAR) AO_SALVAR(data);
  }

  return { abrir };
})();
