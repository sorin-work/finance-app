import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { createAccount, deleteAccount, updateAccount, type AccountInput } from '../api/accounts';
import { ApiError } from '../api/client';
import type { Account } from '../api/types';
import { useUser } from '../auth/AuthContext';
import { AccountForm } from '../components/AccountForm';
import { PlusIcon } from '../components/icons';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { Skeleton } from '../components/Skeleton';
import { invalidateFinancialData } from '../hooks/invalidate';
import { ACCOUNTS_KEY, useAccounts } from '../hooks/useAccounts';
import { ACCOUNT_TYPE_LABELS, isLiability } from '../lib/accounts';
import { formatMoney } from '../lib/money';

type Editing = { mode: 'create' } | { mode: 'edit'; account: Account } | null;

export function AccountsPage() {
  const { currency } = useUser();
  const queryClient = useQueryClient();
  const accounts = useAccounts();
  const [editing, setEditing] = useState<Editing>(null);
  const [showArchived, setShowArchived] = useState(false);

  const save = useMutation({
    mutationFn: (input: AccountInput) =>
      editing?.mode === 'edit' ? updateAccount(editing.account.id, input) : createAccount(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      setEditing(null);
    },
  });

  const remove = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => invalidateFinancialData(queryClient),
  });

  const archive = useMutation({
    mutationFn: (account: Account) => updateAccount(account.id, { archived: !account.archived }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY }),
  });

  const list = accounts.data ?? [];
  const open = list.filter((a) => !a.archived);
  const archived = list.filter((a) => a.archived);
  // Archived accounts still hold (or owe) money, so they count towards net worth.
  const netWorth = list.reduce((sum, a) => sum + a.balance, 0);

  function confirmDelete(account: Account) {
    if (window.confirm(`Delete "${account.name}"?`)) remove.mutate(account.id);
  }

  function closeModal() {
    save.reset();
    setEditing(null);
  }

  function renderCard(account: Account) {
    return (
      <article
        key={account.id}
        className={`card account-card${account.archived ? ' account-card--archived' : ''}`}
      >
        <div className="account-card__top">
          <div>
            <h3>{account.name}</h3>
            <span className="badge">{ACCOUNT_TYPE_LABELS[account.type]}</span>
            {account.archived && <span className="badge">Archived</span>}
          </div>
          <span className={`account-card__balance ${account.balance < 0 ? 'negative' : ''}`}>
            {formatMoney(account.balance, currency)}
          </span>
        </div>
        <div className="account-card__actions">
          {!account.archived && (
            <button className="button" onClick={() => setEditing({ mode: 'edit', account })}>
              Edit
            </button>
          )}
          <button className="button" onClick={() => archive.mutate(account)}>
            {account.archived ? 'Restore' : 'Archive'}
          </button>
          <button className="button button--danger" onClick={() => confirmDelete(account)}>
            Delete
          </button>
        </div>
      </article>
    );
  }

  return (
    <>
      <PageHeader
        title="Accounts"
        description="Bank accounts, cards and cash you want to keep track of."
        actions={
          <button className="button button--primary" onClick={() => setEditing({ mode: 'create' })}>
            <PlusIcon /> Add account
          </button>
        }
      />

      {accounts.isPending && (
        <div className="account-grid">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} height={120} className="skeleton--card" />
          ))}
        </div>
      )}
      {accounts.isError && <div className="alert alert--error">Could not load accounts.</div>}
      {remove.error && (
        <div className="alert alert--error" role="alert">
          {remove.error instanceof ApiError ? remove.error.message : 'Could not delete the account'}
        </div>
      )}

      {accounts.isSuccess && list.length === 0 && (
        <div className="card empty-state">
          <h2>No accounts yet</h2>
          <p className="muted">Add your first account to start recording transactions.</p>
        </div>
      )}

      {list.length > 0 && (
        <>
          <div className="card stat">
            <span className="stat__label">Net worth</span>
            <span className={`stat__value ${netWorth < 0 ? 'negative' : ''}`}>
              {formatMoney(netWorth, currency)}
            </span>
          </div>

          {[
            { title: 'Assets', items: open.filter((a) => !isLiability(a.type)) },
            { title: 'Liabilities', items: open.filter((a) => isLiability(a.type)) },
          ]
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <section key={group.title} className="section">
                <h2 className="section__title">{group.title}</h2>
                <div className="account-grid">{group.items.map(renderCard)}</div>
              </section>
            ))}

          {archived.length > 0 && (
            <section className="section">
              <button className="link-button" onClick={() => setShowArchived((v) => !v)}>
                {showArchived ? 'Hide' : 'Show'} archived accounts ({archived.length})
              </button>
              {showArchived && (
                <div className="account-grid account-grid--spaced">{archived.map(renderCard)}</div>
              )}
            </section>
          )}
        </>
      )}

      {editing && (
        <Modal
          title={editing.mode === 'edit' ? 'Edit account' : 'New account'}
          onClose={closeModal}
        >
          <AccountForm
            account={editing.mode === 'edit' ? editing.account : undefined}
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
