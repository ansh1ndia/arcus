import type { Metadata } from "next";
import { CreditCard, IndianRupee, TrendingUp, UsersRound } from "lucide-react";
import { getAdminRevenue } from "@/features/admin/repository";
import { requireAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Revenue · ARCUS Admin", description: "Subscription revenue and active ARCUS Pro plans." };
const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default async function AdminRevenuePage() {
  const [, data] = await Promise.all([requireAdmin(), getAdminRevenue()]);
  const cards = [
    { label: "Monthly recurring revenue", value: rupees.format(data.monthlyRecurringRevenue), note: "Annualized from currently active plans", icon: IndianRupee },
    { label: "Annual run rate", value: rupees.format(data.annualRunRate), note: "Current MRR × 12", icon: TrendingUp },
    { label: "Active paid members", value: `${data.monthlySubscribers + data.yearlySubscribers}`, note: `${data.monthlySubscribers} monthly · ${data.yearlySubscribers} yearly`, icon: UsersRound },
    { label: "Free-to-Pro conversion", value: `${data.conversionRate.toFixed(1)}%`, note: `of ${data.totalUsers.toLocaleString()} total accounts`, icon: CreditCard },
  ];
  return <section>
    <p className="admin-eyebrow">Billing overview</p><h1 className="admin-page-title">Revenue</h1>
    <p className="admin-page-description">Estimates use the configured ₹199 monthly and ₹1,500 yearly list prices. They are not payment processor settlement totals.</p>
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, note, icon: Icon }) => <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={label}><div className="flex items-center justify-between text-slate-500"><span className="text-sm">{label}</span><Icon size={18} aria-hidden="true"/></div><p className="mt-5 text-3xl font-semibold tracking-tight text-slate-900">{value}</p><p className="mt-2 text-xs text-slate-500">{note}</p></article>)}</div>
    <article className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><header className="border-b border-slate-100 px-5 py-5 sm:px-6"><h2 className="text-base font-semibold text-slate-900">Recent active subscriptions</h2><p className="mt-1 text-sm text-slate-500">Plan list price shown; actual paid amounts require payment-provider invoice data.</p></header>
      {data.recent.length ? <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Member</th><th className="px-5 py-3">Tier</th><th className="px-5 py-3">List price</th><th className="px-5 py-3">Started</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{data.recent.map(item => <tr key={item.id}><td className="px-5 py-4"><strong className="block text-slate-800">{item.name || item.username}</strong><span className="text-xs text-slate-500">@{item.username}</span></td><td className="px-5 py-4 capitalize text-slate-700">{item.interval}ly</td><td className="px-5 py-4 text-slate-700">{rupees.format(item.interval === "month" ? 199 : 1500)} / {item.interval === "month" ? "month" : "year"}</td><td className="px-5 py-4 text-slate-600">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(item.startedAt))}</td><td className="px-5 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{item.status}</span></td></tr>)}</tbody></table></div> : <p className="px-6 py-10 text-center text-sm text-slate-500">No active paid subscriptions are recorded.</p>}
    </article>
  </section>;
}
