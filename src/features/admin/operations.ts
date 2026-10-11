"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";

export async function revalidateArcusPages() {
  await requireAdmin();
  revalidatePath("/", "layout");
  return "All ARCUS routes were marked for revalidation.";
}
