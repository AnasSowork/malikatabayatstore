"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MaterialIcon } from "@/components/MaterialIcon";

type ChartPoint = { label: string; value: number };

type Props = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: string;
  accent?: "gold" | "dark" | "green";
  data: ChartPoint[];
  chartType?: "area" | "bar" | "line";
  color?: string;
  formatTooltip?: (value: number) => string;
};

const DEFAULT_COLOR = "#000000";

function MiniChart({
  data,
  chartType,
  color,
  formatTooltip,
}: {
  data: ChartPoint[];
  chartType: "area" | "bar" | "line";
  color: string;
  formatTooltip?: (value: number) => string;
}) {
  const gradientId = `kpi-${chartType}-${color.replace("#", "")}`;

  const tooltipFormatter = (value: unknown) => {
    const n = typeof value === "number" ? value : Number(value);
    const safe = Number.isFinite(n) ? n : 0;
    return formatTooltip ? formatTooltip(safe) : String(safe);
  };

  if (chartType === "bar") {
    return (
      <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <XAxis dataKey="label" hide />
        <YAxis hide domain={[0, "auto"]} />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          contentStyle={{ borderRadius: "8px", border: "1px solid rgba(0,0,0,0.12)", fontSize: "11px" }}
          formatter={tooltipFormatter}
          labelFormatter={(label) => String(label)}
        />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={14} opacity={0.85} />
      </BarChart>
    );
  }

  if (chartType === "line") {
    return (
      <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <XAxis dataKey="label" hide />
        <YAxis hide domain={[0, "auto"]} />
        <Tooltip
          contentStyle={{ borderRadius: "8px", border: "1px solid rgba(0,0,0,0.12)", fontSize: "11px" }}
          formatter={tooltipFormatter}
          labelFormatter={(label) => String(label)}
        />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 3, fill: color }} />
      </LineChart>
    );
  }

  return (
    <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <XAxis dataKey="label" hide />
      <YAxis hide domain={[0, "auto"]} />
      <Tooltip
        contentStyle={{ borderRadius: "8px", border: "1px solid rgba(0,0,0,0.12)", fontSize: "11px" }}
        formatter={tooltipFormatter}
        labelFormatter={(label) => String(label)}
      />
      <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} activeDot={{ r: 3, fill: color }} />
    </AreaChart>
  );
}

export function AdminKpiChartCard({
  label,
  value,
  hint,
  icon,
  accent = "gold",
  data,
  chartType = "area",
  color = DEFAULT_COLOR,
  formatTooltip,
}: Props) {
  return (
    <div className="admin-kpi-chart-card">
      <div className="admin-kpi-chart-head">
        <div className={`admin-kpi-icon admin-kpi-icon-${accent}`}>
          <MaterialIcon name={icon} className="!text-[20px]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="admin-kpi-label">{label}</p>
          <p className="admin-kpi-value admin-kpi-chart-value">{value}</p>
        </div>
      </div>
      <div className="admin-kpi-chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <MiniChart data={data} chartType={chartType} color={color} formatTooltip={formatTooltip} />
        </ResponsiveContainer>
      </div>
      {hint ? <div className="admin-kpi-hint">{hint}</div> : null}
    </div>
  );
}
