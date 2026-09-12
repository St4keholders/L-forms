-- L-Forms · esquema inicial
-- Ejecutalo en el editor SQL de tu proyecto de Supabase.

/* ------------------------------------------------------------------ */
/* Perfiles                                                            */
/* ------------------------------------------------------------------ */

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  name text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "perfil propio visible"
  on public.profiles for select
  using (auth.uid() = id);

create policy "perfil propio editable"
  on public.profiles for update
  using (auth.uid() = id);

-- Crea el perfil automaticamente al registrarse.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

/* ------------------------------------------------------------------ */
/* Formularios                                                         */
/* ------------------------------------------------------------------ */

create table if not exists public.forms (
  id text primary key,
  owner_id uuid not null references auth.users on delete cascade,
  title text not null default 'Formulario sin titulo',
  description text not null default '',
  sections jsonb not null default '[]'::jsonb,
  theme jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  -- Reservado para la integracion con Google Sheets (hoja creada en Drive).
  spreadsheet_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists forms_owner_idx on public.forms (owner_id, updated_at desc);

alter table public.forms enable row level security;

-- El autor ve y administra los suyos.
create policy "el autor administra sus formularios"
  on public.forms for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Cualquiera puede leer un formulario publicado para poder responderlo.
create policy "los formularios publicados son legibles"
  on public.forms for select
  using (status = 'published');

/* ------------------------------------------------------------------ */
/* Respuestas                                                          */
/* ------------------------------------------------------------------ */

create table if not exists public.responses (
  id text primary key,
  form_id text not null references public.forms on delete cascade,
  submitted_at timestamptz not null default now(),
  respondent_email text,
  answers jsonb not null default '{}'::jsonb,
  score integer,
  total_points integer
);

create index if not exists responses_form_idx on public.responses (form_id, submitted_at desc);

alter table public.responses enable row level security;

-- Solo el autor del formulario lee las respuestas.
create policy "el autor lee sus respuestas"
  on public.responses for select
  using (
    exists (
      select 1 from public.forms f
      where f.id = responses.form_id and f.owner_id = auth.uid()
    )
  );

create policy "el autor borra sus respuestas"
  on public.responses for delete
  using (
    exists (
      select 1 from public.forms f
      where f.id = responses.form_id and f.owner_id = auth.uid()
    )
  );

-- Cualquiera puede responder mientras el formulario este publicado.
create policy "se puede responder a formularios publicados"
  on public.responses for insert
  with check (
    exists (
      select 1 from public.forms f
      where f.id = responses.form_id and f.status = 'published'
    )
  );

/* ------------------------------------------------------------------ */
/* Almacenamiento                                                      */
/* ------------------------------------------------------------------ */

-- Bucket para adjuntos y firmas.
insert into storage.buckets (id, name, public)
values ('l-forms', 'l-forms', true)
on conflict (id) do nothing;

create policy "subida de adjuntos y firmas"
  on storage.objects for insert
  with check (bucket_id = 'l-forms');

create policy "lectura de adjuntos y firmas"
  on storage.objects for select
  using (bucket_id = 'l-forms');
