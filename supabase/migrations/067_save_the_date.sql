-- ==============================================================================
-- LOVE — Save the Date (Aparência › página "Save the Date")
--
-- Rode no SQL Editor. É idempotente.
--
-- O construtor da Aparência agora tem a página "Save the Date" (capa + textos,
-- sem botões), salva em convite_digital_pages com page_key = 'savethedate'.
-- Ela não é publicada: o anfitrião compartilha como imagem + texto
-- (WhatsApp, Instagram, e-mail).
-- ==============================================================================

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'convite_digital_pages'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%page_key%'
  loop
    execute format('alter table convite_digital_pages drop constraint %I', c.conname);
  end loop;

  alter table convite_digital_pages add constraint convite_digital_pages_page_key_check
    check (page_key in ('convite', 'presentes', 'dresscode', 'savethedate'));
end $$;
