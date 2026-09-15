"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartColors } from "@/lib/design-tokens";
import type { GameRecap } from "@/lib/data/types";

export function WinProbabilityChart({
  timeline,
}: {
  timeline: GameRecap["winProbabilityTimeline"];
}) {
  const data = timeline.map((p) => ({
    label: `Q${p.quarter} ${p.clock}`,
    homeWinProb: Math.round(p.homeWinProb * 100),
  }));

  return (
    <div className="lift h-72 w-full rounded-lg border border-border bg-surface p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="wpFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.5} />
              <stop offset="100%" stopColor={chartColors.primary} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={chartColors.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: chartColors.axisText }}
            interval="preserveStartEnd"
            axisLine={{ stroke: chartColors.grid }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: chartColors.axisText }}
            tickFormatter={(v) => `${v}%`}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine y={50} stroke={chartColors.tertiary} strokeDasharray="3 3" />
          <Tooltip
            formatter={(value) => [`${value}%`, "Home win prob."]}
            contentStyle={{
              fontSize: 12,
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              color: "var(--color-foreground)",
            }}
            labelStyle={{ color: "var(--color-muted)" }}
          />
          <Area
            type="monotone"
            dataKey="homeWinProb"
            stroke={chartColors.primary}
            fill="url(#wpFill)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: chartColors.secondary, stroke: "var(--color-surface)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
