-- Owner-managed global catalog entries and overrides for the shipped seed.
create table if not exists public.arcus_admin_exercises (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  deleted boolean not null default false,
  created_by uuid not null references public.arcus_accounts(id) on delete restrict,
  updated_by uuid not null references public.arcus_accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists arcus_admin_exercises_active_name_idx
  on public.arcus_admin_exercises (lower(payload->>'name')) where deleted = false;

alter table public.arcus_admin_audit
  drop constraint if exists arcus_admin_audit_action_check;
alter table public.arcus_admin_audit
  add constraint arcus_admin_audit_action_check check (action in (
    'user_updated', 'user_viewed', 'user_banned', 'user_unbanned', 'user_warned',
    'user_suspended', 'user_unsuspended', 'exercise_created', 'exercise_updated', 'exercise_deleted',
    'feature_flag_updated', 'announcement_updated', 'admin_granted', 'admin_revoked'
  ));
