-- Supabase Setup Script
-- Executar isso no SQL Editor do dashboard do Supabase

-- 1. Habilitar extensões necessárias (se houver)
create extension if not exists "uuid-ossp";

-- 2. Tabela de voice_settings
create table if not exists public.voice_settings (
    id uuid default uuid_generate_v4() primary key,
    user_id text not null unique,
    voice_name text default 'Nova',
    system_instruction text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabela de voice_history
create table if not exists public.voice_history (
    id uuid default uuid_generate_v4() primary key,
    user_id text not null,
    session_id text not null,
    role text not null check (role in ('user', 'model')),
    text text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Índices para performance
create index if not exists voice_history_user_id_idx on public.voice_history(user_id);
create index if not exists voice_history_session_id_idx on public.voice_history(session_id);

-- 4. Tabela de user_profiles (se necessário expandir o users do auth)
create table if not exists public.user_profiles (
    id uuid references auth.users on delete cascade primary key,
    display_name text,
    role text default 'user',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Policies RLS (Row Level Security) básicas
alter table public.voice_settings enable row level security;
alter table public.voice_history enable row level security;
alter table public.user_profiles enable row level security;

-- Permitir leitura/escrita para quem tem service_role (a API do backend)
create policy "Allow all for service role on voice_settings" on public.voice_settings for all using (true) with check (true);
create policy "Allow all for service role on voice_history" on public.voice_history for all using (true) with check (true);
create policy "Allow all for service role on user_profiles" on public.user_profiles for all using (true) with check (true);
