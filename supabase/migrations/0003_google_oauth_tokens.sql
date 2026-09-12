-- ============================================================
-- 0003_google_oauth_tokens.sql
-- Almacena tokens de Google OAuth por usuario para sincronizacion
-- con Google Drive y Google Sheets.
-- ============================================================

create table if not exists public.user_google_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  refresh_token text not null,
  access_token text,
  expiry_date bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_google_tokens enable row level security;

drop policy if exists "el usuario administra sus tokens de google" on public.user_google_tokens;
create policy "el usuario administra sus tokens de google"
  on public.user_google_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Funcion RPC segura con security definer para que la ruta /api/sheets/append
-- pueda obtener el spreadsheet_id y refresh_token del creador del formulario
-- cuando un encuestado anonimo envia una respuesta.
create or replace function public.get_form_sheet_credentials(p_form_id text)
returns table (
  spreadsheet_id text,
  refresh_token text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select f.spreadsheet_id, t.refresh_token
  from public.forms f
  join public.user_google_tokens t on t.user_id = f.owner_id
  where f.id = p_form_id
    and f.spreadsheet_id is not null;
end;
$$;

-- Permite al callback OAuth guardar de manera segura los tokens del usuario
create or replace function public.save_user_google_token(
  p_user_id uuid,
  p_email text,
  p_refresh_token text,
  p_access_token text,
  p_expiry_date bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_google_tokens (user_id, email, refresh_token, access_token, expiry_date, updated_at)
  values (p_user_id, p_email, p_refresh_token, p_access_token, p_expiry_date, now())
  on conflict (user_id) do update set
    email = coalesce(excluded.email, public.user_google_tokens.email),
    refresh_token = case 
      when excluded.refresh_token is not null and excluded.refresh_token <> '' then excluded.refresh_token 
      else public.user_google_tokens.refresh_token 
    end,
    access_token = coalesce(excluded.access_token, public.user_google_tokens.access_token),
    expiry_date = coalesce(excluded.expiry_date, public.user_google_tokens.expiry_date),
    updated_at = now();
end;
$$;
