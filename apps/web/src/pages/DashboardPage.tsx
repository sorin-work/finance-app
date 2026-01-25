import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { fetchBudgets } from '../api/budgets';
import { fetchCashflow, fetchSummary } from '../api/reports';
import { fetchTransactions } from '../api/transactions';
import { useUser } from '../auth/AuthContext';
import { CashflowChart } from '../components/charts/CashflowChart';
import { SpendingDonut } from '../components/charts/SpendingDonut';
import { PageHeader } from '../components/PageHeader';
import { ProgressBar } from '../components/ProgressBar';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { currentMonth, formatDate, formatMonth } from '../lib/dates';
import { formatMoney } from '../lib/money';

const TONE = { on_track: 'success', warning: 'warning', over: 'danger' } as const;

function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardPage() {
  const user = useUser();
  const month = currentMonth();
  const accounts = useAccounts();
  const categories = useCategories();
  const summary = useQuery({ queryKey: ['reports', 'summary', month], queryFn: () => fetchSummary(month) });
  const budgets = useQuery({ queryKey: ['budgets', month], queryFn: () => fetchBudgets(month) });
  const cashflow = useQuery({
    queryKey: ['reports', 'cashflow', month, 6],
    queryFn: () => fetchCashflow(month, 6),
  });
  const recent = useQuery({
    queryKey: ['transactions', { page: 1, pageSize: 6 }],
    queryFn: () => fetchTransactions({ page: 1, pageSize: 6 }),
  });

  const money = (cents: number) => formatMoney(cents, user.currency);
  const netWorth = accounts.data?.reduce((sum, a) => sum + a.balance, 0);
  const categoryById = new Map((categories.data ?? []).map((c) => [c.id, c]));
  const watchedBudgets = [...(budgets.data?.budgets ?? [])]
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 4);

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user.name.split(' ')[0]}`}
        description={`Here is how ${formatMonth(month)} is going.`}
      />

      <div className="stat-row">
        <div className="card stat">
          <span className="stat__label">Net worth</span>
          <span className={`stat__value ${netWorth !== undefined && netWorth < 0 ? 'negative' : ''}`}>
            {netWorth === undefined ? '—' : money(netWorth)}
          </span>
        </div>
        <div className="card stat">
          <span className="stat__label">Income this month</span>
          <span className="stat__value positive">
            {summary.data ? money(summary.data.income) : '—'}
          </span>
        </div>
        <div className="card stat">
          <span className="stat__label">Spent this month</span>
          <span className="stat__value">{summary.data ? money(summary.data.expenses) : '—'}</span>
        </div>
        <div className="card stat">
          <span className="stat__label">Savings rate</span>
          <span className="stat__value">
            {summary.data?.savingsRate == null ? '—' : `${summary.data.savingsRate}%`}
          </span>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="card">
          <div className="card__header">
            <h2>Where the money went</h2>
            <Link to="/transactions">All transactions</Link>
          </div>
          {summary.data && summary.data.byCategory.length === 0 && (
            <p className="muted">No spending recorded this month yet.</p>
          )}
          {summary.data && summary.data.byCategory.length > 0 && (
            <SpendingDonut
              data={summary.data.byCategory}
              currency={user.currency}
              total={summary.data.expenses}
            />
          )}
          <ul className="breakdown">
            {summary.data?.byCategory.slice(0, 6).map((row) => (
              <li key={row.categoryId ?? 'none'} className="breakdown__row">
                <span className="chip">
                  <span className="chip__dot" style={{ background: row.color }} />
                  {row.name}
                </span>
                <span className="breakdown__bar">
                  <span style={{ width: `${row.share}%`, background: row.color }} />
                </span>
                <span className="breakdown__amount">{money(row.amount)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <div className="card__header">
            <h2>Budgets</h2>
            <Link to="/budgets">Manage</Link>
          </div>
          {budgets.data && watchedBudgets.length === 0 && (
            <p className="muted">
              No budgets for this month. <Link to="/budgets">Set one up</Link>.
            </p>
          )}
          <ul className="mini-budgets">
            {watchedBudgets.map((b) => {
              const category = categoryById.get(b.categoryId);
              return (
                <li key={b.id}>
                  <div className="mini-budgets__row">
                    <span>{category?.name}</span>
                    <span className="muted">
                      {money(b.spent)} / {money(b.amount)}
                    </span>
                  </div>
                  <ProgressBar
                    percent={b.percent}
                    tone={TONE[b.status]}
                    label={`${category?.name ?? 'Budget'} spending`}
                  />
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card dashboard-grid__wide">
          <div className="card__header">
            <h2>Cash flow</h2>
            <span className="muted">Last 6 months</span>
          </div>
          {cashflow.data && <CashflowChart data={cashflow.data} currency={user.currency} />}
        </section>

        <section className="card dashboard-grid__wide">
          <div className="card__header">
            <h2>Recent transactions</h2>
            <Link to="/transactions">View all</Link>
          </div>
          {recent.data && recent.data.items.length === 0 && (
            <p className="muted">Nothing here yet. Add your first transaction to get started.</p>
          )}
          <ul className="recent">
            {recent.data?.items.map((t) => {
              const category = t.categoryId ? categoryById.get(t.categoryId) : undefined;
              const signed = t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0;
              return (
                <li key={t.id} className="recent__row">
                  <span className="recent__dot" style={{ background: category?.color ?? '#94a3b8' }} />
                  <span className="recent__main">
                    <strong>{t.payee || (t.type === 'transfer' ? 'Transfer' : 'Untitled')}</strong>
                    <span className="muted">
                      {formatDate(t.date)}
                      {category && ` · ${category.name}`}
                    </span>
                  </span>
                  <span
                    className={`recent__amount ${signed > 0 ? 'positive' : signed < 0 ? 'negative' : ''}`}
                  >
                    {t.type === 'transfer'
                      ? money(t.amount)
                      : formatMoney(signed, user.currency, { signDisplay: 'always' })}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
