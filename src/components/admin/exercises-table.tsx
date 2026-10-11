"use client";

import { Dumbbell } from "lucide-react";
import type { AdminExerciseRow, AdminTablePage } from "@/features/admin/model";
import { DataTable, type DataTableColumn } from "./data-table";
import { ExerciseManagementActions } from "./exercise-management-actions";
import { ExerciseFormModal } from "./ExerciseFormModal";

function displayLabel(value: string) { return value.replace(/[_-]+/g, " ").replace(/\b\w/g, letter => letter.toUpperCase()); }
function sourceLabel(row: AdminExerciseRow) {
  if (row.source === "custom") return "Synced custom";
  if (row.source === "admin") return "Owner managed";
  return row.managed ? "Managed built-in" : "Built-in catalog";
}

const columns: DataTableColumn<AdminExerciseRow>[] = [
  { id: "name", header: "Exercise", cell: row => <div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400"><Dumbbell aria-hidden="true" size={17}/></span><span className="font-medium text-slate-800">{row.name}</span></div> },
  { id: "muscle", header: "Primary muscle", cell: row => <span className="admin-badge inline-flex whitespace-nowrap rounded-md border border-teal-100 bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-700">{displayLabel(row.muscle) || "Not specified"}</span> },
  { id: "equipment", header: "Category", cell: row => <span className="text-xs text-slate-500">{row.category || displayLabel(row.equipment) || "Other"}</span> },
  { id: "source", header: "Source", cell: row => <div><span className={`admin-badge inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-medium ${row.source === "custom" ? "border-blue-100 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>{sourceLabel(row)}</span>{row.source === "custom" && row.ownerUsername && <p className="mt-1.5 text-[11px] text-slate-400">@{row.ownerUsername}</p>}</div> },
  { id: "actions", header: <span className="sr-only">Actions</span>, className: "w-28 text-right", cell: row => row.source === "custom" ? <ExerciseManagementActions exercise={row}/> : <ExerciseFormModal exercise={row}/> },
];

type Props = { data: AdminTablePage<AdminExerciseRow>; muscle?: string; muscleOptions?: string[]; category?: string; canManage?: boolean };
export function ExercisesTable({ data, muscle = "", muscleOptions = [], category = "", canManage = false }: Props) {
  const options = Array.from(new Set([...muscleOptions, ...(muscle ? [muscle] : [])])).sort((a, b) => a.localeCompare(b));
  const categories = ["Barbell", "Dumbbell", "Machine", "Cable", "Bodyweight", "Other", "Olympic", "Cardio"];
  const visibleColumns = canManage ? columns : columns.filter(column => column.id !== "actions");
  return <>{canManage && <div className="mb-4 flex justify-end"><ExerciseFormModal mode="create"/></div>}<DataTable data={data} columns={visibleColumns} getRowId={row => row.id} basePath="/admin/exercises" caption="Exercise library" itemLabel="exercises" searchPlaceholder="Search name, category, or muscle…" emptyTitle="No exercises found" emptyDescription={data.query || muscle || category ? "Try another search or filter, or clear your filters." : "The shipped catalog and synced user exercises are listed here."} filters={[{ name: "muscle", label: "Muscle group", value: muscle, options: [{ value: "", label: "All muscle groups" }, ...options.map(value => ({ value, label: displayLabel(value) }))] }, { name: "category", label: "Category", value: category, options: [{ value: "", label: "All categories" }, ...categories.map(value => ({ value, label: value }))] }]} /></>;
}
