-- ==============================================================================
-- SCHEMA & RLS POLICIES - LOVE PLATFORM
-- ==============================================================================

-- 1. Habilita Row Level Security (RLS) na tabela de usuários
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Políticas de Exemplo para usuários autenticados (opcional):
-- Permitir que cada usuário leia e atualize apenas seus próprios dados:
-- CREATE POLICY "Usuários podem ver apenas seu próprio perfil" 
--   ON users FOR SELECT 
--   USING (auth.uid() = id);

-- CREATE POLICY "Usuários podem atualizar apenas seu próprio perfil" 
--   ON users FOR UPDATE 
--   USING (auth.uid() = id);
