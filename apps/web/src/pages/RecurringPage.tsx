import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError } from '../api/client';
import {
  createRecurring,
  deleteRecurring,
  fetchRecurring,
  runRecurring,
  updateRecurring,
  type Recurring,
  type RecurringInput,
} from '../api/recurring';
import { useUser } from '../auth/AuthContext';
import { PlusIcon } from '../components/icons';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { RecurringForm } from '../components/RecurringForm';
import { invalidateFinancialData } from '../hooks/invalidate';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { formatDate } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { FREQUENCY_LABELS } from '../lib/recurring';

const RECURRING_KEY = ['recurring'] as const;

type Editing = { mode: 'create' } | { mode: 'edit'; recurring: Recurring } | null;

export function RecurringPage() {
  const { currency } = useUser();
  const queryClient = useQueryClient();
  const accounts = useAccounts();
  const categories = useCategories();
  const recurring = useQuery({ queryKey: RECURRING_KEY, queryFn: fetchRecurring });
  const [editing, setEditing] = useState<Editing>(null);

  const refresh = () => invalidateFinancialData(queryClient);

  const save = useMutation({
    mutationFn: (input: RecurringInput) =>
      editing?.mode === 'edit'
        ? updateRecurring(editing.recurring.id, input)
        : createRecurring(input),
    onSuccess: () => {
      setEditing(null);
      void refresh();
    },
  });
  const toggle = useMutation({
    mutationFn: (r: Recurring) => updateRecurring(r.id, { active: !r.active }),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: deleteRecurring, onSuccess: refresh });
  const run = useMutation({ mutationFn: runRecurring, onSuccess: refresh });

  const accountName = new Map((accounts.data ?? []).map((a) => [a.id, a.name]));
  const categoryById = new Map((categories.data ?? []).map((c) => [c.id, c]));

  function closeModal() {
    save.reset();
    setEditing(null);
  }

  return (
    <>
      <PageHeader
        title="Recurring"
        description="Bills, income and transfers that repeat on a schedule are added automatically."
        actions={
          <>
            <button className="button" onClick={() => run.mutate()} disabled={run.isPending}>
              Add due now
            </button>
            <button
              className="button button--primary"
              onClick={() => setEditing({ mode: 'create' })}
              disabled={!accounts.data?.length}
            >
              <PlusIcon /> New rule
            </button>
          </>
        }
      />

      {run.data && (
        <div className="alert alert--info" role="status">
          {run.data.created === 0
            ? 'Everything is up to date.'
            : `Added ${run.data.created} transaction${run.data.created === 1 ? '' : 's'}.`}
        </div>
      )}

      {recurring.data && recurring.data.length === 0 && (
        <div className="card empty-state">
          <h2>No recurring transactions</h2>
          <p className="muted">
            Add your rent, salary or subscriptions once and forget about them.
          </p>
        </div>
      )}

      {recurring.data && recurring.data.length > 0 && (
        <div className="card table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Schedule</th>
                <th>Account</th>
                <th>Next</th>
                <th className="num">Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {recurring.data.map((r) => {
                const category = r.categoryId ? categoryById.get(r.categoryId) : undefined;
                return (
                  <tr key={r.id} className={r.active ? '' : 'table__row--muted'}>
                    <td>
                      <div className="cell-title">{r.payee || 'Untitled'}</div>
                      <div className="cell-sub">
                        {category?.name ?? (r.type === 'transfer' ? 'Transfer' : 'Uncategorized')}
                      </div>
                    </td>
                    <td className="nowrap">{FREQUENCY_LABELS[r.frequency]}</td>
                    <td className="nowrap">
                      {accountName.get(r.accountId)}
                      {r.transferAccountId && ` → ${accountName.get(r.transferAccountId)}`}
                    </td>
                    <td className="nowrap">
                      {r.active ? formatDate(r.nextDate) : <span className="badge">Paused</span>}
                    </td>
                    <td
                      className={`num nowrap ${r.type === 'income' ? 'positive' : r.type === 'expense' ? 'negative' : ''}`}
                    >
                      {formatMoney(r.amount, currency)}
                    </td>
                    <td className="table__actions">
                      <button
                        className="link-button"
                        onClick={() => setEditing({ mode: 'edit', recurring: r })}
                      >
                        Edit
                      </button>
                      <button className="link-button" onClick={() => toggle.mutate(r)}>
                        {r.active ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        className="link-button link-button--danger"
                        onClick={() => {
                          if (window.confirm('Delete this rule? Past transactions are kept.')) {
                            remove.mutate(r.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && accounts.data && categories.data && (
        <Modal
          title={
            editing.mode === 'edit' ? 'Edit recurring transaction' : 'New recurring transaction'
          }
          onClose={closeModal}
        >
          <RecurringForm
            recurring={editing.mode === 'edit' ? editing.recurring : undefined}
            accounts={accounts.data}
            categories={categories.data}
            submitting={save.isPending}
            error={save.error instanceof ApiError ? save.error.message : null}
            onSubmit={(input) => save.mutate(input)}
            onCancel={closeModal}
          />
        </Modal>
      )}
    </>
  );
}
