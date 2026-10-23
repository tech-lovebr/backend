-- 088 — Catálogo de tipos de evento (Criar evento › "Ou digite outro tipo").
-- A busca usa o nome e as palavras-chave ("15 anos" → Festa de 15 Anos).
-- tipo_base: o que a plataforma usa para modelos de checklist, capa e convite
-- (wedding, birthday, baby_shower, bridal_shower, gender_reveal, anniversary,
-- corporate, other). Os 6 com destaque são os cards do pop-up.
-- O tipo escolhido fica no evento (eventos.extra.tipoEvento = slug e
-- eventos.extra.tipoNome = nome; texto livre fica só em tipoNome).
create table if not exists tipos_evento (
  slug text primary key,
  nome text not null,
  grupo text not null,
  tipo_base text not null default 'other'
    check (tipo_base in ('wedding', 'birthday', 'baby_shower', 'bridal_shower', 'gender_reveal', 'anniversary', 'corporate', 'other')),
  palavras_chave text[] not null default '{}',
  destaque boolean not null default false,
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table tipos_evento enable row level security;

drop policy if exists "tipos_evento_leitura" on tipos_evento;
create policy "tipos_evento_leitura" on tipos_evento
  for select to anon, authenticated
  using (ativo);

drop policy if exists "tipos_evento_admin" on tipos_evento;
create policy "tipos_evento_admin" on tipos_evento
  for all to authenticated
  using (is_admin())
  with check (is_admin());

insert into tipos_evento (slug, nome, grupo, tipo_base, palavras_chave, destaque, ordem) values
  ('casamento', 'Casamento', 'casamento', 'wedding', array['casar', 'noivos', 'matrimonio', 'cerimonia', 'wedding'], true, 1),
  ('mini_wedding', 'Mini Wedding', 'casamento', 'wedding', array['casamento pequeno', 'intimo', 'casamento intimo'], false, 2),
  ('elopement_wedding', 'Elopement Wedding', 'casamento', 'wedding', array['fugir para casar', 'casamento a dois', 'destination'], false, 3),
  ('noivado', 'Noivado', 'casamento', 'wedding', array['pedido de casamento', 'festa de noivado', 'noiva', 'noivo'], false, 4),
  ('renovacao_votos', 'Renovação de Votos', 'casamento', 'anniversary', array['renovar votos', 'renovacao', 'votos'], false, 5),
  ('bodas', 'Bodas', 'casamento', 'anniversary', array['bodas de prata', 'bodas de ouro', 'bodas de papel', 'anos de casados'], true, 6),
  ('cha_de_panela', 'Chá de Panela', 'casamento', 'bridal_shower', array['cha', 'panela', 'cozinha da noiva'], true, 7),
  ('cha_bar', 'Chá Bar', 'casamento', 'bridal_shower', array['cha de bar', 'cha', 'bar', 'noivos'], false, 8),
  ('cha_de_lingerie', 'Chá de Lingerie', 'casamento', 'bridal_shower', array['cha', 'lingerie', 'noiva'], false, 9),
  ('despedida_solteiro', 'Despedida de Solteiro(a)', 'casamento', 'other', array['despedida', 'solteiro', 'solteira', 'bachelor'], false, 10),
  ('cha_revelacao', 'Chá Revelação', 'maternidade', 'gender_reveal', array['revelacao', 'menino ou menina', 'sexo do bebe', 'cha'], true, 11),
  ('cha_de_bebe', 'Chá de Bebê', 'maternidade', 'baby_shower', array['bebe', 'baby shower', 'gestante', 'gravidez', 'cha'], true, 12),
  ('cha_de_fraldas', 'Chá de Fraldas', 'maternidade', 'baby_shower', array['fraldas', 'bebe', 'cha'], false, 13),
  ('cha_rifa', 'Chá Rifa', 'maternidade', 'baby_shower', array['rifa', 'bebe', 'cha'], false, 14),
  ('cha_de_apresentacao', 'Chá de Apresentação / Boas-vindas', 'maternidade', 'baby_shower', array['apresentacao', 'boas-vindas', 'boas vindas', 'conhecer o bebe', 'cha'], false, 15),
  ('mesversario', 'Mesversário', 'maternidade', 'birthday', array['mesversario', 'meses', 'bebe', 'mes'], false, 16),
  ('aniversario_infantil', 'Aniversário Infantil', 'maternidade', 'birthday', array['festa infantil', 'crianca', 'criancas', 'kids', 'aniversario de crianca'], false, 17),
  ('aniversario', 'Aniversário', 'aniversarios', 'birthday', array['aniversario adulto', 'niver', 'festa de aniversario', 'anos', 'birthday'], true, 18),
  ('festa_15_anos', 'Festa de 15 Anos / Debutante', 'aniversarios', 'birthday', array['15 anos', 'quinze anos', 'debutante', 'debut'], false, 19),
  ('aniversario_surpresa', 'Aniversário Surpresa', 'aniversarios', 'birthday', array['surpresa', 'festa surpresa', 'niver surpresa'], false, 20),
  ('aniversario_namoro', 'Aniversário de Namoro', 'aniversarios', 'anniversary', array['namoro', 'namorados', 'anos de namoro'], false, 21),
  ('aniversario_casamento', 'Aniversário de Casamento', 'aniversarios', 'anniversary', array['anos de casados', 'bodas', 'casamento'], false, 22),
  ('jubileu', 'Jubileu / Celebração de Longa Data', 'aniversarios', 'other', array['jubileu', 'longa data', 'anos de'], false, 23),
  ('batizado', 'Batizado', 'religioso', 'other', array['batismo', 'batizar', 'igreja', 'padrinhos'], false, 24),
  ('primeira_comunhao', 'Primeira Comunhão / Eucaristia', 'religioso', 'other', array['comunhao', 'eucaristia', 'catequese', 'igreja'], false, 25),
  ('crisma', 'Crisma', 'religioso', 'other', array['crismar', 'igreja', 'confirmacao'], false, 26),
  ('bar_mitzvah', 'Bar / Bat Mitzvah', 'religioso', 'other', array['bar mitzvah', 'bat mitzvah', 'judaico'], false, 27),
  ('culto_acao_gracas', 'Culto de Ação de Graças', 'religioso', 'other', array['culto', 'acao de gracas', 'gratidao', 'igreja'], false, 28),
  ('bencao_lar', 'Bênção do Lar', 'religioso', 'other', array['bencao', 'lar', 'casa nova', 'igreja'], false, 29),
  ('formatura', 'Formatura', 'conquistas', 'other', array['formando', 'colacao de grau', 'baile de formatura', 'faculdade', 'escola'], false, 30),
  ('festa_100_dias', 'Festa dos 100 Dias', 'conquistas', 'other', array['100 dias', 'cem dias', 'formatura'], false, 31),
  ('pos_graduacao', 'Conclusão de Pós / Mestrado / Doutorado', 'conquistas', 'other', array['pos', 'mestrado', 'doutorado', 'defesa', 'tese'], false, 32),
  ('aprovacao_concurso_oab', 'Comemoração de Aprovação (OAB / Concurso / Vestibular)', 'conquistas', 'other', array['aprovacao', 'aprovado', 'oab', 'concurso', 'vestibular', 'passei'], false, 33),
  ('aposentadoria', 'Festa de Aposentadoria', 'conquistas', 'other', array['aposentado', 'aposentadoria', 'despedida do trabalho'], false, 34),
  ('open_house', 'Open House / Chá de Casa Nova', 'casa', 'other', array['casa nova', 'open house', 'mudanca', 'apartamento novo', 'cha'], false, 35),
  ('cha_de_cozinha', 'Chá de Cozinha', 'casa', 'bridal_shower', array['cozinha', 'cha', 'casa nova'], false, 36),
  ('bota_fora', 'Bota-fora / Festa de Despedida', 'casa', 'other', array['bota fora', 'despedida', 'mudanca', 'intercambio', 'viagem'], false, 37),
  ('inauguracao', 'Inauguração de Espaço / Negócio', 'casa', 'corporate', array['inauguracao', 'abertura', 'loja', 'negocio', 'empresa'], false, 38),
  ('festa_fim_de_ano', 'Confraternização de Fim de Ano', 'corporativo', 'corporate', array['confraternizacao', 'fim de ano', 'natal', 'empresa', 'firma'], false, 39),
  ('evento_corporativo', 'Evento Corporativo', 'corporativo', 'corporate', array['corporativo', 'empresa', 'firma', 'trabalho'], false, 40),
  ('workshop_palestra', 'Workshop / Treinamento / Palestra', 'corporativo', 'corporate', array['workshop', 'treinamento', 'palestra', 'curso'], false, 41),
  ('happy_hour_empresa', 'Happy Hour Empresarial', 'corporativo', 'corporate', array['happy hour', 'empresa', 'firma', 'equipe'], false, 42),
  ('lancamento_produto', 'Lançamento de Produto ou Marca', 'corporativo', 'corporate', array['lancamento', 'produto', 'marca'], false, 43),
  ('conferencia_seminario', 'Conferência / Seminário', 'corporativo', 'corporate', array['conferencia', 'seminario', 'congresso', 'simposio'], false, 44),
  ('festa_junina', 'Festa Junina / Arraiá', 'sazonal', 'other', array['junina', 'arraia', 'sao joao', 'quadrilha', 'julina'], false, 45),
  ('reveillon', 'Réveillon / Ano Novo', 'sazonal', 'other', array['reveillon', 'ano novo', 'virada'], false, 46),
  ('carnaval', 'Bloco / Festa de Carnaval', 'sazonal', 'other', array['carnaval', 'bloco', 'folia'], false, 47),
  ('halloween', 'Festa de Halloween', 'sazonal', 'other', array['halloween', 'dia das bruxas', 'fantasia'], false, 48),
  ('almoco_pascoa', 'Almoço ou Encontro de Páscoa', 'sazonal', 'other', array['pascoa', 'almoco de pascoa'], false, 49),
  ('churrasco_amigos', 'Churrasco / Encontro de Amigos', 'sazonal', 'other', array['churrasco', 'amigos', 'encontro', 'resenha'], false, 50)
on conflict (slug) do update set
  nome = excluded.nome, grupo = excluded.grupo, tipo_base = excluded.tipo_base,
  palavras_chave = excluded.palavras_chave, destaque = excluded.destaque, ordem = excluded.ordem;
