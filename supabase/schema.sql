-- OQlean CRM schema. Paste the whole file into Supabase → SQL Editor → Run.
-- Roles: admin (sees everything incl. payouts, expenses, profit), manager (leads, orders, cleaners), pending (waits for approval).
-- The very first user who registers becomes admin automatically.

create extension if not exists pgcrypto;

-- ---------- people ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  name text,
  role text not null default 'pending' check (role in ('pending','manager','admin','blocked')),
  created_at timestamptz not null default now()
);

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() in ('manager','admin'), false)
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'admin', false)
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id, new.email,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1)),
    case when not exists (select 1 from public.profiles where role = 'admin') then 'admin' else 'pending' end
  );
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- leads ----------
create table if not exists public.leads (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ref text unique,
  source text not null default 'site',          -- site, instagram, telegram, phone, referral, other
  name text not null,
  phone text not null,
  district text,
  address text,
  when_text text,
  service text,                                  -- standard, deep, reno, dry, office
  rooms int,
  baths int,
  options jsonb not null default '[]',
  quote numeric,
  details text,
  lang text,
  status text not null default 'new' check (status in ('new','contacted','ndz','booked','done','later','lost')),
  lost_reason text,
  owner text,
  tg_chat text,
  tg_message bigint
);
create index if not exists leads_created_idx on public.leads (created_at desc);
create index if not exists leads_tg_idx on public.leads (tg_chat, tg_message);

create table if not exists public.lead_events (
  id bigint generated always as identity primary key,
  lead_id bigint not null references public.leads on delete cascade,
  created_at timestamptz not null default now(),
  actor text,
  kind text not null check (kind in ('status','comment','system')),
  status text,
  text text
);
create index if not exists lead_events_lead_idx on public.lead_events (lead_id, created_at);

-- ---------- operations ----------
create table if not exists public.cleaners (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  phone text,
  active boolean not null default true,
  notes text
);

create table if not exists public.orders (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  lead_id bigint references public.leads on delete set null,
  date date,
  time_text text,
  client_name text,
  phone text,
  district text,
  address text,
  service text,
  rooms int,
  area_m2 numeric,
  price numeric not null default 0,
  status text not null default 'scheduled' check (status in ('scheduled','done','cancelled')),
  paid boolean not null default false,
  paid_at date,
  pay_method text,
  notes text
);
create index if not exists orders_date_idx on public.orders (date desc);

create table if not exists public.order_cleaners (
  order_id bigint not null references public.orders on delete cascade,
  cleaner_id bigint not null references public.cleaners on delete restrict,
  primary key (order_id, cleaner_id)
);

-- ---------- money (admins only) ----------
create table if not exists public.payouts (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  order_id bigint not null references public.orders on delete cascade,
  cleaner_id bigint not null references public.cleaners on delete restrict,
  amount numeric not null default 0,
  paid boolean not null default false,
  paid_at date,
  unique (order_id, cleaner_id)
);

create table if not exists public.expenses (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  date date not null default current_date,
  category text not null,                        -- chemicals, ads, transport, equipment, partner, salary, other
  amount numeric not null,
  note text,
  order_id bigint references public.orders on delete set null,
  created_by text
);
create index if not exists expenses_date_idx on public.expenses (date desc);

-- ---------- row level security ----------
alter table public.profiles       enable row level security;
alter table public.leads          enable row level security;
alter table public.lead_events    enable row level security;
alter table public.cleaners       enable row level security;
alter table public.orders         enable row level security;
alter table public.order_cleaners enable row level security;
alter table public.payouts        enable row level security;
alter table public.expenses       enable row level security;

drop policy if exists "profiles read"   on public.profiles;
drop policy if exists "profiles admin"  on public.profiles;
create policy "profiles read"  on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles admin" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

do $$
declare t text;
begin
  foreach t in array array['leads','lead_events','cleaners','orders','order_cleaners'] loop
    execute format('drop policy if exists "staff read" on public.%I', t);
    execute format('drop policy if exists "staff insert" on public.%I', t);
    execute format('drop policy if exists "staff update" on public.%I', t);
    execute format('drop policy if exists "admin delete" on public.%I', t);
    execute format('create policy "staff read"   on public.%I for select using (public.is_staff())', t);
    execute format('create policy "staff insert" on public.%I for insert with check (public.is_staff())', t);
    execute format('create policy "staff update" on public.%I for update using (public.is_staff()) with check (public.is_staff())', t);
    execute format('create policy "admin delete" on public.%I for delete using (public.is_admin())', t);
  end loop;
  foreach t in array array['payouts','expenses'] loop
    execute format('drop policy if exists "admin all" on public.%I', t);
    execute format('create policy "admin all" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- managers may remove a cleaner from an order they are editing
drop policy if exists "admin delete" on public.order_cleaners;
drop policy if exists "staff delete" on public.order_cleaners;
create policy "staff delete" on public.order_cleaners for delete using (public.is_staff());
