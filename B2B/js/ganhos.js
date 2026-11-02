/* ==========================================================================
   LOVE B2B — Ganhos
   No modelo do perfil do Upwork: a empresa no topo, os números (saldo
   disponível, total de ganhos e contratos ativos) e "Ver perfil" com os
   dados de Configurações (o lápis leva para lá, onde tudo é editado).
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  await window.b2bAuthReady;
  renderGanhosEmpresa();
  await carregarGanhosNumeros();
  window.b2bPageReady?.();
});

function ganhosIniciais(nome) {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
  return ((partes[0] || '')[0] || '') + (partes.length > 1 ? (partes[partes.length - 1][0] || '') : '');
}

// "R$ 155,8 mil", "R$ 2,3 mi": valores curtos, como o "$2M+" do Upwork.
function ganhosValorCurto(v) {
  const n = Number(v || 0);
  if (Math.abs(n) < 1000) return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });
}

function renderGanhosEmpresa() {
  const p = (typeof B2B_DATA !== 'undefined' && B2B_DATA.professional) || {};
  const nome = String(p.company || p.razaoSocial || p.name || '').trim() || 'Minha empresa';

  const nomeEl = document.getElementById('ganhos-nome');
  if (nomeEl) {
    nomeEl.textContent = nome;
    if (p.selfieVerified) nomeEl.insertAdjacentHTML('beforeend', ' <span class="ganhos-verificado" title="Conta verificada" aria-label="Conta verificada"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5 14.6 4.4l3.2-.1.9 3.1 2.6 1.9-1 3.1 1 3.1-2.6 1.9-.9 3.1-3.2-.1L12 21.5l-2.6-1.9-3.2.1-.9-3.1-2.6-1.9 1-3.1-1-3.1 2.6-1.9.9-3.1 3.2.1L12 2.5Z"/><path d="m8.5 12.2 2.3 2.3 4.7-4.8" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>');
  }

  const avatar = document.getElementById('ganhos-avatar');
  if (avatar) {
    const foto = p.profilePhoto || p.avatar;
    if (foto && /^(https?:|data:image\/|blob:)/.test(foto)) {
      avatar.style.backgroundImage = `url("${String(foto).replace(/["\\]/g, encodeURIComponent)}")`;
      avatar.classList.add('tem-foto');
      avatar.textContent = '';
    } else {
      avatar.textContent = ganhosIniciais(nome).toUpperCase();
    }
  }

  const cidade = p.useProfileAddress === false ? p.businessCity : p.city;
  const estado = p.useProfileAddress === false ? p.businessState : p.state;
  const local = document.getElementById('ganhos-local');
  if (local && cidade) {
    local.querySelector('span').textContent = estado ? `${cidade}, ${estado}` : cidade;
    local.hidden = false;
  }
  const plano = document.getElementById('ganhos-plano');
  if (plano) plano.textContent = p.plan === 'Pro' ? 'Plano Pro' : 'Plano Gratuito';

  // Dados de Configurações, só para leitura (editar pelo lápis).
  const endereco = p.useProfileAddress === false
    ? [p.businessAddress, p.businessCity, p.businessState].filter(Boolean).join(', ')
    : [p.address, p.city, p.state].filter(Boolean).join(', ');
  const linhas = [
    ['Sobre a empresa', p.description],
    ['Razão social', p.razaoSocial],
    ['E-mail', p.businessEmail || p.email],
    ['Telefone', p.phone],
    ['Endereço', endereco],
    ['Raio de atendimento', p.serviceRadiusKm ? `${p.serviceRadiusKm} km` : ''],
    ['Prazo de entrega', p.deliveryTime],
    ['Sinal', p.depositPercent != null && p.depositPercent !== '' ? `${p.depositPercent}% do valor` : ''],
    ['Parcelas sem juros', p.maxInstallmentsNoInterest ? `Até ${p.maxInstallmentsNoInterest}x` : ''],
    ['Chave Pix', p.pixKey]
  ];
  const dados = document.getElementById('ganhos-dados');
  if (dados) {
    dados.innerHTML = linhas.map(([rotulo, valor]) => `
      <div class="ganhos-dado">
        <dt>${rotulo}</dt>
        <dd${valor ? '' : ' class="is-vazio"'}>${valor ? escapeHtml(String(valor)) : 'Não informado'}</dd>
      </div>`).join('');
  }
}

async function carregarGanhosNumeros() {
  const session = window.b2bSession || (await supabaseClient.auth.getSession()).data.session;
  let transacoes = [];
  let contratos = 0;
  if (session) {
    const [tx, ct] = await Promise.all([
      supabaseClient.from('wallet_transactions').select('type, amount').eq('fornecedor_id', empresaId(session)),
      supabaseClient.from('contracts').select('id', { count: 'exact', head: true }).eq('fornecedor_id', empresaId(session)).neq('status', 'quitado')
    ]);
    transacoes = tx.data || [];
    contratos = ct.count || 0;
  }
  const saldo = transacoes.reduce((s, t) => s + (t.type === 'credit' ? 1 : -1) * Number(t.amount || 0), 0);
  const total = transacoes.filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.amount || 0), 0);
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  set('ganhos-saldo', ganhosValorCurto(saldo));
  set('ganhos-total', ganhosValorCurto(total));
  set('ganhos-contratos', String(contratos));
  ajustarFonteGanhos();
}

/* Os três números sempre inteiros: se um não couber na coluna, os três
   diminuem juntos até caber. */
function ajustarFonteGanhos() {
  const els = [...document.querySelectorAll('.ganhos-valor')];
  if (!els.length) return;
  els.forEach(el => { el.style.fontSize = ''; });
  const base = parseFloat(getComputedStyle(els[0]).fontSize) || 22;
  let escala = 1;
  els.forEach(el => { if (el.clientWidth && el.scrollWidth > el.clientWidth) escala = Math.min(escala, el.clientWidth / el.scrollWidth); });
  if (escala < 1) {
    const tam = Math.max(12, Math.floor(base * escala * 10) / 10);
    els.forEach(el => { el.style.fontSize = tam + 'px'; });
  }
}
window.addEventListener('resize', () => ajustarFonteGanhos());
