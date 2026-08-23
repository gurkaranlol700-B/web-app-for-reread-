"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DayPoint, RevenueByKind, SchoolPoint } from "@/lib/analytics";
import { rupees } from "@/lib/pricing";

/**
 * The charts behind /admin.
 *
 * Colour choices: ReRead's brand gold carries the primary series everywhere,
 * and the three supporting hues are mid-lightness on purpose so they stay
 * legible against both the cream light-mode card and the forest-green dark
 * one — the palette can't rely on either background.
 *
 * Axis and grid colours come from `currentColor` at low opacity rather than a
 * fixed grey, so they follow the theme without a second set of tokens.
 */
const STREAM_COLORS: Record<string, string> = {
  commission: "#E0A81C",
  plus: "#2AA79B",
  ad: "#E2683F",
  featured: "#7C6BD6",
};

const STREAM_LABELS: Record<string, string> = {
  commission: "Commission",
  plus: "ReRead Plus",
  ad: "Advertising",
  featured: "Featured listings",
};

const axisStyle = { fontSize: 11, fill: "currentColor", opacity: 0.6 };

function shortDate(value: string) {
  const [, month, day] = value.split("-");
  return `${day}/${month}`;
}

function TooltipBox({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border-border bg-card rounded-xl border px-3 py-2 text-xs shadow-lg">
      {label ? <p className="text-muted-foreground mb-1">{label}</p> : null}
      {payload.map((entry) => (
        <p key={entry.dataKey ?? entry.name} className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="font-semibold">{rupees(entry.value ?? 0)}</span>
        </p>
      ))}
    </div>
  );
}

export function RevenueOverTime({ data }: { data: DayPoint[] }) {
  return (
    <div className="text-muted-foreground h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="gmvFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2AA79B" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#2AA79B" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E0A81C" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#E0A81C" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="currentColor" strokeOpacity={0.12} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
            minTickGap={16}
          />
          <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={48} />
          <Tooltip content={<TooltipBox />} cursor={{ stroke: "currentColor", strokeOpacity: 0.2 }} />

          {/* GMV is the volume flowing through the marketplace; revenue is
              ReRead's cut of it. Plotting both makes the take rate visible
              rather than something you have to be told. */}
          <Area
            type="monotone"
            dataKey="gmv"
            name="Books sold (value)"
            stroke="#2AA79B"
            strokeWidth={2}
            fill="url(#gmvFill)"
          />
          <Area
            type="monotone"
            dataKey="revenue"
            name="ReRead revenue"
            stroke="#E0A81C"
            strokeWidth={2.5}
            fill="url(#revFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueByStream({ data }: { data: RevenueByKind[] }) {
  const rows = data.map((row) => ({
    ...row,
    label: STREAM_LABELS[row.kind] ?? row.kind,
  }));

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground flex h-56 items-center justify-center text-sm">
        No revenue yet — complete a sale and it appears here.
      </p>
    );
  }

  return (
    <div className="text-muted-foreground h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.12} horizontal={false} />
          <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
            width={110}
          />
          <Tooltip content={<TooltipBox />} cursor={{ fill: "currentColor", fillOpacity: 0.06 }} />
          <Bar dataKey="amount" name="Revenue" radius={[0, 6, 6, 0]} barSize={22}>
            {rows.map((row) => (
              <Cell key={row.kind} fill={STREAM_COLORS[row.kind] ?? "#E0A81C"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SchoolsChart({ data }: { data: SchoolPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground flex h-56 items-center justify-center text-sm">
        No schools yet.
      </p>
    );
  }

  return (
    <div className="text-muted-foreground h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.12} horizontal={false} />
          <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="school"
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
            width={140}
          />
          <Tooltip
            cursor={{ fill: "currentColor", fillOpacity: 0.06 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as SchoolPoint;
              return (
                <div className="border-border bg-card rounded-xl border px-3 py-2 text-xs shadow-lg">
                  <p className="font-semibold">{label}</p>
                  <p className="text-muted-foreground mt-0.5">{`${row.books} listed · ${row.sold} sold`}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="books" name="Books listed" fill="#E0A81C" radius={[0, 6, 6, 0]} barSize={18} />
          <Bar dataKey="sold" name="Sold" fill="#2AA79B" radius={[0, 6, 6, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
