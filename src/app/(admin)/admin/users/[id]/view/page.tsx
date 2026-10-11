import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Eye, ShieldAlert } from "lucide-react";
import { isOwnerAccount, requireAdmin } from "@/lib/auth/admin";
import { getDatabasePool } from "@/lib/db/pool";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = { title: "Read-only support view · ARCUS Admin", description: "Review account details and recent workout records in owner support mode." };
type Account = { id: string; username: string; name: string; email: string; createdAt: string; profile: Record<string, unknown>; isBanned: boolean; isSuspended: boolean };
type Workout = { id: string; name: string; completedAt: string; exercises: number; sets: number; volume: number };

export default async function AdminUserSupportView({ params }: { params: Promise<{ id: string }> }) {
  const [admin, { id }] = await Promise.all([requireAdmin(), params]);
  if (!isOwnerAccount(admin)) redirect("/admin/users");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || id === admin.id) notFound();
  const pool = getDatabasePool();
  const [userResult, workoutsResult] = await Promise.all([
    pool.query<Account>(`select id,username,display_name as name,email,created_at as "createdAt",profile_data as profile,is_banned as "isBanned",is_suspended as "isSuspended" from public.arcus_accounts where id=$1::uuid`, [id]),
    pool.query<Workout>(`
      select w.id::text as id, coalesce(nullif(w.payload->>'name',''),'Workout') as name,
        coalesce(w.payload->>'completedAt',w.payload->>'startedAt') as "completedAt",
        jsonb_array_length(coalesce(w.payload->'exercises','[]'::jsonb))::int as exercises,
        (select count(*)::int from jsonb_array_elements(coalesce(w.payload->'exercises','[]'::jsonb)) ex
          cross join lateral jsonb_array_elements(coalesce(ex->'sets','[]'::jsonb)) s where s->>'completed'='true') as sets,
        coalesce((select sum(case when s->>'completed'='true' and coalesce(s->>'setType','working')<>'warmup'
          and ex->>'trackingType' is distinct from 'cardio' and s->>'weight' ~ '^-?[0-9]+(\\.[0-9]+)?$' and s->>'reps' ~ '^[0-9]+(\\.[0-9]+)?$'
          then (s->>'weight')::numeric*(s->>'reps')::numeric else 0 end)
          from jsonb_array_elements(coalesce(w.payload->'exercises','[]'::jsonb)) ex
          cross join lateral jsonb_array_elements(coalesce(ex->'sets','[]'::jsonb)) s),0)::float8 as volume
      from public.arcus_workouts w where w.account_id=$1::uuid and w.payload->>'status'='completed'
      order by coalesce(w.payload->>'completedAt',w.payload->>'startedAt') desc limit 20
    `, [id]),
  ]);
  const user = userResult.rows[0];
  if (!user) notFound();
  await pool.query(`insert into public.arcus_admin_audit(actor_id,actor_email,target_type,target_id,action,details)
    values($1::uuid,$2,'user',$3,'user_viewed','{}'::jsonb)`, [admin.id, admin.email, user.id]);
  return <section>
    <Link href="/admin/users" className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft size={16}/> Return to users</Link>
    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950"><Eye size={20} className="mt-0.5 shrink-0"/><div><h1 className="text-lg font-semibold">Read-only support view</h1><p className="mt-1 text-sm leading-6">You are reviewing this account as the platform owner. No sign-in session has been replaced, and this view cannot change account data or credentials.</p></div></div>
    <article className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-teal-700">Athlete account</p><h2 className="mt-2 text-2xl font-semibold text-slate-900">{user.name || user.username}</h2><p className="mt-1 text-sm text-slate-500">@{user.username} · {user.email}</p></div><div className="flex gap-2">{user.isBanned && <span className="rounded-full bg-rose-50 px-3 py-1 text-xs text-rose-700">Banned</span>}{user.isSuspended && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-800">Suspended</span>}</div></div>
      <p className="mt-5 text-sm text-slate-500">Joined {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(user.createdAt))}</p>
      {user.profile && <dl className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
        {typeof user.profile.bio === "string" && <div><dt className="text-xs text-slate-400">Bio</dt><dd className="mt-1 text-sm text-slate-700">{user.profile.bio}</dd></div>}
        {typeof user.profile.experience === "string" && <div><dt className="text-xs text-slate-400">Training level</dt><dd className="mt-1 text-sm text-slate-700">{user.profile.experience}</dd></div>}
      </dl>}
    </article>
    <article className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white"><header className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">Recent completed workouts</h2><p className="mt-1 text-sm text-slate-500">Synced workout summaries · read only</p></header>{workoutsResult.rows.length ? <div className="divide-y divide-slate-100">{workoutsResult.rows.map(workout => <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4" key={workout.id}><div><strong className="text-sm text-slate-800">{workout.name}</strong><p className="mt-1 text-xs text-slate-500">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(workout.completedAt))} · {workout.exercises} exercises · {workout.sets} sets</p></div><span className="text-sm text-slate-600">{Math.round(workout.volume).toLocaleString()} kg</span></div>)}</div> : <div className="px-5 py-8 text-sm text-slate-500">No completed synced workouts recorded.</div>}</article>
    <p className="mt-4 flex items-center gap-2 text-xs text-slate-400"><ShieldAlert size={14}/> Support views are recorded in the admin audit log.</p>
  </section>;
}
