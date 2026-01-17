import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import {
  copyBudgets,
  deleteBudget,
  fetchBudgets,
  saveBudget,
  type Budget,
} from '../api/budgets';
import { ApiError } from '../api/client';
import type { Category } from '../api/types';
import { useUser } from '../auth/AuthContext';
import { MonthPicker } from '../components/MonthPicker';
import { PageHeader } from '../components/PageHeader';
import { ProgressBar } from '../components/ProgressBar';
import { useCategories } from '../hooks/useCategories';
import { currentMonth, formatMonth, shiftMonth } from '../lib/dates';
import { centsToInput, formatMoney, parseMoneyInput } from '../lib/money';

const TONE = { on_track: 'success', warning: 'warning', over: 'danger' } as const;

function BudgetRow({
  budget,
  category,
  currency,
}: {
  budget: Budget;
  category: Category | undefined;
  currency: string;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(centsToInput(budget.amount));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['budgets'] });
  const save = useMutation({
    mutationFn: (amount: number) =>
      saveBudget({ categoryId: budget.categoryId, month: budget.month, amount }),
    onSuccess: () => {
      setEditing(false);
      void invalidate();
    },
  });
  const remove = useMutation({ mutationFn: () => deleteBudget(budget.id), onSuccess: invalidate });

  function submit(event: FormEvent) {
    event.preventDefault();
    const amount = parseMoneyInput(value);
    if (amount && amount > 0) save.mutate(amount);
  }

  return (
    <li className="budget-row">
      <div className="budget-row__head">
        <span className="chip">
          <span className="chip__dot" style={{ background: category?.color }} />
          {category?.name ?? 'Deleted category'}
        </span>
        {editing ? (
          <form className="budget-row__edit" onSubmit={submit}>
            <input
              aria-label="Budget amount"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
            <button className="button button--primary" disabled={save.isPending}>
              Save
            </button>
            <button type="button" className="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <div className="budget-row__amounts">
            <strong>{formatMoney(budget.spent, currency)}</strong>
            <span className="muted"> of {formatMoney(budget.amount, currency)}</span>
          </div>
        )}
      </div>
      <ProgressBar
        percent={budget.percent}
        tone={TONE[budget.status]}
        label={`${category?.name ?? 'Budget'} spending`}
      />
      <div className="budget-row__foot">
        <span className={budget.remaining < 0 ? 'negative' : 'muted'}>
          {budget.remaining < 0
            ? `${formatMoney(-budget.remaining, currency)} over budget`
            : `${formatMoney(budget.remaining, currency)} left`}
        </span>
        {!editing && (
          <span className="budget-row__actions">
            <button className="link-button" onClick={() => setEditing(true)}>
              Edit
            </button>
            <button className="link-button link-button--danger" onClick={() => remove.mutate()}>
              Remove
            </button>
          </span>
        )}
      </div>
    </li>
  );
}

function AddBudget({ month, available }: { month: string; available: Category[] }) {
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: saveBudget,
    onSuccess: () => {
      setCategoryId('');
      setAmount('');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not save budget'),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const cents = parseMoneyInput(amount);
    if (!categoryId) return setError('Choose a category');
    if (!cents || cents <= 0) return setError('Enter a positive amount');
    save.mutate({ categoryId, month, amount: cents });
  }

  if (available.length === 0) return null;

  return (
    <form className="card add-budget" onSubmit={submit}>
      <h2>Add a budget</h2>
      <div className="add-budget__fields">
        <select
          aria-label="Category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Choose a category…</option>
          {available.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          aria-label="Monthly limit"
          inputMode="decimal"
          placeholder="Monthly limit"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button className="button button--primary" disabled={save.isPending}>
          Add
        </button>
      </div>
      {error && <span className="field__error">{error}</span>}
    </form>
  );
}

export function BudgetsPage() {
  const { currency } = useUser();
  const [params, setParams] = useSearchParams();
  const month = params.get('month') ?? currentMonth();
  const categories = useCategories();
  const queryClient = useQueryClient();
  const budgets = useQuery({ queryKey: ['budgets', month], queryFn: () => fetchBudgets(month) });
  const previousMonth = shiftMonth(month, -1);

  const copy = useMutation({
    mutationFn: () => copyBudgets(previousMonth, month),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budgets'] }),
  });

  const categoryById = new Map((categories.data ?? []).map((c) => [c.id, c]));
  const budgeted = new Set(budgets.data?.budgets.map((b) => b.categoryId));
  const available = (categories.data ?? []).filter(
    (c) => c.kind === 'expense' && !budgeted.has(c.id),
  );
  const data = budgets.data;

  return (
    <>
      <PageHeader
        title="Budgets"
        description="Set monthly limits and see how your spending is tracking."
        actions={<MonthPicker month={month} onChange={(m) => setParams({ month: m })} />}
      />

      {budgets.isError && <div className="alert alert--error">Could not load budgets.</div>}

      {data && data.budgets.length > 0 && (
        <div className="stat-row">
          <div className="card stat">
            <span className="stat__label">Budgeted</span>
            <span className="stat__value">{formatMoney(data.totals.budgeted, currency)}</span>
          </div>
          <div className="card stat">
            <span className="stat__label">Spent</span>
            <span className="stat__value">{formatMoney(data.totals.spent, currency)}</span>
          </div>
          <div className="card stat">
            <span className="stat__label">
              {data.totals.remaining < 0 ? 'Over budget' : 'Left to spend'}
            </span>
            <span className={`stat__value ${data.totals.remaining < 0 ? 'negative' : 'positive'}`}>
              {formatMoney(Math.abs(data.totals.remaining), currency)}
            </span>
          </div>
        </div>
      )}

      {data && data.budgets.length === 0 && (
        <div className="card empty-state">
          <h2>No budgets for this month</h2>
          <p className="muted">Pick a category below and set a monthly limit.</p>
          <button
            className="button empty-state__action"
            onClick={() => copy.mutate()}
            disabled={copy.isPending}
          >
            Copy budgets from {formatMonth(previousMonth)}
          </button>
          {copy.data?.copied === 0 && (
            <p className="muted">{formatMonth(previousMonth)} has no budgets to copy.</p>
          )}
        </div>
      )}

      {data && data.budgets.length > 0 && (
        <ul className="card budget-list">
          {data.budgets.map((b) => (
            <BudgetRow
              key={b.id}
              budget={b}
              category={categoryById.get(b.categoryId)}
              currency={currency}
            />
          ))}
        </ul>
      )}

      <AddBudget month={month} available={available} />
    </>
  );
}
