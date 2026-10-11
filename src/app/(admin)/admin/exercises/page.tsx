import type { Metadata } from "next";
import { ExercisesTable } from "@/components/admin/exercises-table";
import { getAdminExercises } from "@/features/admin/repository";
import { parseAdminQuery, type AdminSearchParams } from "@/features/admin/query";
import { isOwnerAccount, requireAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Exercise database", description: "Manage the shared ARCUS exercise catalog and review user-defined movements." };

export default async function AdminExercisesPage({ searchParams }: { searchParams: Promise<AdminSearchParams> }) {
  const [account, params] = await Promise.all([requireAdmin(), searchParams]);
  const options = parseAdminQuery(params);
  const { data, muscleOptions } = await getAdminExercises(options);
  return <section>
    <p className="admin-eyebrow">Movement directory</p>
    <h1 className="admin-page-title">Exercise database</h1>
    <p className="admin-page-description">Manage the shared catalog and review account-owned definitions. Changes are audited and shared across ARCUS.</p>
    <ExercisesTable data={data} muscleOptions={muscleOptions} muscle={options.muscle} category={options.category} canManage={isOwnerAccount(account)}/>
  </section>;
}
