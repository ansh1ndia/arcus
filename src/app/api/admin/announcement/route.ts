import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuthorizationFromRequest } from "@/lib/auth/admin";
import { ProfileInputError, readProfileBody } from "@/lib/auth/avatar";
import { getDatabasePool } from "@/lib/db/pool";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store, max-age=0" };
const schema = z.object({
  message: z.string().trim().max(240),
  url: z.union([z.literal(""), z.string().trim().url().max(2048)]),
  enabled: z.boolean(),
}).superRefine((value, context) => {
  if (value.enabled && !value.message) context.addIssue({ code: z.ZodIssueCode.custom, path: ["message"], message: "Add announcement text before enabling the banner." });
  if (value.url && !/^https:\/\//i.test(value.url)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["url"], message: "Announcement links must use HTTPS." });
});

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin"); if (!origin) return false;
  const url = new URL(request.url); const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? request.headers.get("host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().replace(/:$/, "") ?? url.protocol.replace(/:$/, "");
  return origin === `${proto}://${host}`;
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Request origin was not accepted." }, { status: 403, headers });
  try {
    const authorization = await getAdminAuthorizationFromRequest(request);
    if (!authorization) return NextResponse.json({ error: "Admin access is required." }, { status: 401, headers });
    if (authorization.role !== "OWNER") return NextResponse.json({ error: "Only the owner can publish a global announcement." }, { status: 403, headers });
    const parsed = schema.safeParse(await readProfileBody(request));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the announcement values." }, { status: 400, headers });
    const { message, url, enabled } = parsed.data;
    await getDatabasePool().query(`
      with values_to_save(setting_key,setting_value) as (
        select * from unnest(array['global_announcement','global_announcement_url','global_announcement_enabled']::text[],array[$1::text,$2::text,$3::text]::text[])
      ), changed as (
        insert into public.arcus_platform_settings(setting_key,setting_value,updated_by,updated_at)
        select setting_key,setting_value,$4::uuid,now() from values_to_save
        on conflict (setting_key) do update set setting_value=excluded.setting_value,updated_by=excluded.updated_by,updated_at=excluded.updated_at
        returning setting_key,setting_value
      ), audit as (
        insert into public.arcus_admin_audit(actor_id,actor_email,target_type,target_id,action,details)
        select $4::uuid,$5,'settings','global_announcement','announcement_updated',jsonb_build_object('active',$3::text='true','hasLink',$2::text<>'') from changed limit 1 returning id
      ) select count(*) from changed
    `, [message, url, String(enabled), authorization.account.id, authorization.account.email]);
    return NextResponse.json({ message, url, enabled, updated: true }, { headers });
  } catch (error) {
    if (error instanceof ProfileInputError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    return NextResponse.json({ error: "The announcement could not be saved." }, { status: 503, headers });
  }
}
