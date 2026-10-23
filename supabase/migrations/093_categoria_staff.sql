-- 093 — Criar solicitação: nova categoria de pedido "staff" (Staff e mão de obra).
-- Quem tem produto em "Staff e Mão de Obra" no Hub passa a ver e poder
-- responder pedidos dessa categoria (mesma regra da 079). Idempotente.
create or replace function public.categorias_pedido_do_produto(p_categoria text)
returns text[]
language sql
immutable
as $$
  select case coalesce(p_categoria, '')
    when 'Mídia e Audiovisual' then array['fotografia']
    when 'Foto, Vídeo & Audiovisual' then array['fotografia']
    when 'Mídia' then array['fotografia']
    when 'Buffet e Gastronomia' then array['buffet', 'doces']
    when 'Buffet' then array['buffet', 'doces']
    when 'Espaços para Locação' then array['espaco']
    when 'Locação de espaço' then array['espaco']
    when 'Espaços & Locações' then array['espaco']
    when 'Espaço de Locação' then array['espaco']
    when 'Decoração' then array['decoracao']
    when 'Música e Entretenimento' then array['musica']
    when 'Assessoria e Cerimonialista' then array['assessoria']
    when 'Bar e Bebidas' then array['bebidas']
    when 'Staff e Mão de Obra' then array['staff']
    when 'Staff & Mão de Obra' then array['staff']
    else array[]::text[]
  end;
$$;
