export type AdminSearchParams = Record<string, string | string[] | undefined>;
export const ADMIN_PAGE_SIZE = 20;
const userFilters = ["all", "pro", "warned", "suspended", "banned", "admins"] as const;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export function parseAdminQuery(params: AdminSearchParams) {
  const rawPage = first(params.page);
  const page = /^\d+$/.test(rawPage) ? Math.min(10_000, Math.max(1, Number(rawPage))) : 1;
  const rawStatus = first(params.status);
  return {
    page,
    query: first(params.q).trim().slice(0, 100),
    // Dropdown values must match the full, untrimmed synced muscle label.
    muscle: first(params.muscle).slice(0, 100),
    category: first(params.category).slice(0, 50),
    status: userFilters.includes(rawStatus as typeof userFilters[number]) ? rawStatus as typeof userFilters[number] : "all",
    pageSize: ADMIN_PAGE_SIZE,
  };
}
