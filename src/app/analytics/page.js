"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const PIE_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#db2777"];

const PERIOD_OPTIONS = [
  { key: 7, label: "7 days" },
  { key: 30, label: "30 days" },
  { key: 90, label: "90 days" },
];

function StatCard({ label, value, tint, icon }) {
  return (
    <div className="hm-card p-4">
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ${tint}`}>{icon}</span>
      <p className="mt-3 text-2xl font-extrabold text-[var(--color-text)]">{value ?? "…"}</p>
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
    </div>
  );
}

function ChartCard({ title, note, children }) {
  return (
    <div className="hm-card p-5">
      <p className="text-sm font-bold text-[var(--color-text)]">{title}</p>
      {note && <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{note}</p>}
      <div className="mt-3 h-64">{children}</div>
    </div>
  );
}

function AnalyticsContent() {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [error, setError] = useState("");

  function load() {
    api
      .get(`/analytics/?days=${days}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }

  useEffect(load, [days]);

  const rs = data?.subscriptions;
  const rev = data?.revenue;
  const conv = data?.conversion;
  const ren = data?.renewals;
  const lt = data?.ltv_arpu;

  const outcomeData = data
    ? [
        { name: "Approved", value: data.payment_outcomes.approved },
        { name: "Pending", value: data.payment_outcomes.pending },
        { name: "Rejected", value: data.payment_outcomes.rejected },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-[var(--color-text)]">📈 Analytics</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Revenue, growth, and engagement across the platform.</p>
        </div>
        <div className="flex rounded-lg border border-[var(--color-border)] p-0.5">
          {PERIOD_OPTIONS.map((o) => (
            <button
              key={o.key}
              onClick={() => setDays(o.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                days === o.key ? "bg-brand-blue text-white" : "text-[var(--color-text-muted)]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-3 text-xs font-medium text-brand-red">{error}</p>}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <StatCard label="Active Subscriptions" value={rs?.active} icon="✅" tint="bg-green-50" />
        <StatCard label="Expired Subscriptions" value={rs?.expired} icon="⌛" tint="bg-red-50" />
        <StatCard label="MRR (Rs.)" value={rev && `Rs. ${rev.mrr.toLocaleString()}`} icon="💵" tint="bg-blue-50" />
        <StatCard label="ARR (Rs.)" value={rev && `Rs. ${rev.arr.toLocaleString()}`} icon="📅" tint="bg-purple-50" />
        <StatCard
          label="Free-to-Paid Conversion"
          value={conv && `${conv.free_to_paid_conversion_percent}%`}
          icon="🔁"
          tint="bg-amber-50"
        />
        <StatCard label="Renewal Rate" value={ren && `${ren.renewal_rate_percent}%`} icon="♻️" tint="bg-green-50" />
        <StatCard label="Churn Rate" value={ren && `${ren.churn_rate_percent}%`} icon="📉" tint="bg-red-50" />
        <StatCard label="LTV (Rs.)" value={lt && `Rs. ${lt.ltv.toLocaleString()}`} icon="💎" tint="bg-pink-50" />
        <StatCard label="ARPU (Rs.)" value={lt && `Rs. ${lt.arpu.toLocaleString()}`} icon="👤" tint="bg-orange-50" />
        <StatCard label="Paying Users" value={conv?.paying_users} icon="🧾" tint="bg-blue-50" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="POPULAR PLANS (by purchase count)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.popular_plans || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="plan_name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, n) => (n === "revenue" ? [`Rs. ${v}`, "Revenue"] : [v, "Purchases"])} />
              <Bar dataKey="purchase_count" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {(data?.popular_plans || []).length === 0 && (
            <p className="mt-[-9rem] text-center text-sm text-[var(--color-text-muted)]">No approved plan purchases yet.</p>
          )}
        </ChartCard>

        <ChartCard
          title="PAYMENT REVIEW OUTCOMES"
          note={data?.notes?.payment_outcomes}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={outcomeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {outcomeData.map((entry, i) => (
                  <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          {outcomeData.length === 0 && (
            <p className="mt-[-9rem] text-center text-sm text-[var(--color-text-muted)]">No purchases yet.</p>
          )}
        </ChartCard>

        <ChartCard title="COUPON USAGE (by redemptions)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.coupon_usage || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="code" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, n) => (n === "total_discount" ? [`Rs. ${v}`, "Total discount"] : [v, "Redemptions"])} />
              <Bar dataKey="redemption_count" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {(data?.coupon_usage || []).length === 0 && (
            <p className="mt-[-9rem] text-center text-sm text-[var(--color-text-muted)]">No coupon redemptions yet.</p>
          )}
        </ChartCard>

        <ChartCard
          title="GEOGRAPHIC DISTRIBUTION (by province)"
          note={data?.notes?.geographic_distribution}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.geographic_distribution || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis dataKey="province" type="category" tick={{ fontSize: 11 }} width={90} />
              <Tooltip />
              <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {(data?.geographic_distribution || []).length === 0 && (
            <p className="mt-[-9rem] text-center text-sm text-[var(--color-text-muted)]">No student location data yet.</p>
          )}
        </ChartCard>
      </div>

      {data?.notes && (
        <div className="mt-6 hm-card p-4">
          <p className="text-xs font-bold text-[var(--color-text)]">Definitions & caveats</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-[11px] text-[var(--color-text-muted)]">
            <li>· MRR/ARR: {data.notes.mrr_arr}</li>
            <li>· Conversion: {data.notes.conversion}</li>
            <li>· Renewals: {data.notes.renewals}</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <RequireStaff feature="billing">
      <Shell>
        <AnalyticsContent />
      </Shell>
    </RequireStaff>
  );
}
