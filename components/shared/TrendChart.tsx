"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartColors } from "@/lib/design-tokens";

export function TrendChart({
  data,
  dataKey,
  xKey,
  height = 200,
}: {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  xKey: string;
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke={chartColors.grid} vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: chartColors.axisText }} />
          <YAxis tick={{ fontSize: 11, fill: chartColors.axisText }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={chartColors.secondary}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
