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
import { ACCOUNTS_KEY, useAccounts } from '../hooks/useAccounts';
import { ACCOUNT_TYPE_LABELS, isLiability } from '../lib/accounts';
import { formatMoney } from '../lib/money';

type Editing = { mode: 'create' } | { mode: 'edit'; account: Account } | null;

export function AccountsPage() {
  const { currency } = useUser();
  const queryClient = useQueryClient();
  const accounts = useAccounts();
  const [editing, setEditing] = useState<Editing>(null);

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
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const list = accounts.data ?? [];
  const assets = list.filter((a) => !isLiability(a.type));
  const liabilities = list.filter((a) => isLiability(a.type));
  const netWorth = list.reduce((sum, a) => sum + a.balance, 0);

  function confirmDelete(account: Account) {
    const ok = window.confirm(
      `Delete "${account.name}"? All of its transactions will be deleted too.`,
    );
    if (ok) remove.mutate(account.id);
  }

  function closeModal() {
    save.reset();
    setEditing(null);
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

      {accounts.isPending && <p className="muted">Loading accounts…</p>}
      {accounts.isError && <div className="alert alert--error">Could not load accounts.</div>}

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
            { title: 'Assets', items: assets },
            { title: 'Liabilities', items: liabilities },
          ]
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <section key={group.title} className="section">
                <h2 className="section__title">{group.title}</h2>
                <div className="account-grid">
                  {group.items.map((account) => (
                    <article key={account.id} className="card account-card">
                      <div className="account-card__top">
                        <div>
                          <h3>{account.name}</h3>
                          <span className="badge">{ACCOUNT_TYPE_LABELS[account.type]}</span>
                        </div>
                        <span
                          className={`account-card__balance ${account.balance < 0 ? 'negative' : ''}`}
                        >
                          {formatMoney(account.balance, currency)}
                        </span>
                      </div>
                      <div className="account-card__actions">
                        <button
                          className="button"
                          onClick={() => setEditing({ mode: 'edit', account })}
                        >
                          Edit
                        </button>
                        <button
                          className="button button--danger"
                          onClick={() => confirmDelete(account)}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
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
