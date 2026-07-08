"use client";

import type { ReactNode } from "react";
import { MaterialIcon } from "@/components/MaterialIcon";

type Props = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: string;
  accent?: "gold" | "dark" | "green";
};

export function AdminKpiCard({ label, value, hint, icon, accent = "gold" }: Props) {
  return (
    <div className="admin-kpi-card">
      <div className={`admin-kpi-icon admin-kpi-icon-${accent}`}>
        <MaterialIcon name={icon} className="!text-[22px]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="admin-kpi-label">{label}</p>
        <p className="admin-kpi-value">{value}</p>
        {hint ? <div className="admin-kpi-hint">{hint}</div> : null}
      </div>
    </div>
  );
}

export function AdminDeltaBadge({ value, suffix }: { value: number; suffix?: string }) {
  const positive = value >= 0;
  return (
    <span className={`admin-delta ${positive ? "admin-delta-up" : "admin-delta-down"}`}>
      <MaterialIcon name={positive ? "trending_up" : "trending_down"} className="!text-sm" />
      {`${value >= 0 ? "+" : ""}${value.toFixed(1)}%`}
      {suffix ? <span className="admin-delta-muted">{suffix}</span> : null}
    </span>
  );
}
