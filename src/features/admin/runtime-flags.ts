import "server-only";
import { getDatabasePool } from "@/lib/db/pool";

export type PublicRuntimeSettings = { maintenanceMode: boolean; announcement: string; announcementUrl: string; announcementActive: boolean };
let cached: { value: PublicRuntimeSettings; expiresAt: number } | null = null;
let pending: Promise<PublicRuntimeSettings> | null = null;

/** One short-cached query supplies the public shell with safe runtime switches. */
export async function getPublicRuntimeSettings(): Promise<PublicRuntimeSettings> {
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (pending) return pending;
  pending = getDatabasePool().query<{ maintenance_mode: boolean; announcement: string; announcement_url: string; announcement_enabled: string }>(`
    select coalesce((select enabled from public.arcus_feature_flags where flag_key='maintenance_mode'),false) as maintenance_mode,
      coalesce((select setting_value from public.arcus_platform_settings where setting_key='global_announcement'),'') as announcement,
      coalesce((select setting_value from public.arcus_platform_settings where setting_key='global_announcement_url'),'') as announcement_url,
      coalesce((select setting_value from public.arcus_platform_settings where setting_key='global_announcement_enabled'),'false') as announcement_enabled
  `).then(result => ({ maintenanceMode: result.rows[0]?.maintenance_mode === true, announcement: result.rows[0]?.announcement ?? "", announcementUrl: result.rows[0]?.announcement_url ?? "", announcementActive: result.rows[0]?.announcement_enabled === "true" }))
    .catch(() => ({ maintenanceMode: false, announcement: "", announcementUrl: "", announcementActive: false }))
    .then(value => { cached = { value, expiresAt: Date.now() + 5_000 }; return value; })
    .finally(() => { pending = null; });
  return pending;
}

export async function isMaintenanceModeEnabled(): Promise<boolean> {
  return (await getPublicRuntimeSettings()).maintenanceMode;
}
