-- Upgrade the earlier client_id/owner schema to user-scoped RLS.
-- Existing rows with no user_id remain private/unavailable until explicitly
-- assigned to an Auth user. Existing tasks with no project cannot be saved as-is.

alter table public.projects add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.projects add column if not exists description text;
alter table public.people add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.people add column if not exists type text not null default 'person';
alter table public.tasks add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.tasks add column if not exists assignee_id uuid;

do $$
declare
  target_table text;
begin
  foreach target_table in array array['projects', 'people', 'tasks'] loop
    if exists (
      select 1
      from information_schema.columns as c
      where c.table_schema = 'public'
        and c.table_name = target_table
        and c.column_name = 'client_id'
    ) then
      execute format('alter table public.%I alter column client_id drop not null', target_table);
    end if;
  end loop;
end
$$;

create unique index if not exists projects_id_user_id_key on public.projects (id, user_id);
create unique index if not exists people_id_user_id_key on public.people (id, user_id);
create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists people_user_id_idx on public.people (user_id);
create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_project_id_idx on public.tasks (project_id);
create index if not exists tasks_assignee_id_idx on public.tasks (assignee_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'people_type_check') then
    alter table public.people
      add constraint people_type_check check (type in ('person', 'group')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'projects_user_id_required') then
    alter table public.projects
      add constraint projects_user_id_required check (user_id is not null) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'people_user_id_required') then
    alter table public.people
      add constraint people_user_id_required check (user_id is not null) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tasks_user_id_required') then
    alter table public.tasks
      add constraint tasks_user_id_required check (user_id is not null) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tasks_project_required') then
    alter table public.tasks
      add constraint tasks_project_required check (project_id is not null) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tasks_project_user_fk') then
    alter table public.tasks
      add constraint tasks_project_user_fk
      foreign key (project_id, user_id)
      references public.projects (id, user_id)
      on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tasks_assignee_user_fk') then
    alter table public.tasks
      add constraint tasks_assignee_user_fk
      foreign key (assignee_id, user_id)
      references public.people (id, user_id)
      on delete set null (assignee_id) not valid;
  end if;
end
$$;

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

-- Disable the old source-document API/table for browser-authenticated clients.
do $$
begin
  if to_regclass('public.documents') is not null then
    execute 'alter table public.documents enable row level security';
    execute 'revoke all on public.documents from anon, authenticated';
  end if;
end
$$;
