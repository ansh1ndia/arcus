"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, LoaderCircle, Plus, Trash2 } from "lucide-react";
import type { AdminExerciseRow } from "@/features/admin/model";
import { AdminActionDialog } from "./admin-action-dialog";

const categories = ["Barbell", "Dumbbell", "Machine", "Cable", "Bodyweight", "Other"] as const;
const muscles = ["Chest", "Lats", "Upper back", "Traps", "Shoulders", "Biceps", "Triceps", "Forearms", "Abs", "Quads", "Hamstrings", "Glutes", "Calves", "Adductors", "Cardio"];
function validCategory(value?: string) { return categories.includes(value as typeof categories[number]) ? value! : undefined; }

export function ExerciseFormModal({ exercise, mode = "edit" }: { exercise?: AdminExerciseRow; mode?: "create" | "edit" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [secondary, setSecondary] = useState<string[]>(exercise?.secondaryMuscles ?? []);
  const [category, setCategory] = useState<string>(validCategory(exercise?.category) ?? validCategory(exercise?.equipment) ?? "Other");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const primaryMuscle = String(form.get("primaryMuscle") ?? "");
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/exercises", {
        method: mode === "create" ? "POST" : "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, ...(mode === "edit" ? { id: exercise?.id } : {}), name, category, primaryMuscle, secondaryMuscles: secondary, instructions: String(form.get("instructions") ?? "") }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not save the exercise.");
      setOpen(false); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save the exercise."); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!exercise) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/exercises", { method: "DELETE", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id: exercise.id }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not remove the exercise.");
      setOpen(false); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not remove the exercise."); }
    finally { setBusy(false); }
  }

  return <>
    <button type="button" aria-label={mode === "create" ? "Add exercise" : `Edit ${exercise?.name ?? "exercise"}`} onClick={() => { setSecondary(exercise?.secondaryMuscles ?? []); setCategory(validCategory(exercise?.category) ?? validCategory(exercise?.equipment) ?? "Other"); setError(""); setOpen(true); }} className={mode === "create" ? "admin-button admin-button-primary inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-medium" : "admin-button inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"}>
      {mode === "create" ? <><Plus size={16}/> Add exercise</> : <><Dumbbell size={14}/> Edit</>}
    </button>
    {open && <AdminActionDialog title={mode === "create" ? "Add catalog exercise" : `Edit ${exercise?.name}`} description="Changes are shared across the ARCUS exercise library. Past workouts keep their recorded exercise names and sets." busy={busy} onClose={() => setOpen(false)} footer={<><button type="button" onClick={() => setOpen(false)} disabled={busy} className="admin-button h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-600">Cancel</button>{mode === "edit" && <button type="button" onClick={() => void remove()} disabled={busy} className="admin-button mr-auto inline-flex h-10 items-center gap-2 rounded-lg border border-rose-200 px-4 text-sm text-rose-700"><Trash2 size={15}/> Remove</button>}<button form="arcus-admin-exercise-form" type="submit" disabled={busy} className="admin-button admin-button-primary inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium">{busy && <LoaderCircle size={15} className="animate-spin"/>}{mode === "create" ? "Add exercise" : "Save changes"}</button></>}>
      <form id="arcus-admin-exercise-form" onSubmit={event => void submit(event)} className="grid gap-4">
        <Field label="Name"><input name="name" defaultValue={exercise?.name} minLength={2} maxLength={100} required placeholder="Bulgarian split squat"/></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Category"><select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(item => <option key={item}>{item}</option>)}</select></Field><Field label="Primary muscle"><select name="primaryMuscle" defaultValue={exercise?.primaryMuscles?.[0] ?? (muscles.includes(exercise?.muscle ?? "") ? exercise?.muscle : "Chest")}>{Array.from(new Set([...muscles, ...(exercise?.primaryMuscles ?? []), ...(exercise?.muscle ? [exercise.muscle] : [])])).map(item => <option key={item}>{item}</option>)}</select></Field></div>
        <fieldset><legend className="mb-2 text-sm font-medium text-slate-700">Secondary muscles</legend><div className="flex flex-wrap gap-2">{muscles.filter(item => item !== "Cardio").map(item => { const active = secondary.includes(item); return <button type="button" key={item} aria-pressed={active} onClick={() => setSecondary(values => active ? values.filter(value => value !== item) : [...values, item])} className={`admin-button rounded-full border px-3 py-1.5 text-xs ${active ? "border-teal-200 bg-teal-50 text-teal-800" : "border-slate-200 bg-white text-slate-500"}`}>{item}</button>; })}</div></fieldset>
        <Field label="Instructions / form tips"><textarea name="instructions" rows={4} maxLength={3000} defaultValue={exercise?.instructions ?? ""} placeholder="Add concise, useful technique cues…"/></Field>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      </form>
    </AdminActionDialog>}
  </>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-sm font-medium text-slate-700">{label}{children}</label>; }
