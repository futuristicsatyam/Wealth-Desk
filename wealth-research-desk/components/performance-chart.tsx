"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type PerformancePoint = { label: string; closed: number; targetsHit: number };

/** Renders REAL aggregated trade outcomes passed from a server component. */
export function PerformanceChart({ data }: { data: PerformancePoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl2 border border-border bg-card text-sm text-muted">
        No closed-trade history to chart yet.
      </div>
    );
  }

  return (
    <div className="h-72 w-full rounded-xl2 border border-border bg-card p-3">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="targets" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="rgb(52 199 145)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="rgb(52 199 145)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" stroke="rgb(148 161 176)" fontSize={12} />
          <YAxis stroke="rgb(148 161 176)" fontSize={12} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "rgb(18 29 42)",
              border: "1px solid rgb(38 52 68)",
              borderRadius: 12,
              color: "rgb(237 241 245)"
            }}
          />
          <Area
            type="monotone"
            dataKey="targetsHit"
            name="Targets hit"
            stroke="rgb(52 199 145)"
            fill="url(#targets)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="closed"
            name="Trades closed"
            stroke="rgb(201 174 122)"
            fill="transparent"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
