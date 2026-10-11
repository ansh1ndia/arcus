"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin, getAdminRole } from "@/lib/auth/admin";
import { getDatabasePool } from "@/lib/db/pool";

const pardonSchema = z.object({
  targetUserId: z.string().uuid(),
  reason: z.string().trim().max(500).optional().refine(value => !value || !/<[^>]*>/.test(value), "Reason must be plain text."),
});

export async function unwarnUser(targetUserId: string, reason?: string) {
  const actor = await requireAdmin();
  const role = await getAdminRole(actor);
  if (role !== "OWNER" && role !== "MODERATOR") throw new Error("Admin access is required.");
  const parsed = pardonSchema.safeParse({ targetUserId, reason });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the submitted values.");

  const result = await getDatabasePool().query<{ removed: number; warningCount: number; username: string }>(`
    with target as (
      select a.id,a.username,count(w.id)::int as old_count
      from public.arcus_accounts a
      left join public.arcus_user_warnings w on w.account_id=a.id
      where a.id=$1::uuid and ($5::uuid is null or a.id<>$5::uuid)
        and ($7::text is null or lower(a.email)<>lower($7))
        and ($6::text='OWNER' or not exists (select 1 from public.arcus_admin_access g where g.account_id=a.id))
      group by a.id,a.username
    ), removed as (
      delete from public.arcus_user_warnings w using target t
      where w.id=(select newest.id from public.arcus_user_warnings newest where newest.account_id=t.id order by newest.created_at desc,newest.id desc limit 1)
      returning w.id,w.account_id
    ), audit as (
      insert into public.arcus_admin_audit(actor_id,actor_email,target_type,target_id,action,details)
      select $2::uuid,$3,'user',r.account_id::text,'user_unwarned',jsonb_build_object('warningId',r.id,'reason',$4::text)
      from removed r returning id
    )
    select count(r.id)::int as removed,greatest(0,t.old_count-count(r.id))::int as "warningCount",t.username
    from target t left join removed r on r.account_id=t.id group by t.old_count,t.username
  `, [parsed.data.targetUserId, actor.id, actor.email, parsed.data.reason ?? "", process.env.ARCUS_ADMIN_ACCOUNT_ID ?? null, role, process.env.ARCUS_ADMIN_EMAIL ?? null]);
  const row = result.rows[0];
  if (!row?.removed) throw new Error("No warning was found for this user, or the account is protected at your role level.");

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${parsed.data.targetUserId}/view`);
  return { warningCount: row.warningCount, username: row.username };
}
