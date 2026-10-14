-- ==============================================================================
-- LOVE — Títulos dos documentos legais com maiúscula, como no resto do site
--
-- Rode no SQL Editor. É idempotente.
--
-- A página abre com o título provisório do código ("Termos de Uso" /
-- "Política de Privacidade") e, quando o documento chega do banco, troca pelo
-- título salvo aqui — que estava "Termos de uso" / "Política de privacidade".
-- O título "piscava" de maiúscula para minúscula. Só ajusta se ainda estiver
-- com o texto original, para não sobrescrever um título editado no Admin.
-- ==============================================================================

update documentos_legais set titulo = 'Termos de Uso'
 where slug = 'termos' and titulo = 'Termos de uso';

update documentos_legais set titulo = 'Política de Privacidade'
 where slug = 'privacidade' and titulo = 'Política de privacidade';
