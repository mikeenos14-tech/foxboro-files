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
    <div className="h-64 w-full rounded-lg border border-border bg-surface p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="wpFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.35} />
              <stop offset="100%" stopColor={chartColors.primary} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={chartColors.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: chartColors.axisText }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: chartColors.axisText }}
            tickFormatter={(v) => `${v}%`}
          />
          <ReferenceLine y={50} stroke={chartColors.tertiary} strokeDasharray="3 3" />
          <Tooltip
            formatter={(value) => [`${value}%`, "Home win prob."]}
            contentStyle={{ fontSize: 12 }}
          />
          <Area
            type="monotone"
            dataKey="homeWinProb"
            stroke={chartColors.primary}
            fill="url(#wpFill)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
