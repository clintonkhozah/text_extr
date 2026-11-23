-- Authenticated, project-scoped task register.
-- Uploaded source files and their extracted source text are not persisted.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  constraint projects_id_user_id_key unique (id, user_id)
);

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text,
  name text not null,
  email text,
  type text not null default 'person' check (type in ('person', 'group')),
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  constraint people_id_user_id_key unique (id, user_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null,
  assignee_id uuid,
  description text not null,
  deadline text,
  priority text check (priority is null or priority in ('urgent', 'high', 'medium', 'low')),
  status text not null default 'incoming'
    check (status in ('incoming', 'in_progress', 'waiting', 'done')),
  confidence numeric,
  evidence text,
  unknowns jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint tasks_project_user_fk
    foreign key (project_id, user_id)
    references public.projects (id, user_id)
    on delete cascade,
  constraint tasks_assignee_user_fk
    foreign key (assignee_id, user_id)
    references public.people (id, user_id)
    on delete set null (assignee_id)
);

create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists people_user_id_idx on public.people (user_id);
create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_project_id_idx on public.tasks (project_id);
create index if not exists tasks_assignee_id_idx on public.tasks (assignee_id);
create index if not exists tasks_created_at_idx on public.tasks (created_at desc);

alter table public.projects enable row level security;
alter table public.people enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "users manage their projects" on public.projects;
create policy "users manage their projects"
  on public.projects for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "users manage their people" on public.people;
create policy "users manage their people"
  on public.people for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "users manage their tasks" on public.tasks;
create policy "users manage their tasks"
  on public.tasks for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.projects, public.people, public.tasks to authenticated;
