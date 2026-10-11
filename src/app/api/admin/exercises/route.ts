import { NextResponse } from "next/server";
import { z } from "zod";
import { exerciseCatalog } from "@/features/exercises/catalog";
import { getAdminAuthorizationFromRequest } from "@/lib/auth/admin";
import { getDatabasePool } from "@/lib/db/pool";
import { ProfileInputError, readProfileBody } from "@/lib/auth/avatar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const category = z.enum(["Barbell", "Dumbbell", "Machine", "Cable", "Bodyweight", "Other"]);
const payloadSchema = z.object({
  name: z.string().trim().min(2).max(100).regex(/^[\p{L}\p{N}][\p{L}\p{N} '&().+/-]*$/u),
  category,
  primaryMuscle: z.string().trim().min(2).max(50),
  secondaryMuscles: z.array(z.string().trim().min(2).max(50)).max(8),
  instructions: z.string().trim().max(3000),
});
const changeSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), ...payloadSchema.shape }),
  z.object({ action: z.literal("update"), id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100), ...payloadSchema.shape }),
  z.object({ action: z.literal("delete"), id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100) }),
]);

function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0" } }); }
function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? request.headers.get("host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().replace(/:$/, "") ?? url.protocol.replace(/:$/, "");
  return origin === `${proto}://${host}`;
}
function toPayload(input: z.infer<typeof payloadSchema>) {
  return { name: input.name, category: input.category, equipment: input.category, muscle: input.primaryMuscle, primaryMuscles: [input.primaryMuscle], secondaryMuscles: input.secondaryMuscles, instructions: input.instructions, pattern: "", aliases: [], restSeconds: 90 };
}

export async function GET() {
  try {
    const result = await getDatabasePool().query<{ id: string; payload: Record<string, unknown>; deleted: boolean }>("select id,payload,deleted from public.arcus_admin_exercises");
    const exercises = new Map(exerciseCatalog.map(exercise => [exercise.id, exercise]));
    for (const entry of result.rows) {
      if (entry.deleted) { exercises.delete(entry.id); continue; }
      const existing = exercises.get(entry.id);
      exercises.set(entry.id, { ...(existing ?? { pattern: "", aliases: [], restSeconds: 90 }), ...(entry.payload as object), id: entry.id, isCustom: false } as typeof exerciseCatalog[number]);
    }
    return json({ exercises: [...exercises.values()] });
  } catch {
    // The bundled catalog remains usable if the owner has not applied migration 0020 yet.
    return json({ exercises: exerciseCatalog });
  }
}

export async function POST(request: Request) { return mutate(request); }
export async function PATCH(request: Request) { return mutate(request); }
export async function DELETE(request: Request) { return mutate(request); }

async function mutate(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Request origin was not accepted." }, 403);
  try {
    const auth = await getAdminAuthorizationFromRequest(request);
    if (!auth) return json({ error: "Admin access is required." }, 401);
    if (auth.role !== "OWNER") return json({ error: "Only the owner can manage the global exercise catalog." }, 403);
    const parsed = changeSchema.safeParse(await readProfileBody(request));
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Check the exercise fields." }, 400);
    const pool = getDatabasePool();
    const builtInIds = new Set(exerciseCatalog.map(exercise => exercise.id));
    const actorId = auth.account.id;
    if (parsed.data.action === "create") {
      const data = parsed.data;
      const id = data.name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 96);
      if (!id) return json({ error: "Choose a name that can form an exercise ID." }, 400);
      const result = await pool.query<{ id: string }>(`
        with saved as (insert into public.arcus_admin_exercises(id,payload,created_by,updated_by)
          values ($1,$2::jsonb,$3::uuid,$3::uuid) returning id), audit as (
          insert into public.arcus_admin_audit(actor_id,actor_email,target_type,target_id,action)
          select $3::uuid,$4,'exercise',id,'exercise_created' from saved returning id)
        select id from saved
      `, [id, JSON.stringify(toPayload(data)), actorId, auth.account.email]);
      return json({ ok: true, id: result.rows[0].id, message: "Exercise added to the shared catalog." }, 201);
    }

    const { id } = parsed.data;
    const managedBuiltin = builtInIds.has(id);
    const existing = await pool.query<{ id: string; payload: Record<string, unknown> }>("select id,payload from public.arcus_admin_exercises where id=$1", [id]);
    if (!managedBuiltin && !existing.rows[0]) return json({ error: "Exercise not found in the shared catalog." }, 404);
    if (parsed.data.action === "update") {
      const data = parsed.data;
      const original = existing.rows[0]?.payload ?? exerciseCatalog.find(item => item.id === id);
      const nextPayload = { ...(original ?? {}), ...toPayload(data) };
      await pool.query(`with saved as (
          insert into public.arcus_admin_exercises(id,payload,created_by,updated_by)
          values ($1,$2::jsonb,$3::uuid,$3::uuid)
          on conflict(id) do update set payload=excluded.payload,deleted=false,updated_by=excluded.updated_by,updated_at=now()
          returning id), audit as (
          insert into public.arcus_admin_audit(actor_id,actor_email,target_type,target_id,action,details)
          select $3::uuid,$4,'exercise',id,'exercise_updated',jsonb_build_object('name',$5) from saved returning id)
        select id from saved`, [id, JSON.stringify(nextPayload), actorId, auth.account.email, data.name]);
      return json({ ok: true, message: "Shared exercise updated." });
    }
    await pool.query(`with removed as (update public.arcus_admin_exercises set deleted=true,updated_by=$2::uuid,updated_at=now() where id=$1 returning id), audit as (
        insert into public.arcus_admin_audit(actor_id,actor_email,target_type,target_id,action)
        select $2::uuid,$3,'exercise',id,'exercise_deleted' from removed returning id)
      select id from removed`, [id, actorId, auth.account.email]);
    return json({ ok: true, message: "Exercise removed from the shared catalog." });
  } catch (error) {
    if (error instanceof ProfileInputError) return json({ error: error.message }, error.status);
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    if (code === "23505") return json({ error: "An exercise with that name already exists." }, 409);
    return json({ error: "The exercise change could not be saved. Apply the admin catalog database migration if it has not been run." }, 503);
  }
}
