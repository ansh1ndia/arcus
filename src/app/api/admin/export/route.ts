import { NextResponse } from "next/server";
import { getAdminAuthorizationFromRequest } from "@/lib/auth/admin";
import { getDatabasePool } from "@/lib/db/pool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function csv(rows: unknown[][]) {
  return rows.map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function GET(request: Request) {
  try {
    const auth = await getAdminAuthorizationFromRequest(request);
    if (!auth) return error("Admin access is required.", 401);
    if (auth.role !== "OWNER") return error("Only the owner can export platform data.", 403);
    const kind = new URL(request.url).searchParams.get("kind");
    const pool = getDatabasePool();
    let body: string;
    let filename: string;
    if (kind === "users") {
      const result = await pool.query<{
        id: string; name: string; handle: string; email: string; role: string; is_pro: boolean; workouts_logged: string; created_at: string;
      }>(`
        select a.id, a.display_name as name, a.username as handle, a.email,
          case when a.id = $1::uuid then 'OWNER' when g.role = 'MODERATOR' then 'MODERATOR' else 'USER' end as role,
          a.is_pro, count(w.id)::text as workouts_logged, a.created_at
        from public.arcus_accounts a
        left join public.arcus_admin_access g on g.account_id = a.id
        left join public.arcus_workouts w on w.account_id = a.id
        group by a.id, g.role order by a.created_at desc, a.id
      `, [process.env.ARCUS_ADMIN_ACCOUNT_ID ?? null]);
      body = csv([["ID", "Name", "Handle", "Email", "Role", "IsPro", "WorkoutsLogged", "CreatedAt"], ...result.rows.map(row => [row.id, row.name, row.handle, row.email, row.role, row.is_pro, row.workouts_logged, row.created_at])]);
      filename = "arcus-users.csv";
    } else if (kind === "workouts") {
      const result = await pool.query<{
        workout_id: string; handle: string; workout_name: string; volume_kg: string; sets_count: string; duration_minutes: string; workout_date: string;
      }>(`
        select w.id::text as workout_id, a.username as handle,
          coalesce(nullif(w.payload->>'name',''), 'Workout') as workout_name,
          coalesce(sum(case when s.item->>'completed' = 'true'
            and coalesce(s.item->>'setType','working') <> 'warmup'
            and ex.item->>'trackingType' is distinct from 'cardio'
            and s.item->>'weight' ~ '^-?[0-9]+(\\.[0-9]+)?$'
            and s.item->>'reps' ~ '^[0-9]+(\\.[0-9]+)?$'
            then (s.item->>'weight')::numeric * (s.item->>'reps')::numeric else 0 end),0)::text as volume_kg,
          count(*) filter (where s.item->>'completed' = 'true')::text as sets_count,
          coalesce(round(greatest(0, extract(epoch from (
            case when w.payload->>'completedAt' ~ '^\\d{4}-\\d{2}-\\d{2}T'
              then (w.payload->>'completedAt')::timestamptz
              else (w.payload->>'startedAt')::timestamptz end
            - (w.payload->>'startedAt')::timestamptz))/60),0)::text as duration_minutes,
          coalesce(w.payload->>'completedAt', w.payload->>'startedAt') as workout_date
        from public.arcus_workouts w join public.arcus_accounts a on a.id=w.account_id
        left join lateral jsonb_array_elements(coalesce(w.payload->'exercises','[]'::jsonb)) ex(item) on true
        left join lateral jsonb_array_elements(coalesce(ex.item->'sets','[]'::jsonb)) s(item) on true
        where w.payload->>'status'='completed'
        group by w.id, a.username, w.payload order by workout_date desc
      `);
      body = csv([["WorkoutID", "UserHandle", "WorkoutName", "TotalVolumeKg", "SetsCount", "DurationMinutes", "Date"], ...result.rows.map(row => [row.workout_id, row.handle, row.workout_name, row.volume_kg, row.sets_count, row.duration_minutes, row.workout_date])]);
      filename = "arcus-workouts.csv";
    } else return error("Choose a supported export.", 400);

    return new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return error("The data export could not be generated.", 503);
  }
}
