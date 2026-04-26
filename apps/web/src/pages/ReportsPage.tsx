import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchCashflow, fetchNetWorth, fetchSummary } from '../api/reports';
import { useUser } from '../auth/AuthContext';
import { CashflowChart } from '../components/charts/CashflowChart';
import { NetWorthChart } from '../components/charts/NetWorthChart';
import { MonthPicker } from '../components/MonthPicker';
import { PageHeader } from '../components/PageHeader';
import { currentMonth } from '../lib/dates';
import { formatMoney } from '../lib/money';

const PERIODS = [6, 12, 24] as const;

export function ReportsPage() {
  const { currency } = useUser();
  const thisMonth = currentMonth();
  const [months, setMonths] = useState<(typeof PERIODS)[number]>(12);
  const [month, setMonth] = useState(thisMonth);

  const netWorth = useQuery({
    queryKey: ['reports', 'net-worth', thisMonth, months],
    queryFn: () => fetchNetWorth(thisMonth, months),
  });
  const cashflow = useQuery({
    queryKey: ['reports', 'cashflow', thisMonth, months],
    queryFn: () => fetchCashflow(thisMonth, months),
  });
  const summary = useQuery({
    queryKey: ['reports', 'summary', month],
    queryFn: () => fetchSummary(month),
  });

  const money = (cents: number) => formatMoney(cents, currency);
  const totals = cashflow.data?.reduce(
    (acc, m) => ({ income: acc.income + m.income, expenses: acc.expenses + m.expenses }),
    { income: 0, expenses: 0 },
  );
  const latest = netWorth.data?.at(-1);
  const first = netWorth.data?.[0];

  return (
    <>
      <PageHeader
        title="Reports"
        description="How your money has moved over time."
        actions={
          <div className="segmented segmented--inline" role="radiogroup" aria-label="Period">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={months === p}
                className={`segmented__option${months === p ? ' segmented__option--active' : ''}`}
                onClick={() => setMonths(p)}
              >
                {p} months
              </button>
            ))}
          </div>
        }
      />

      <div className="stat-row">
        <div className="card stat">
          <span className="stat__label">Net worth now</span>
          <span className="stat__value">{latest ? money(latest.netWorth) : '—'}</span>
        </div>
        <div className="card stat">
          <span className="stat__label">Change over {months} months</span>
          <span
            className={`stat__value ${latest && first && latest.netWorth - first.netWorth < 0 ? 'negative' : 'positive'}`}
          >
            {latest && first
              ? formatMoney(latest.netWorth - first.netWorth, currency, { signDisplay: 'always' })
              : '—'}
          </span>
        </div>
        <div className="card stat">
          <span className="stat__label">Income</span>
          <span className="stat__value">{totals ? money(totals.income) : '—'}</span>
        </div>
        <div className="card stat">
          <span className="stat__label">Spending</span>
          <span className="stat__value">{totals ? money(totals.expenses) : '—'}</span>
        </div>
      </div>

      <section className="card section-card">
        <div className="card__header">
          <h2>Net worth</h2>
        </div>
        {netWorth.data && <NetWorthChart data={netWorth.data} currency={currency} />}
      </section>

      <section className="card section-card">
        <div className="card__header">
          <h2>Income vs spending</h2>
        </div>
        {cashflow.data && <CashflowChart data={cashflow.data} currency={currency} height={280} />}
      </section>

      <section className="card section-card">
        <div className="card__header">
          <h2>Spending by category</h2>
          <MonthPicker month={month} onChange={setMonth} />
        </div>
        {summary.data && summary.data.byCategory.length === 0 && (
          <p className="muted">No spending in this month.</p>
        )}
        {summary.data && summary.data.byCategory.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Category</th>
                <th className="num">Share</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {summary.data.byCategory.map((row) => (
                <tr key={row.categoryId ?? 'none'}>
                  <td>
                    <span className="chip">
                      <span className="chip__dot" style={{ background: row.color }} />
                      {row.name}
                    </span>
                  </td>
                  <td className="num">{row.share}%</td>
                  <td className="num">{money(row.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td />
                <td className="num">{money(summary.data.expenses)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </section>
    </>
  );
}
