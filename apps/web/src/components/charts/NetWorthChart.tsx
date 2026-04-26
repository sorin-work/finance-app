import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { NetWorthPoint } from '../../api/reports';
import { formatMonthShort } from '../../lib/dates';
import { formatCompactMoney, formatMoney } from '../../lib/money';

interface NetWorthChartProps {
  data: NetWorthPoint[];
  currency: string;
}

export function NetWorthChart({ data, currency }: NetWorthChartProps) {
  const rows = data.map((p) => ({ ...p, label: formatMonthShort(p.month) }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={12}
          width={64}
          tickFormatter={(v: number) => formatCompactMoney(v, currency)}
        />
        <Tooltip
          formatter={(value) => formatMoney(Number(value), currency)}
          contentStyle={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
          }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13 }} />
        <Area
          type="monotone"
          dataKey="netWorth"
          name="Net worth"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#netWorthFill)"
        />
        <Area
          type="monotone"
          dataKey="assets"
          name="Assets"
          stroke="#22c55e"
          strokeWidth={1.5}
          fill="none"
        />
        <Area
          type="monotone"
          dataKey="liabilities"
          name="Liabilities"
          stroke="#f97316"
          strokeWidth={1.5}
          fill="none"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
