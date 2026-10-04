"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartColors } from "@/lib/design-tokens";
import { useRouter } from "next/navigation";
import { signed } from "@/lib/util/format";

export interface WeeklyTrendPoint {
  gameId: string;
  week: number;
  /** "at JAX · L 6-35" */
  game: string;
  offense: number;
  defense: number;
}

const OFFENSE = "Offense gained";
const DEFENSE = "Defense allowed";

// Straight lines, not smoothed: a smoothed curve between games draws
// values no game produced.
// One point per game, raw EPA/play — the same numbers as each recap's
// cards, so the chart and the recap can't disagree.
export function WeeklyTrendChart({ points }: { points: WeeklyTrendPoint[] }) {
  const router = useRouter();
  const data = points.map((p) => ({ ...p, [OFFENSE]: p.offense, [DEFENSE]: p.defense }));
  return (
    <div className="h-64 w-full cursor-pointer">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          onClick={(state) => {
            const i = Number(state?.activeTooltipIndex);
            if (Number.isInteger(i) && points[i]) router.push(`/recap/${points[i].gameId}`);
          }}
        >
          <CartesianGrid stroke={chartColors.grid} vertical={false} />
          <XAxis
            dataKey="week"
            tickFormatter={(w) => `W${w}`}
            tick={{ fontSize: 11, fill: chartColors.axisText }}
            axisLine={{ stroke: chartColors.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: chartColors.axisText }}
            tickFormatter={(v: number) => v.toFixed(1)}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine
            y={0}
            stroke={chartColors.tertiary}
            strokeDasharray="3 3"
            label={{ value: "Average", position: "insideTopRight", fontSize: 10, fill: chartColors.axisText }}
          />
          <Tooltip
            formatter={(value) => signed(Number(value), 2)}
            labelFormatter={(_, payload) => {
              const p = payload?.[0]?.payload as WeeklyTrendPoint | undefined;
              return p ? `Week ${p.week} ${p.game}` : "";
            }}
            contentStyle={{
              fontSize: 12,
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              color: "var(--color-foreground)",
            }}
            labelStyle={{ color: "var(--color-muted)" }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} itemSorter={(item) => (item.value === OFFENSE ? 0 : 1)} />
          <Line type="linear" dataKey={OFFENSE} stroke={chartColors.ink} strokeWidth={2.5} dot={{ r: 3 }} />
          <Line
            type="linear"
            dataKey={DEFENSE}
            stroke={chartColors.secondary}
            strokeWidth={2.5}
            strokeDasharray="6 3"
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
