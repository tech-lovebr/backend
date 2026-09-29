/* ==========================================================================
   LOVE ADMIN — Cliente de dados compartilhado

   Em modo demonstração (js/mock.js), devolve um cliente falso com dados
   fictícios guardados no navegador — serve para ajustar interface sem
   depender do banco.

   Fora dele, é o Supabase de verdade, com a chave ANON (pública): o poder
   de administrador vem do papel do usuário no banco (tabela `admins` +
   função is_admin()), nunca da chave.
   ========================================================================== */

const SUPABASE_URL = 'https://krpgtixwmxwhtjchcufl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtycGd0aXh3bXh3aHRqY2hjdWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNzI5ODgsImV4cCI6MjEwNTc0ODk4OH0.6ZwpEz-m-qWM_bPW8_Fucvv2EWkdMBkmH2BVgPdMfuQ';

const MODO_DEMO_ATIVO = Boolean(window.LOVE_DEMO && window.LOVE_DEMO.ativo());

const supabaseClient = MODO_DEMO_ATIVO
  ? window.LOVE_DEMO.client()
  : window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (MODO_DEMO_ATIVO) {
  console.info('[Love Admin] Modo demonstração ligado — dados fictícios, nada é gravado no Supabase.');
}
