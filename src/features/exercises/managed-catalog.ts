import { exerciseCatalog, type Exercise } from "./catalog";

/** Server-managed exercise definitions, with the bundled catalog as an offline fallback. */
export async function getManagedExerciseCatalog(): Promise<Exercise[]> {
  try {
    const response = await fetch("/api/admin/exercises", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) return exerciseCatalog;
    const result = await response.json() as { exercises?: Exercise[] };
    return Array.isArray(result.exercises) ? result.exercises : exerciseCatalog;
  } catch { return exerciseCatalog; }
}
