-- Add the missing owner/moderator pardon event and persist announcement links/state.
alter table public.arcus_admin_audit
  drop constraint if exists arcus_admin_audit_action_check;
alter table public.arcus_admin_audit
  add constraint arcus_admin_audit_action_check check (action in (
    'user_updated', 'user_banned', 'user_unbanned', 'user_warned', 'user_unwarned',
    'user_suspended', 'user_unsuspended', 'exercise_updated', 'exercise_deleted',
    'feature_flag_updated', 'announcement_updated', 'admin_granted', 'admin_revoked'
  ));

alter table public.arcus_platform_settings
  drop constraint if exists arcus_platform_settings_setting_key_check;
alter table public.arcus_platform_settings
  add constraint arcus_platform_settings_setting_key_check
  check (setting_key in ('global_announcement', 'global_announcement_url', 'global_announcement_enabled'));

insert into public.arcus_platform_settings(setting_key, setting_value)
values ('global_announcement_url', '')
on conflict (setting_key) do nothing;
insert into public.arcus_platform_settings(setting_key, setting_value)
select 'global_announcement_enabled', (setting_value <> '')::text
from public.arcus_platform_settings where setting_key='global_announcement'
on conflict (setting_key) do nothing;
