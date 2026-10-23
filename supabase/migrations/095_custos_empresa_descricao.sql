-- 095 — Custos manuais com empresa e descrição (Settings → Custos →
-- Adicionar custo). Empresa vem de uma lista (Vercel, Supabase, GoDaddy...)
-- ou é digitada em "Outro"; descrição diz o que foi comprado.
--
-- Rode no SQL Editor. Idempotente.

alter table custos add column if not exists empresa text;
alter table custos add column if not exists descricao text;
