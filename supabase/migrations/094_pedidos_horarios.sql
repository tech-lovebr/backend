-- 094 — Criar solicitação: horário de início e de término do evento
-- (substituem o "Diurno / Noturno"). O período continua sendo gravado
-- (diurno, noturno, dia_inteiro ou a_definir), calculado pelos horários.
-- Sem esta migration a plataforma publica sem os horários. Idempotente.
alter table pedidos_orcamento add column if not exists horario_inicio text;
alter table pedidos_orcamento add column if not exists horario_fim text;
