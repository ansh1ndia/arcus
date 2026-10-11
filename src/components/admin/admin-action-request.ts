export async function submitAdminAction(body: Record<string, string>) {
  const response = await fetch("/api/admin/actions", {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({})) as { message?: string; error?: string };
  if (!response.ok) throw new Error(result.error ?? "The change could not be saved.");
  return result.message ?? "Change saved.";
}
