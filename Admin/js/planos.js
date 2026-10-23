/* ==========================================================================
   LOVE ADMIN — Planos do Hub (Configurações → Planos)
   Edita os planos (tabela planos, migration 090): nome, descrição, status,
   preço, período e quantas empresas o login pode ter. "Mudar plano de
   usuário" troca o plano de uma conta pelo e-mail (admin_mudar_plano).
   ========================================================================== */

const PERIODOS = { mensal: '1 mês', trimestral: '3 meses', semestral: '6 meses', anual: '12 meses' };

/* Cada plano tem moeda e país: a Love vai rodar em outros países, com outro
   domínio, e o preço sai na moeda de quem compra. Por enquanto só Brasil/real;
   para abrir outro país, acrescente aqui (ex.: US: { nome: 'Estados Unidos',
   moeda: 'USD', locale: 'en-US' }). */
const PAISES = { BR: { nome: 'Brasil', moeda: 'BRL', locale: 'pt-BR' } };
const MOEDAS_PLANO = { BRL: 'Real (BRL)' };

function precoDoPlano(p) {
  const moeda = p.moeda || 'BRL';
  if (!Number(p.preco)) return 'Grátis';
  const locale = (PAISES[p.pais] || PAISES.BR).locale;
  return Number(p.preco).toLocaleString(locale, { style: 'currency', currency: moeda });
}

let PLANOS = [];
let ASSINANTES = new Map();

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await window.adminReady)) return;

  addHeaderAction('Mudar plano de usuário', () => abrirMudarPlano(), {
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" /><path d="M6 21v-2a4 4 0 0 1 4 -4h3" /><path d="M16 22l5 -5" /><path d="M21 21.5v-4.5h-4.5" /></svg>'
  });
  addHeaderAction('Adicionar plano', () => abrirFormulario(), {
    principal: true,
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5l0 14" /><path d="M5 12l14 0" /></svg>'
  });
  moverControlesParaHeader();
  document.getElementById('busca').addEventListener('input', render);

  await carregar();
});

async function carregar() {
  const tbody = document.getElementById('tbody');
  renderLoading(tbody, 9);

  const [planos, fornecedores] = await Promise.all([
    safeSelect('planos', '*', q => q.order('ordem').order('created_at')),
    safeSelect('fornecedores', 'id, dono_id, plan, plan_expira_em')
  ]);

  if (planos.error) {
    tbody.innerHTML = `<tr class="no-hover"><td colspan="9"><div class="empty-state">
      <strong>Banco ainda não está preparado</strong>
      <p>Rode supabase/migrations/090_planos.sql no SQL Editor do Supabase.</p></div></td></tr>`;
    return;
  }

  PLANOS = planos.data;

  // Assinantes: logins (conta principal) em cada plano, com o vencido
  // contando como Gratuito, igual ao Hub.
  ASSINANTES = new Map();
  fornecedores.data
    .filter(f => !f.dono_id || f.dono_id === f.id)
    .forEach(f => {
      const vencido = f.plan_expira_em && new Date(f.plan_expira_em) <= new Date();
      const nome = String(vencido ? 'Gratuito' : (f.plan || 'Gratuito')).toLowerCase();
      ASSINANTES.set(nome, (ASSINANTES.get(nome) || 0) + 1);
    });

  render();
}

function render() {
  const tbody = document.getElementById('tbody');
  const termo = document.getElementById('busca').value.trim().toLowerCase();
  const lista = PLANOS.filter(p => !termo || [p.id, p.nome, p.descricao, p.status, PERIODOS[p.periodo], p.preco, p.moeda]
    .some(v => String(v ?? '').toLowerCase().includes(termo)));

  if (!lista.length) {
    renderEmpty(tbody, 9, 'Nenhum plano', termo ? 'Nada encontrado para essa busca.' : 'Adicione o primeiro plano.');
    return;
  }

  tbody.innerHTML = lista.map(p => `
    <tr data-plano="${escapeHtml(p.id)}">
      <td class="cell-muted">#${escapeHtml(p.id)}</td>
      <td class="cell-strong">${escapeHtml(p.nome)}</td>
      <td class="cell-muted plano-descricao" title="${escapeHtml(p.descricao || '')}">${escapeHtml(p.descricao || '—')}</td>
      <td>${p.status === 'ativo' ? badge('Ativo', 'badge-success') : badge('Inativo')}</td>
      <td class="cell-strong valor-dinheiro">${escapeHtml(precoDoPlano(p))}</td>
      <td class="cell-muted">${escapeHtml(p.moeda || 'BRL')}</td>
      <td>${badge(PERIODOS[p.periodo] || p.periodo)}</td>
      <td class="col-numero">${formatNumber(p.limite_empresas)}</td>
      <td class="col-numero">${formatNumber(ASSINANTES.get(String(p.nome).toLowerCase()) || 0)}</td>
    </tr>`).join('');

  tbody.querySelectorAll('[data-plano]').forEach(tr => tr.addEventListener('click', () => {
    abrirFormulario(PLANOS.find(p => p.id === tr.dataset.plano));
  }));
}

/** "Plano Pro Anual" → "plano_pro_anual". */
function idDoNome(nome) {
  return String(nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
}

function abrirFormulario(item) {
  const editando = Boolean(item);

  Drawer.open({
    title: editando ? `Editar plano ${item.nome}` : 'Adicionar plano',
    subtitle: 'Planos do Hub',
    body: `
      <form id="form-plano">
        <label class="field">
          <span class="field-label">Nome</span>
          <input class="field-input" name="nome" type="text" required placeholder="Ex.: Pro" value="${escapeHtml(item?.nome || '')}">
        </label>
        <label class="field">
          <span class="field-label">Descrição</span>
          <textarea class="field-textarea" name="descricao" rows="3">${escapeHtml(item?.descricao || '')}</textarea>
        </label>
        <div class="field-row">
          <label class="field">
            <span class="field-label">País</span>
            <select class="field-select" name="pais">
              ${Object.entries(PAISES).map(([k, v]) => `<option value="${k}" ${(item?.pais || 'BR') === k ? 'selected' : ''}>${v.nome}</option>`).join('')}
            </select>
          </label>
          <label class="field">
            <span class="field-label">Moeda</span>
            <select class="field-select" name="moeda">
              ${Object.entries(MOEDAS_PLANO).map(([k, v]) => `<option value="${k}" ${(item?.moeda || 'BRL') === k ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </label>
        </div>
        <div class="field-row">
          <label class="field">
            <span class="field-label">Preço</span>
            <input class="field-input" name="preco" type="number" min="0" step="0.01" value="${item?.preco ?? 0}">
          </label>
          <label class="field">
            <span class="field-label">Período</span>
            <select class="field-select" name="periodo">
              ${Object.entries(PERIODOS).map(([k, v]) => `<option value="${k}" ${(item?.periodo || 'mensal') === k ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </label>
        </div>
        <div class="field-row">
          <label class="field">
            <span class="field-label">Empresas por login</span>
            <input class="field-input" name="limite_empresas" type="number" min="1" step="1" value="${item?.limite_empresas ?? 1}">
          </label>
          <label class="field">
            <span class="field-label">Status</span>
            <select class="field-select" name="status">
              <option value="ativo" ${item?.status !== 'inativo' ? 'selected' : ''}>Ativo</option>
              <option value="inativo" ${item?.status === 'inativo' ? 'selected' : ''}>Inativo</option>
            </select>
          </label>
        </div>
        <p class="field-hint">Empresas por login conta a principal: 3 = a principal e mais duas.</p>
      </form>`,
    footer: `
      ${editando ? '<button type="button" class="btn btn-ghost" id="btn-remover-plano" style="margin-right:auto">Remover</button>' : ''}
      <button type="button" class="btn btn-ghost" id="btn-cancelar">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btn-salvar">${editando ? 'Salvar' : 'Adicionar'}</button>`
  });

  const form = document.getElementById('form-plano');
  document.getElementById('btn-cancelar').addEventListener('click', () => Drawer.close());

  document.getElementById('btn-remover-plano')?.addEventListener('click', async () => {
    const assinantes = ASSINANTES.get(String(item.nome).toLowerCase()) || 0;
    if (assinantes) return toast(`${assinantes} conta(s) estão neste plano. Mude o plano delas ou deixe-o inativo.`);
    if (!(await confirmar(`Remover o plano "${item.nome}"?`, { titulo: 'Remover plano', rotulo: 'Remover' }))) return;
    const { error } = await supabaseClient.from('planos').delete().eq('id', item.id);
    if (error) return toast(`Não foi possível remover: ${error.message}`);
    Drawer.close();
    toast('Plano removido');
    carregar();
  });

  document.getElementById('btn-salvar').addEventListener('click', async () => {
    const d = Object.fromEntries(new FormData(form).entries());
    const nome = d.nome.trim();
    if (!nome) return toast('Informe o nome do plano');

    const payload = {
      nome,
      descricao: d.descricao.trim() || null,
      preco: Number(d.preco) || 0,
      periodo: d.periodo,
      limite_empresas: Math.max(1, Math.round(Number(d.limite_empresas) || 1)),
      status: d.status,
      pais: d.pais || 'BR',
      moeda: d.moeda || 'BRL',
      updated_at: new Date().toISOString()
    };

    // Sem a migration 091 ainda, salva sem país e moeda.
    if (!PLANOS.some(p => 'moeda' in p)) { delete payload.pais; delete payload.moeda; }

    Drawer.setFooterBusy(true);
    let resposta;
    if (editando) {
      resposta = await supabaseClient.from('planos').update(payload).eq('id', item.id);
      // O plano das contas é guardado pelo nome: renomear leva as contas junto.
      if (!resposta.error && item.nome !== nome) {
        await supabaseClient.from('fornecedores').update({ plan: nome }).eq('plan', item.nome);
      }
    } else {
      const id = idDoNome(nome);
      if (!id) { Drawer.setFooterBusy(false); return toast('Use letras ou números no nome'); }
      resposta = await supabaseClient.from('planos').insert({ id, ordem: PLANOS.length + 1, ...payload });
    }
    Drawer.setFooterBusy(false);

    if (resposta.error) {
      return toast(/duplicate|unique/i.test(resposta.error.message || '')
        ? 'Já existe um plano com esse nome'
        : `Não foi possível salvar: ${resposta.error.message}`);
    }
    Drawer.close();
    toast(editando ? 'Plano atualizado' : 'Plano adicionado');
    carregar();
  });
}

function abrirMudarPlano() {
  const ativos = PLANOS.filter(p => p.status === 'ativo');

  Drawer.open({
    title: 'Mudar plano de usuário',
    subtitle: 'Vale para todas as empresas do login',
    body: `
      <form id="form-mudar-plano">
        <label class="field">
          <span class="field-label">E-mail da conta</span>
          <input class="field-input" name="email" type="email" required placeholder="nome@empresa.com.br">
        </label>
        <div class="field-row">
          <label class="field">
            <span class="field-label">Novo plano</span>
            <select class="field-select" name="plano">
              ${ativos.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.nome)}</option>`).join('')}
            </select>
          </label>
          <label class="field">
            <span class="field-label">Por quanto tempo</span>
            <select class="field-select" name="dias">
              <option value="">Sem vencimento</option>
              <option value="30">30 dias</option>
              <option value="60">60 dias</option>
              <option value="90">90 dias</option>
              <option value="180">6 meses</option>
              <option value="365">1 ano</option>
            </select>
          </label>
        </div>
      </form>`,
    footer: `
      <button type="button" class="btn btn-ghost" id="btn-cancelar">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btn-mudar">Mudar plano</button>`
  });

  const form = document.getElementById('form-mudar-plano');
  form.email.focus();
  document.getElementById('btn-cancelar').addEventListener('click', () => Drawer.close());
  document.getElementById('btn-mudar').addEventListener('click', async () => {
    const d = Object.fromEntries(new FormData(form).entries());
    if (!d.email.trim()) return toast('Informe o e-mail da conta');
    if (!d.plano) return toast('Nenhum plano ativo');

    Drawer.setFooterBusy(true);
    const { data, error } = await supabaseClient.rpc('admin_mudar_plano', {
      p_email: d.email.trim(),
      p_plano: d.plano,
      p_dias: d.dias ? Number(d.dias) : null
    });
    Drawer.setFooterBusy(false);

    if (error) {
      return toast(/admin_mudar_plano|schema cache/i.test(error.message || '')
        ? 'Rode supabase/migrations/090_planos.sql no Supabase.'
        : error.message);
    }
    Drawer.close();
    const nome = PLANOS.find(p => p.id === d.plano)?.nome || d.plano;
    toast(`Plano ${nome} aplicado em ${data} empresa(s).`);
    carregar();
  });
}
