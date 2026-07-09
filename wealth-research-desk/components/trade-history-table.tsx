"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { TradeRow } from "@/lib/trade-history";

const OUTCOME_LEGEND: Array<{ label: string; tone: "success" | "danger" | "neutral"; note: string }> = [
  { label: "Target 1 hit", tone: "success", note: "Price reached the first (nearest) profit target before the stop-loss." },
  { label: "Target 2 hit", tone: "success", note: "Price ran further and reached the second profit target." },
  { label: "Target 3 hit", tone: "success", note: "Price reached the third and furthest profit target." },
  { label: "Stop-loss hit", tone: "danger", note: "Price hit the stop-loss first - the setup was invalidated at a loss." },
  { label: "Closed", tone: "neutral", note: "Closed by the desk before a target or the stop-loss was reached." }
];

const PERIODS = [
  { value: "all", label: "All time" },
  { value: "thisMonth", label: "This month" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "thisYear", label: "This year" },
  { value: "custom", label: "Custom range" }
];

function formatPnl(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

function pnlClass(value: number | null): string {
  if (value === null || value === 0) return "text-muted";
  return value > 0 ? "text-positive" : "text-negative";
}

export function TradeHistoryTable({ rows }: { rows: TradeRow[] }) {
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const now = new Date();
    const fromMs = /^\d{4}-\d{2}-\d{2}$/.test(from) ? new Date(`${from}T00:00:00`).getTime() : null;
    const toMs = /^\d{4}-\d{2}-\d{2}$/.test(to) ? new Date(`${to}T23:59:59.999`).getTime() : null;

    return rows.filter((row) => {
      if (term && !`${row.instrument} ${row.segment}`.toLowerCase().includes(term)) return false;
      if (period === "all") return true;
      if (row.closedAtMs == null) return false;

      if (period === "custom") {
        if (fromMs != null && row.closedAtMs < fromMs) return false;
        if (toMs != null && row.closedAtMs > toMs) return false;
        return true;
      }

      const d = new Date(row.closedAtMs);
      if (period === "thisMonth") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      if (period === "thisYear") return d.getFullYear() === now.getFullYear();
      const cutoff = new Date(now);
      cutoff.setMonth(cutoff.getMonth() - (period === "3m" ? 3 : 6));
      return row.closedAtMs >= cutoff.getTime();
    });
  }, [rows, query, period, from, to]);

  // Net profit (per lot) across the current filter — "profit made" in the selected range.
  const summary = useMemo(() => {
    let total = 0;
    let counted = 0;
    for (const row of filtered) {
      if (row.pnl == null) continue;
      total += row.pnl;
      counted += 1;
    }
    return { total: Number(total.toFixed(2)), counted };
  }, [filtered]);

  // Day-grouped rows (merged date cell + per-day P&L), recomputed from the filtered set.
  const groupedRows = useMemo(() => {
    const dayPnl = new Map<string, number>();
    for (const row of filtered) {
      if (row.closedLabel === "-" || row.pnl === null) continue;
      dayPnl.set(row.closedLabel, Number(((dayPnl.get(row.closedLabel) ?? 0) + row.pnl).toFixed(2)));
    }
    const groups: Array<{ dateLabel: string; dayPnl: number | null; items: TradeRow[] }> = [];
    for (const row of filtered) {
      const previous = groups[groups.length - 1];
      if (!previous || previous.dateLabel !== row.closedLabel) {
        groups.push({
          dateLabel: row.closedLabel,
          dayPnl: row.closedLabel === "-" ? null : dayPnl.get(row.closedLabel) ?? null,
          items: [row]
        });
        continue;
      }
      previous.items.push(row);
    }
    return groups;
  }, [filtered]);

  // Monthly P&L totals (per lot) from the filtered set, newest month first.
  const monthlyPnl = useMemo(() => {
    const map = new Map<string, { label: string; total: number }>();
    for (const row of filtered) {
      if (row.monthKey == null || row.monthLabel == null || row.pnl == null) continue;
      const prev = map.get(row.monthKey);
      map.set(row.monthKey, {
        label: row.monthLabel,
        total: Number(((prev?.total ?? 0) + row.pnl).toFixed(2))
      });
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([, v]) => v);
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Outcome legend — one item per line. */}
      <div className="overflow-x-auto rounded-xl2 border border-border bg-surface px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">What each outcome means</p>
        <ul className="mt-3 flex flex-col gap-1.5">
          {OUTCOME_LEGEND.map((item) => (
            <li key={item.label} className="flex items-center gap-2.5 whitespace-nowrap text-xs text-muted">
              <span className="inline-flex min-w-[7rem] shrink-0">
                <Badge tone={item.tone}>{item.label}</Badge>
              </span>
              <span>{item.note}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Search + date-period filter. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            aria-label="Search by instrument or segment"
            placeholder="Search instrument..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-full pl-8 sm:w-60"
          />
        </div>
        <Select
          aria-label="Filter by time period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="h-9 w-44"
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>

        {period === "custom" && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-muted">
              From
              <Input
                type="date"
                aria-label="From date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9 w-40"
              />
            </label>
            <label className="flex items-center gap-1 text-xs text-muted">
              To
              <Input
                type="date"
                aria-label="To date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
                className="h-9 w-40"
              />
            </label>
          </div>
        )}
      </div>

      {/* Net profit for the selected range + monthly breakdown (per lot). */}
      {summary.counted > 0 && (
        <div className="rounded-xl2 border border-border bg-surface px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Net P&amp;L in selected range (per lot)
            </p>
            <span className="text-xs text-muted">
              {summary.counted} closed trade{summary.counted === 1 ? "" : "s"}
            </span>
          </div>
          <p className={`mt-1 text-2xl font-semibold tabular-nums ${pnlClass(summary.total)}`}>
            {formatPnl(summary.total)}
          </p>
          {monthlyPnl.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
              {monthlyPnl.map((month) => (
                <div key={month.label} className="rounded-lg border border-border px-3 py-1.5 text-xs">
                  <span className="text-muted">{month.label}</span>{" "}
                  <span className={`font-medium tabular-nums ${pnlClass(month.total)}`}>{formatPnl(month.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scrollable table (vertical + horizontal), sticky header. */}
      {filtered.length === 0 ? (
        <div className="rounded-xl2 border border-border px-4 py-10 text-center text-sm text-muted">
          No trades match your search or selected period.
        </div>
      ) : (
        <div className="max-h-[30rem] overflow-auto rounded-xl2 border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-1 bg-surface text-xs uppercase tracking-wider text-muted shadow-[0_1px_0_rgb(var(--border))]">
              <tr>
                <th className="border-r border-border px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Instrument</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Entry</th>
                <th className="px-4 py-3 text-left">SL</th>
                <th className="px-4 py-3 text-left">Target 1</th>
                <th className="px-4 py-3 text-left">Target 2</th>
                <th className="px-4 py-3 text-left">Target 3</th>
                <th className="border-r border-border px-4 py-3 text-left">Outcome</th>
                <th className="px-4 py-3 text-left">Day P&amp;L (Per Lot)</th>
              </tr>
            </thead>
            <tbody>
              {groupedRows.map((group) =>
                group.items.map((row, index) => {
                  const showMergedCells = index === 0;
                  return (
                    <tr key={row.id} className="border-t border-border">
                      {showMergedCells && (
                        <td rowSpan={group.items.length} className="border-r border-border px-4 py-3 align-middle text-muted">
                          {group.dateLabel}
                        </td>
                      )}
                      <td className="px-4 py-3 font-medium">{row.instrument}</td>
                      <td className="px-4 py-3">
                        <Badge tone={row.tradeType === "BUY" ? "success" : "danger"}>{row.tradeType}</Badge>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted">{row.entry}</td>
                      <td className="px-4 py-3 tabular-nums text-muted">{row.sl}</td>
                      <td className="px-4 py-3 tabular-nums text-muted">{row.t1}</td>
                      <td className="px-4 py-3 tabular-nums text-muted">{row.t2}</td>
                      <td className="px-4 py-3 tabular-nums text-muted">{row.t3 ?? "-"}</td>
                      <td className="border-r border-border px-4 py-3">
                        <Badge tone={row.outcomeTone}>{row.statusLabel}</Badge>
                      </td>
                      {showMergedCells && (
                        <td rowSpan={group.items.length} className={`px-4 py-3 align-middle tabular-nums ${pnlClass(group.dayPnl)}`}>
                          {group.dayPnl === null ? "-" : formatPnl(group.dayPnl)}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
