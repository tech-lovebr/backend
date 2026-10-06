-- ==============================================================================
-- LOVE — Traz os banners que estavam fixos no HTML para dentro do banco
--
-- Rode no SQL Editor do Supabase DEPOIS do 015_contas_origem.sql. É idempotente.
--
-- O carrossel do Hub (B2B) e o card promocional do dashboard dos anfitriões
-- eram escritos à mão no HTML, então o Admin não tinha o que mostrar em
-- Informações → Banner da home. Esta migration cadastra as imagens que já
-- estavam no ar; a partir daqui as duas plataformas leem daqui, e editar ou
-- excluir no Admin reflete nelas.
--
-- As URLs são absolutas de propósito: o mesmo registro é lido pelo Admin
-- (admin.love.com.br), pelo Hub (hub.love.com.br) e pelo site (love.com.br),
-- e um caminho relativo quebraria em pelo menos um deles.
-- ==============================================================================

-- Só semeia se a plataforma ainda não tiver banner nenhum — rodar de novo depois
-- de o admin ter mexido no carrossel não duplica nem ressuscita o que foi excluído.
insert into conteudo_plataforma (plataforma, secao, titulo, descricao, imagem_url, link_url, posicao, status)
select * from (values
  ('fornecedor', 'banner', 'Guia de início',
   'Conheça tudo o que a Love pode fazer pelo seu negócio.',
   'https://love.com.br/assets/wedding_hero_banner.jpg',  'guias.html',  1, 'publicado'),
  ('fornecedor', 'banner', 'Convide sua equipe',
   'Convide colaboradores e ganhe desconto na sua assinatura.',
   'https://love.com.br/assets/birthday_hero_banner.jpg', 'funcoes.html', 2, 'publicado'),
  ('fornecedor', 'banner', 'Notas fiscais automáticas',
   'Notas fiscais emitidas automaticamente em cada venda.',
   'https://love.com.br/assets/wedding_table_dinner.jpg', 'vendas.html',  3, 'publicado')
) as v(plataforma, secao, titulo, descricao, imagem_url, link_url, posicao, status)
where not exists (
  select 1 from conteudo_plataforma
   where plataforma = 'fornecedor' and secao = 'banner'
);

insert into conteudo_plataforma (plataforma, secao, titulo, descricao, imagem_url, link_url, posicao, status)
select * from (values
  ('cliente', 'banner', 'High quality, not high cost',
   'Designs que impressionam os seus convidados sem estourar o orçamento.',
   'https://love.com.br/assets/banner_high_quality.jpg', null::text, 1, 'publicado')
) as v(plataforma, secao, titulo, descricao, imagem_url, link_url, posicao, status)
where not exists (
  select 1 from conteudo_plataforma
   where plataforma = 'cliente' and secao = 'banner'
);
