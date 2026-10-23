// @ts-check
// Tipos de evento da Love (catálogo do "Qual tipo de evento você quer criar?").
// Cada tipo tem: slug, nome, grupo, tipo-base (o que a plataforma usa para
// modelos de checklist, capa e convite) e palavras-chave para a busca — quem
// digita "15 anos" acha "Festa de 15 Anos / Debutante".
// A lista abaixo é a reserva; se a tabela tipos_evento (migration 088) existir,
// ela manda (o Admin pode cadastrar mais).
// API: window.LoveTiposEvento = { lista(), buscar(texto, max), porSlug(slug),
//      base(slug), celebracao(slug) }
(function () {
  'use strict';

  /** @typedef {{ slug: string, nome: string, grupo: string, base: string, palavras: string[], destaque?: boolean }} TipoEvento */

  /** @type {[string, string, string, string, string][]} slug, nome, grupo, base, palavras (separadas por vírgula) */
  const BASE = [
    // 1. Casamento e união
    ['casamento', 'Casamento', 'casamento', 'wedding', 'casar,noivos,matrimonio,cerimonia,wedding'],
    ['mini_wedding', 'Mini Wedding', 'casamento', 'wedding', 'casamento pequeno,intimo,casamento intimo'],
    ['elopement_wedding', 'Elopement Wedding', 'casamento', 'wedding', 'fugir para casar,casamento a dois,destination'],
    ['noivado', 'Noivado', 'casamento', 'wedding', 'pedido de casamento,festa de noivado,noiva,noivo'],
    ['renovacao_votos', 'Renovação de Votos', 'casamento', 'anniversary', 'renovar votos,renovacao,votos'],
    ['bodas', 'Bodas', 'casamento', 'anniversary', 'bodas de prata,bodas de ouro,bodas de papel,anos de casados'],
    ['cha_de_panela', 'Chá de Panela', 'casamento', 'bridal_shower', 'cha,panela,cozinha da noiva'],
    ['cha_bar', 'Chá Bar', 'casamento', 'bridal_shower', 'cha de bar,cha,bar,noivos'],
    ['cha_de_lingerie', 'Chá de Lingerie', 'casamento', 'bridal_shower', 'cha,lingerie,noiva'],
    ['despedida_solteiro', 'Despedida de Solteiro(a)', 'casamento', 'other', 'despedida,solteiro,solteira,bachelor'],
    // 2. Maternidade, bebês e infância
    ['cha_revelacao', 'Chá Revelação', 'maternidade', 'gender_reveal', 'revelacao,menino ou menina,sexo do bebe,cha'],
    ['cha_de_bebe', 'Chá de Bebê', 'maternidade', 'baby_shower', 'bebe,baby shower,gestante,gravidez,cha'],
    ['cha_de_fraldas', 'Chá de Fraldas', 'maternidade', 'baby_shower', 'fraldas,bebe,cha'],
    ['cha_rifa', 'Chá Rifa', 'maternidade', 'baby_shower', 'rifa,bebe,cha'],
    ['cha_de_apresentacao', 'Chá de Apresentação / Boas-vindas', 'maternidade', 'baby_shower', 'apresentacao,boas-vindas,boas vindas,conhecer o bebe,cha'],
    ['mesversario', 'Mesversário', 'maternidade', 'birthday', 'mesversario,meses,bebe,mes'],
    ['aniversario_infantil', 'Aniversário Infantil', 'maternidade', 'birthday', 'festa infantil,crianca,criancas,kids,aniversario de crianca'],
    // 3. Aniversários e ciclos de vida
    ['aniversario', 'Aniversário', 'aniversarios', 'birthday', 'aniversario adulto,niver,festa de aniversario,anos,birthday'],
    ['festa_15_anos', 'Festa de 15 Anos / Debutante', 'aniversarios', 'birthday', '15 anos,quinze anos,debutante,debut'],
    ['aniversario_surpresa', 'Aniversário Surpresa', 'aniversarios', 'birthday', 'surpresa,festa surpresa,niver surpresa'],
    ['aniversario_namoro', 'Aniversário de Namoro', 'aniversarios', 'anniversary', 'namoro,namorados,anos de namoro'],
    ['aniversario_casamento', 'Aniversário de Casamento', 'aniversarios', 'anniversary', 'anos de casados,bodas,casamento'],
    ['jubileu', 'Jubileu / Celebração de Longa Data', 'aniversarios', 'other', 'jubileu,longa data,anos de'],
    // 4. Ritos religiosos e espirituais
    ['batizado', 'Batizado', 'religioso', 'other', 'batismo,batizar,igreja,padrinhos'],
    ['primeira_comunhao', 'Primeira Comunhão / Eucaristia', 'religioso', 'other', 'comunhao,eucaristia,catequese,igreja'],
    ['crisma', 'Crisma', 'religioso', 'other', 'crismar,igreja,confirmacao'],
    ['bar_mitzvah', 'Bar / Bat Mitzvah', 'religioso', 'other', 'bar mitzvah,bat mitzvah,judaico'],
    ['culto_acao_gracas', 'Culto de Ação de Graças', 'religioso', 'other', 'culto,acao de gracas,gratidao,igreja'],
    ['bencao_lar', 'Bênção do Lar', 'religioso', 'other', 'bencao,lar,casa nova,igreja'],
    // 5. Conquistas acadêmicas e profissionais
    ['formatura', 'Formatura', 'conquistas', 'other', 'formando,colacao de grau,baile de formatura,faculdade,escola'],
    ['festa_100_dias', 'Festa dos 100 Dias', 'conquistas', 'other', '100 dias,cem dias,formatura'],
    ['pos_graduacao', 'Conclusão de Pós / Mestrado / Doutorado', 'conquistas', 'other', 'pos,mestrado,doutorado,defesa,tese'],
    ['aprovacao_concurso_oab', 'Comemoração de Aprovação (OAB / Concurso / Vestibular)', 'conquistas', 'other', 'aprovacao,aprovado,oab,concurso,vestibular,passei'],
    ['aposentadoria', 'Festa de Aposentadoria', 'conquistas', 'other', 'aposentado,aposentadoria,despedida do trabalho'],
    // 6. Casa, moradia e novos começos
    ['open_house', 'Open House / Chá de Casa Nova', 'casa', 'other', 'casa nova,open house,mudanca,apartamento novo,cha'],
    ['cha_de_cozinha', 'Chá de Cozinha', 'casa', 'bridal_shower', 'cozinha,cha,casa nova'],
    ['bota_fora', 'Bota-fora / Festa de Despedida', 'casa', 'other', 'bota fora,despedida,mudanca,intercambio,viagem'],
    ['inauguracao', 'Inauguração de Espaço / Negócio', 'casa', 'corporate', 'inauguracao,abertura,loja,negocio,empresa'],
    // 7. Corporativos, sociais e comerciais
    ['festa_fim_de_ano', 'Confraternização de Fim de Ano', 'corporativo', 'corporate', 'confraternizacao,fim de ano,natal,empresa,firma'],
    ['evento_corporativo', 'Evento Corporativo', 'corporativo', 'corporate', 'corporativo,empresa,firma,trabalho'],
    ['workshop_palestra', 'Workshop / Treinamento / Palestra', 'corporativo', 'corporate', 'workshop,treinamento,palestra,curso'],
    ['happy_hour_empresa', 'Happy Hour Empresarial', 'corporativo', 'corporate', 'happy hour,empresa,firma,equipe'],
    ['lancamento_produto', 'Lançamento de Produto ou Marca', 'corporativo', 'corporate', 'lancamento,produto,marca'],
    ['conferencia_seminario', 'Conferência / Seminário', 'corporativo', 'corporate', 'conferencia,seminario,congresso,simposio'],
    // 8. Festividades culturais e sazonais
    ['festa_junina', 'Festa Junina / Arraiá', 'sazonal', 'other', 'junina,arraia,sao joao,quadrilha,julina'],
    ['reveillon', 'Réveillon / Ano Novo', 'sazonal', 'other', 'reveillon,ano novo,virada'],
    ['carnaval', 'Bloco / Festa de Carnaval', 'sazonal', 'other', 'carnaval,bloco,folia'],
    ['halloween', 'Festa de Halloween', 'sazonal', 'other', 'halloween,dia das bruxas,fantasia'],
    ['almoco_pascoa', 'Almoço ou Encontro de Páscoa', 'sazonal', 'other', 'pascoa,almoco de pascoa'],
    ['churrasco_amigos', 'Churrasco / Encontro de Amigos', 'sazonal', 'other', 'churrasco,amigos,encontro,resenha']
  ];
  const DESTAQUES = ['casamento', 'aniversario', 'cha_de_bebe', 'cha_de_panela', 'cha_revelacao', 'bodas'];

  /** @type {TipoEvento[]} */
  let tipos = BASE.map(([slug, nome, grupo, base, palavras]) => ({ slug, nome, grupo, base, palavras: palavras.split(','), destaque: DESTAQUES.includes(slug) }));

  /** Sem acento, minúsculas e espaços simples. @param {unknown} v */
  const normal = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

  /** Até `max` tipos que combinam com o texto (nome e palavras-chave). @param {string} texto @param {number} [max] */
  function buscar(texto, max = 6) {
    const q = normal(texto);
    if (!q) return [];
    const termos = q.split(' ');
    /** @type {[TipoEvento, number][]} */
    const achados = [];
    tipos.forEach(t => {
      const nome = normal(t.nome);
      const chaves = t.palavras.map(normal);
      const tudo = `${nome} ${chaves.join(' ')} ${t.slug.replace(/_/g, ' ')}`;
      if (!termos.every(p => tudo.includes(p))) return;
      // Nome começando com o texto vem primeiro; depois palavra do nome; depois palavra-chave.
      let nota = 3;
      if (nome.startsWith(q)) nota = 0;
      else if (nome.includes(q)) nota = 1;
      else if (chaves.some(c => c.startsWith(q) || c.includes(q))) nota = 2;
      achados.push([t, nota]);
    });
    return achados.sort((a, b) => a[1] - b[1] || a[0].nome.localeCompare(b[0].nome, 'pt-BR')).slice(0, max).map(a => a[0]);
  }

  /** @param {string} slug */
  const porSlug = (slug) => tipos.find(t => t.slug === slug) || null;
  /** Tipo-base usado pela plataforma (wedding, birthday, ..., corporate, other). @param {string} slug */
  const base = (slug) => { const t = porSlug(slug); return t ? t.base : 'other'; };

  // Tipo de celebração do Criar solicitação (o fornecedor vê isso no pedido).
  /** @type {Record<string, string>} */
  const CELEBRACAO = {
    casamento: 'casamento', mini_wedding: 'casamento', elopement_wedding: 'casamento',
    noivado: 'noivado', bodas: 'bodas', renovacao_votos: 'bodas', aniversario_casamento: 'bodas',
    aniversario: 'aniversario', festa_15_anos: 'aniversario', aniversario_surpresa: 'aniversario', aniversario_infantil: 'aniversario', mesversario: 'aniversario',
    formatura: 'formatura', festa_100_dias: 'formatura',
    cha_de_bebe: 'chá de bebê', cha_de_fraldas: 'chá de bebê', cha_rifa: 'chá de bebê', cha_de_apresentacao: 'chá de bebê',
    cha_revelacao: 'chá revelação', cha_de_panela: 'chá de panela', cha_bar: 'chá de panela', cha_de_lingerie: 'chá de panela', cha_de_cozinha: 'chá de panela'
  };
  /** @param {string} slug @returns {string} id da celebração ('' = usar o nome do tipo) */
  function celebracao(slug) {
    if (CELEBRACAO[slug]) return CELEBRACAO[slug];
    const t = porSlug(slug);
    return t && t.grupo === 'corporativo' ? 'corporativo' : '';
  }

  // Catálogo do banco (migration 088), quando existir.
  async function carregarDoBanco() {
    try {
      if (typeof supabaseClient === 'undefined') return;
      const { data, error } = await supabaseClient.from('tipos_evento').select('slug, nome, grupo, tipo_base, palavras_chave, destaque').eq('ativo', true).order('ordem', { ascending: true });
      if (error || !data || !data.length) return;
      tipos = data.map((/** @type {any} */ r) => ({ slug: r.slug, nome: r.nome, grupo: r.grupo, base: r.tipo_base || 'other', palavras: Array.isArray(r.palavras_chave) ? r.palavras_chave : [], destaque: !!r.destaque }));
    } catch (_) { /* fica com a lista local */ }
  }
  setTimeout(carregarDoBanco, 1500);

  /** @type {any} */ (window).LoveTiposEvento = { lista: () => tipos.slice(), buscar, porSlug, base, celebracao, normal };
})();
