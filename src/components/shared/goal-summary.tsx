"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { exerciseCatalog } from "@/features/exercises/catalog";
import { goalProgress, formatWeight } from "@/features/training/logic";
import type { WorkoutRecord } from "@/features/workouts/model";
import { useProfile } from "./user-profile-provider";

export function GoalSummary({ workouts, limit = 3 }: { workouts: WorkoutRecord[]; limit?: number }) {
  const { user, preferences } = useProfile();
  const goals = user?.profile.targetGoals ?? [];

  return <section className="feature-panel">
    <div className="panel-heading">
      <h2>Active targets</h2>
      <Link className="text-action" href="/profile/edit#goals">Edit goals →</Link>
    </div>
    {goals.length ? goals.slice(0, limit).map((goal) => {
      const progress = goalProgress(goal, user?.profile ?? null, workouts);
      const label = goal.type === "bodyweight" ? "Bodyweight" : exerciseCatalog.find((exercise) => exercise.id === goal.exerciseId)?.name ?? "Lift target";
      return <article className="goal-summary-row" key={goal.id}>
        <strong>{label}</strong>
        <small>{formatWeight(progress.value, preferences.units)} / {formatWeight(goal.targetValue, preferences.units)}{goal.targetReps ? ` × ${goal.targetReps} reps` : ""} · by {goal.targetDate}</small>
        <progress value={progress.percent} max="100" aria-label="Goal progress"/>
      </article>;
    }) : <Link className="goal-empty-state" href="/profile/edit#goals">
      <Plus size={17} aria-hidden="true"/>
      <span>Tap to set a bodyweight or lift goal</span>
    </Link>}
  </section>;
}
