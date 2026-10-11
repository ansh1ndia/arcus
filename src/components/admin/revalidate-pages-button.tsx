"use client";

import { useState } from "react";
import { LoaderCircle, Zap } from "lucide-react";
import { revalidateArcusPages } from "@/features/admin/operations";

export function RevalidatePagesButton() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  async function run() {
    if (busy) return;
    setBusy(true); setStatus("");
    try { setStatus(await revalidateArcusPages()); }
    catch { setStatus("Pages could not be revalidated. Check your admin session and try again."); }
    finally { setBusy(false); }
  }
  return <div className="grid gap-2">
    <button type="button" onClick={() => void run()} disabled={busy} className="admin-button inline-flex min-h-10 w-fit items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">{busy ? <LoaderCircle size={15} className="animate-spin"/> : <Zap size={15}/>}Revalidate all static pages</button>
    <p role="status" aria-live="polite" className="m-0 min-h-4 text-xs text-emerald-800">{status}</p>
  </div>;
}
