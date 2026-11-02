"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

const COLORS = [
  "#0f172a",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#64748b",
];

interface Props {
  data: { name: string; value: number }[];
  currency?: string;
}

export function CategoryPieChart({ data, currency = "INR" }: Props) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="h-64 w-full animate-pulse bg-neutral-100 rounded-lg dark:bg-neutral-800" />;
  }

  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className="h-64 w-full flex items-center justify-center text-xs text-neutral-400">
        No category expenses recorded for this month.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            formatter={(value: any) => [formatCurrency(Number(value) || 0, currency), "Spent"]}
            contentStyle={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              fontSize: "12px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
          />
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

