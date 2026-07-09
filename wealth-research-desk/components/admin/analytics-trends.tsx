"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { formatInr } from "@/lib/format";

export type TrendPoint = { label: string; signups: number; revenuePaise: number };

// Chart colours mirror the app's design tokens (see globals.css / performance-chart).
const ACCENT = "rgb(201 174 122)";
const POSITIVE = "rgb(52 199 145)";
const AXIS = "rgb(148 161 176)";
const GRID = "rgb(148 161 176 / 0.15)";

const TOOLTIP_STYLE = {
  background: "rgb(18 29 42)",
  border: "1px solid rgb(38 52 68)",
  borderRadius: 12,
  color: "rgb(237 241 245)",
  fontSize: 12
} as const;

/** Two REAL time-bucketed series computed server-side: new signups and captured revenue. */
export function AnalyticsTrends({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl2 border border-border bg-card text-sm text-muted">
        No activity in this period yet.
      </div>
    );
  }

  const revenueData = data.map((d) => ({ label: d.label, revenue: d.revenuePaise / 100 }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl2 border border-border bg-card p-4">
        <p className="mb-3 text-sm font-semibold">New signups</p>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="signupsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={ACCENT} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="label" stroke={AXIS} fontSize={11} tickLine={false} />
              <YAxis stroke={AXIS} fontSize={11} allowDecimals={false} tickLine={false} width={32} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: AXIS, strokeOpacity: 0.2 }} />
              <Area
                type="monotone"
                dataKey="signups"
                name="Signups"
                stroke={ACCENT}
                fill="url(#signupsFill)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl2 border border-border bg-card p-4">
        <p className="mb-3 text-sm font-semibold">Captured revenue</p>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="label" stroke={AXIS} fontSize={11} tickLine={false} />
              <YAxis
                stroke={AXIS}
                fontSize={11}
                width={64}
                tickLine={false}
                tickFormatter={(v: number) => formatInr(v * 100)}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: "rgb(148 161 176 / 0.08)" }}
                formatter={(v: number) => [formatInr(v * 100), "Revenue"]}
              />
              <Bar dataKey="revenue" name="Revenue" fill={POSITIVE} radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
