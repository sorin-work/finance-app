import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { CategorySpending } from '../../api/reports';
import { formatMoney } from '../../lib/money';

interface SpendingDonutProps {
  data: CategorySpending[];
  currency: string;
  total: number;
}

export function SpendingDonut({ data, currency, total }: SpendingDonutProps) {
  return (
    <div className="donut">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="name"
            innerRadius={62}
            outerRadius={90}
            paddingAngle={1}
            stroke="var(--surface)"
            isAnimationActive={false}
          >
            {data.map((row) => (
              <Cell key={row.categoryId ?? 'none'} fill={row.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatMoney(Number(value), currency)}
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="donut__center" aria-hidden="true">
        <span className="muted">Spent</span>
        <strong>{formatMoney(total, currency)}</strong>
      </div>
    </div>
  );
}
