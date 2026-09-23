-- ==============================================================================
-- Backend real do B2B: Agenda, CRM, Produtos, Contratos e Carteira
-- Rode este arquivo inteiro no SQL Editor do Supabase, depois do 001_auth_chat.sql.
-- ==============================================================================

-- ------------------------------------------------------------------
-- 0. Chave Pix no perfil do fornecedor
-- ------------------------------------------------------------------

alter table fornecedores add column if not exists pix_key text;
alter table fornecedores add column if not exists pix_key_type text;

-- ------------------------------------------------------------------
-- 1. CRM (leads)
-- ------------------------------------------------------------------

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references fornecedores(id) on delete cascade,
  name text not null,
  event_name text,
  event_date text,
  status text not null default 'novo' check (status in ('novo', 'conversa', 'proposta', 'fechado')),
  value numeric,
  birthday text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- 2. Produtos
-- ------------------------------------------------------------------

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references fornecedores(id) on delete cascade,
  name text not null,
  category text,
  price numeric,
  description text,
  active boolean not null default true,
  cover_image_url text,
  gallery jsonb not null default '[]',
  extra jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- 3. Contratos
-- ------------------------------------------------------------------

create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references fornecedores(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  client_name text not null,
  client_phone text,
  categoria text,
  valor_total numeric not null default 0,
  valor_pago numeric not null default 0,
  parcelas_pagas int not null default 0,
  parcelas_total int not null default 1,
  status text not null default 'em_dia' check (status in ('quitado', 'em_dia', 'atrasado')),
  proxima_parcela date,
  evento jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table contracts add column if not exists proxima_parcela date;

create table if not exists contract_guests (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references fornecedores(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  nome text not null,
  status text,
  mesa text,
  whatsapp text,
  comentarios jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table contract_guests alter column comentarios type jsonb using '[]'::jsonb;
alter table contract_guests alter column comentarios set default '[]';

-- ------------------------------------------------------------------
-- 4. Links de pagamento, notas fiscais e carteira (livro-razão)
-- ------------------------------------------------------------------

create table if not exists payment_links (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references fornecedores(id) on delete cascade,
  contract_id uuid references contracts(id) on delete set null,
  amount numeric not null,
  installments int not null default 1,
  pass_fee_to_client boolean not null default false,
  payment_methods jsonb not null default '{}',
  status text not null default 'pendente' check (status in ('pendente', 'pago')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists notas_fiscais (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references fornecedores(id) on delete cascade,
  source_payment_link_id uuid references payment_links(id) on delete set null,
  client text,
  value numeric,
  number text,
  status text not null default 'emitida',
  created_at timestamptz not null default now()
);

create table if not exists wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references fornecedores(id) on delete cascade,
  type text not null check (type in ('credit', 'debit')),
  amount numeric not null,
  description text,
  payment_link_id uuid references payment_links(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- 5. Agenda (quadro de tarefas + calendário)
-- ------------------------------------------------------------------

create table if not exists agenda_lists (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references fornecedores(id) on delete cascade,
  title text not null,
  color text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists agenda_tasks (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references fornecedores(id) on delete cascade,
  list_id uuid not null references agenda_lists(id) on delete cascade,
  position int not null default 0,
  text text not null,
  done boolean not null default false,
  due_date date,
  created_at timestamptz not null default now()
);

create table if not exists agenda_task_activity (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references fornecedores(id) on delete cascade,
  task_id uuid not null references agenda_tasks(id) on delete cascade,
  type text not null,
  user_name text,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists agenda_events (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references fornecedores(id) on delete cascade,
  date date not null,
  title text not null,
  type text,
  type_custom text,
  start_time time,
  end_time time,
  link text,
  local text,
  description text,
  guests jsonb not null default '[]',
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists agenda_tasks_list_id_idx on agenda_tasks (list_id, position);
create index if not exists agenda_events_fornecedor_date_idx on agenda_events (fornecedor_id, date);

-- ------------------------------------------------------------------
-- 6. Row Level Security — todas as tabelas acima só são visíveis/
--    editáveis pelo próprio fornecedor dono da linha.
-- ------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'leads', 'products', 'contracts', 'contract_guests',
    'payment_links', 'notas_fiscais', 'wallet_transactions',
    'agenda_lists', 'agenda_tasks', 'agenda_task_activity', 'agenda_events'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format(
      'create policy "%1$s_owner_select" on %1$I for select to authenticated using (auth.uid() = fornecedor_id);',
      t
    );
    execute format(
      'create policy "%1$s_owner_insert" on %1$I for insert to authenticated with check (auth.uid() = fornecedor_id);',
      t
    );
    execute format(
      'create policy "%1$s_owner_update" on %1$I for update to authenticated using (auth.uid() = fornecedor_id);',
      t
    );
    execute format(
      'create policy "%1$s_owner_delete" on %1$I for delete to authenticated using (auth.uid() = fornecedor_id);',
      t
    );
  end loop;
end $$;
