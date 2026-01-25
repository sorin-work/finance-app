import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CashflowMonth } from '../../api/reports';
import { formatMonthShort } from '../../lib/dates';
import { formatCompactMoney, formatMoney } from '../../lib/money';

interface CashflowChartProps {
  data: CashflowMonth[];
  currency: string;
  height?: number;
}

export function CashflowChart({ data, currency, height = 260 }: CashflowChartProps) {
  const rows = data.map((m) => ({ ...m, label: formatMonthShort(m.month) }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
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
          cursor={{ fill: 'var(--surface-muted)' }}
          formatter={(value) => formatMoney(Number(value), currency)}
          contentStyle={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
          }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenses" name="Expenses" fill="#f97316" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
