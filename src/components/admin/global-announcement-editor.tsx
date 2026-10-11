"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle, Megaphone, Send } from "lucide-react";
import type { AdminAnnouncement } from "@/features/admin/model";

export function GlobalAnnouncementEditor({ initialState }: { initialState: AdminAnnouncement }) {
  const [message, setMessage] = useState(initialState.message);
  const [url, setUrl] = useState(initialState.url);
  const [enabled, setEnabled] = useState(initialState.enabled);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setStatus("");
    try {
      const response = await fetch("/api/admin/announcement", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, url, enabled }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not update announcement.");
      setStatus(enabled ? "Announcement published." : "Announcement disabled.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not update announcement."); }
    finally { setBusy(false); }
  }
  return <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8" aria-labelledby="global-announcement-title">
    <div className="flex items-start gap-3"><Megaphone size={22} className="mt-0.5 shrink-0 text-emerald-900" aria-hidden="true"/><div><h2 id="global-announcement-title" className="text-lg font-semibold tracking-tight">Global announcement</h2><p className="mt-1 text-sm leading-6 text-stone-500">Publish a dismissible, optionally linked notice at the top of the app for everyone.</p></div></div>
    <form onSubmit={event => void save(event)} className="mt-5 grid gap-4">
      <label className="grid gap-1.5 text-sm font-medium text-slate-700" htmlFor="global-announcement">Message<textarea id="global-announcement" value={message} onChange={event => setMessage(event.target.value)} maxLength={240} rows={3} placeholder="Scheduled maintenance at 12 AM" className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-emerald-700"/></label>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700" htmlFor="global-announcement-url">Link URL (optional)<input id="global-announcement-url" type="url" inputMode="url" value={url} onChange={event => setUrl(event.target.value)} maxLength={2048} placeholder="https://example.com/status" className="h-10 rounded-lg border border-stone-300 px-3 text-sm text-slate-900 outline-none focus:border-emerald-700"/></label>
      <label className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} className="h-5 w-5 accent-emerald-800"/>Banner active <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>{enabled ? "ON" : "OFF"}</span></label>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Mobile preview</p><div className="flex min-h-11 items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white"><span className="h-2 w-2 shrink-0 rounded-full bg-blue-400"/><span className="min-w-0 flex-1 truncate">{enabled && message ? message : "Your announcement will appear here"}</span>{enabled && url && <span aria-hidden="true" className="shrink-0 text-blue-300">Open ↗</span>}</div><p className="mb-0 mt-2 text-[10px] text-slate-400">{message.length}/240 characters · Only active banners appear in the app.</p></div>
      <div className="flex items-center justify-between gap-3"><span className="text-xs text-stone-400">Changes apply after saving.</span><button type="submit" disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">{busy ? <LoaderCircle size={15} className="animate-spin"/> : <Send size={15}/>}Save announcement</button></div><p role="status" aria-live="polite" className="m-0 min-h-5 text-xs text-emerald-800">{status}</p>
    </form>
  </section>;
}
