-- L-Forms · normalizacion de secciones y preguntas + colaboradores
--
-- Antes: las secciones y sus preguntas vivian dentro de forms.sections (jsonb).
-- Ahora: cada seccion y cada pregunta son una fila, con su posicion explicita.
-- La migracion copia los datos existentes antes de eliminar la columna antigua.
--
-- Ejecutalo despues de 0001_init.sql.

/* ------------------------------------------------------------------ */
/* Secciones                                                           */
/* ------------------------------------------------------------------ */

create table if not exists public.sections (
  id text primary key,
  form_id text not null references public.forms on delete cascade,
  position integer not null default 0,
  title text not null default 'Seccion sin titulo',
  description text not null default '',
  -- Destino al terminar la seccion: id de seccion, __next__ o __submit__
  next_section text
);

create index if not exists sections_form_idx on public.sections (form_id, position);

/* ------------------------------------------------------------------ */
/* Preguntas                                                           */
/* ------------------------------------------------------------------ */

create table if not exists public.questions (
  id text primary key,
  form_id text not null references public.forms on delete cascade,
  section_id text not null references public.sections on delete cascade,
  position integer not null default 0,
  type text not null,
  title text not null default '',
  description text not null default '',
  show_description boolean not null default false,
  required boolean not null default false,
  -- Opciones, filas, columnas, escala, calificacion, archivo, firma,
  -- barajado, validacion y medios. Todo lo que depende del tipo.
  config jsonb not null default '{}'::jsonb,
  -- Modo cuestionario
  points integer,
  answer_key jsonb,
  feedback jsonb,
  -- Logica condicional: { idOpcion: idSeccion | __next__ | __submit__ }
  go_to_section jsonb
);

create index if not exists questions_form_idx on public.questions (form_id, position);
create index if not exists questions_section_idx on public.questions (section_id, position);
create index if not exists questions_type_idx on public.questions (type);

/* ------------------------------------------------------------------ */
/* Copia de los datos que ya estuvieran en forms.sections              */
/* ------------------------------------------------------------------ */

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'forms' and column_name = 'sections'
  ) then

    insert into public.sections (id, form_id, position, title, description, next_section)
    select
      s.value->>'id',
      f.id,
      (s.ordinality - 1)::int,
      coalesce(s.value->>'title', 'Seccion sin titulo'),
      coalesce(s.value->>'description', ''),
      s.value->>'nextSection'
    from public.forms f,
         jsonb_array_elements(f.sections) with ordinality as s(value, ordinality)
    on conflict (id) do nothing;

    insert into public.questions (
      id, form_id, section_id, position, type, title, description,
      show_description, required, config, points, answer_key, feedback, go_to_section
    )
    select
      q.value->>'id',
      f.id,
      s.value->>'id',
      (q.ordinality - 1)::int,
      coalesce(q.value->>'type', 'short_text'),
      coalesce(q.value->>'title', ''),
      coalesce(q.value->>'description', ''),
      coalesce((q.value->>'showDescription')::boolean, false),
      coalesce((q.value->>'required')::boolean, false),
      jsonb_strip_nulls(jsonb_build_object(
        'options',        q.value->'options',
        'rows',           q.value->'rows',
        'columns',        q.value->'columns',
        'scale',          q.value->'scale',
        'rating',         q.value->'rating',
        'fileUpload',     q.value->'fileUpload',
        'signature',      q.value->'signature',
        'shuffleOptions', q.value->'shuffleOptions',
        'validation',     q.value->'validation',
        'media',          q.value->'media'
      )),
      (q.value->>'points')::int,
      q.value->'answerKey',
      q.value->'feedback',
      q.value->'goToSection'
    from public.forms f,
         jsonb_array_elements(f.sections) with ordinality as s(value, ordinality),
         jsonb_array_elements(s.value->'questions') with ordinality as q(value, ordinality)
    on conflict (id) do nothing;

    alter table public.forms drop column sections;
  end if;
end $$;

/* ------------------------------------------------------------------ */
/* Colaboradores                                                       */
/* ------------------------------------------------------------------ */

create table if not exists public.form_collaborators (
  form_id text not null references public.forms on delete cascade,
  email text not null,
  role text not null default 'editor' check (role in ('editor', 'viewer')),
  invited_at timestamptz not null default now(),
  primary key (form_id, email)
);

create index if not exists collaborators_email_idx on public.form_collaborators (lower(email));

/* ------------------------------------------------------------------ */
/* Politicas                                                           */
/* ------------------------------------------------------------------ */

alter table public.sections enable row level security;
alter table public.questions enable row level security;
alter table public.form_collaborators enable row level security;

-- Helper: el formulario pertenece a quien consulta.
create or replace function public.owns_form(target_form_id text)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.forms f
    where f.id = target_form_id and f.owner_id = auth.uid()
  );
$$;

-- Helper: el formulario esta publicado.
create or replace function public.form_is_published(target_form_id text)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.forms f
    where f.id = target_form_id and f.status = 'published'
  );
$$;

create policy "el autor administra sus secciones"
  on public.sections for all
  using (public.owns_form(form_id))
  with check (public.owns_form(form_id));

create policy "las secciones publicadas son legibles"
  on public.sections for select
  using (public.form_is_published(form_id));

create policy "el autor administra sus preguntas"
  on public.questions for all
  using (public.owns_form(form_id))
  with check (public.owns_form(form_id));

create policy "las preguntas publicadas son legibles"
  on public.questions for select
  using (public.form_is_published(form_id));

create policy "el autor administra los colaboradores"
  on public.form_collaborators for all
  using (public.owns_form(form_id))
  with check (public.owns_form(form_id));

-- Un colaborador puede ver los formularios en los que fue invitado.
create policy "el colaborador ve su invitacion"
  on public.form_collaborators for select
  using (lower(email) = lower(coalesce(auth.jwt()->>'email', '')));
