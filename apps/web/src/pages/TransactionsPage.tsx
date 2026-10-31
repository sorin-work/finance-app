import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ApiError } from '../api/client';
import {
  createTransaction,
  deleteTransaction,
  exportUrl,
  fetchPayeeSuggestions,
  fetchTransactions,
  updateTransaction,
  type TransactionFilters,
  type TransactionInput,
} from '../api/transactions';
import type { Transaction, TransactionType } from '../api/types';
import { useUser } from '../auth/AuthContext';
import { PlusIcon, RepeatIcon } from '../components/icons';
import { ImportDialog } from '../components/ImportDialog';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { SkeletonRows } from '../components/Skeleton';
import { TransactionForm } from '../components/TransactionForm';
import { invalidateFinancialData } from '../hooks/invalidate';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { formatDate } from '../lib/dates';
import { formatMoney } from '../lib/money';

const PAGE_SIZE = 25;
const FILTER_KEYS = ['q', 'from', 'to', 'accountId', 'categoryId', 'type'] as const;

type Editing = { mode: 'create' } | { mode: 'edit'; transaction: Transaction } | null;

export function TransactionsPage() {
  const { currency } = useUser();
  const [params, setParams] = useSearchParams();
  const accounts = useAccounts();
  const categories = useCategories();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Editing>(null);
  const [importing, setImporting] = useState(false);

  const filters: TransactionFilters = {
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
    accountId: params.get('accountId') ?? undefined,
    categoryId: params.get('categoryId') ?? undefined,
    type: (params.get('type') as TransactionType | null) ?? undefined,
    q: params.get('q') ?? undefined,
    page: Number(params.get('page') ?? 1),
    pageSize: PAGE_SIZE,
  };

  const transactions = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => fetchTransactions(filters),
    placeholderData: keepPreviousData,
  });

  const save = useMutation({
    mutationFn: (input: TransactionInput) =>
      editing?.mode === 'edit'
        ? updateTransaction(editing.transaction.id, input)
        : createTransaction(input),
    onSuccess: () => {
      void invalidateFinancialData(queryClient);
      setEditing(null);
    },
  });

  const remove = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      void invalidateFinancialData(queryClient);
      setEditing(null);
    },
  });

  function closeModal() {
    save.reset();
    setEditing(null);
  }

  function confirmDelete(transaction: Transaction) {
    if (window.confirm('Delete this transaction? This cannot be undone.')) {
      remove.mutate(transaction.id);
    }
  }

  const accountName = useMemo(
    () => new Map((accounts.data ?? []).map((a) => [a.id, a.name])),
    [accounts.data],
  );
  const categoryById = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c])),
    [categories.data],
  );

  function setFilter(key: (typeof FILTER_KEYS)[number], value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next);
  }

  const { page: _page, pageSize: _pageSize, ...exportFilters } = filters;

  // Typing updates the URL (and the query) once the user pauses.
  const [search, setSearch] = useState(params.get('q') ?? '');
  const urlSearch = params.get('q') ?? '';
  useEffect(() => {
    if (search.trim() === urlSearch) return;
    const timer = setTimeout(() => setFilter('q', search.trim()), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, urlSearch]);

  function goToPage(page: number) {
    const next = new URLSearchParams(params);
    if (page > 1) next.set('page', String(page));
    else next.delete('page');
    setParams(next);
    window.scrollTo({ top: 0 });
  }

  const data = transactions.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const hasFilters = FILTER_KEYS.some((key) => params.has(key));

  /**
   * Money in is positive, money out negative. A transfer has no direction on
   * its own, but when the list is filtered to one account it is either coming
   * into that account or leaving it.
   */
  function signedCents(t: Transaction): number | null {
    if (t.type === 'income') return t.amount;
    if (t.type === 'expense') return -t.amount;
    if (!filters.accountId) return null;
    return t.transferAccountId === filters.accountId ? t.amount : -t.amount;
  }

  function amountCell(t: Transaction) {
    const signed = signedCents(t);
    return {
      text:
        signed === null
          ? formatMoney(t.amount, currency)
          : formatMoney(signed, currency, { signDisplay: 'always' }),
      className: signed === null ? '' : signed > 0 ? 'positive' : 'negative',
    };
  }

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Everything coming in and going out."
        actions={
          <>
            <a className="button" href={exportUrl(exportFilters)} download>
              Export
            </a>
            <button
              className="button"
              onClick={() => setImporting(true)}
              disabled={!accounts.data?.length}
            >
              Import
            </button>
            <button
              className="button button--primary"
              onClick={() => setEditing({ mode: 'create' })}
              disabled={!accounts.data?.length}
              title={accounts.data?.length ? undefined : 'Add an account first'}
            >
              <PlusIcon /> Add transaction
            </button>
          </>
        }
      />

      <div className="card filters">
        <label className="filters__search">
          Search
          <input
            type="search"
            placeholder="Payee or notes"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          From
          <input
            type="date"
            value={filters.from ?? ''}
            onChange={(e) => setFilter('from', e.target.value)}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={filters.to ?? ''}
            onChange={(e) => setFilter('to', e.target.value)}
          />
        </label>
        <label>
          Account
          <select
            value={filters.accountId ?? ''}
            onChange={(e) => setFilter('accountId', e.target.value)}
          >
            <option value="">All accounts</option>
            {accounts.data?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select
            value={filters.categoryId ?? ''}
            onChange={(e) => setFilter('categoryId', e.target.value)}
          >
            <option value="">All categories</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Type
          <select value={filters.type ?? ''} onChange={(e) => setFilter('type', e.target.value)}>
            <option value="">Any type</option>
            <option value="expense">Expenses</option>
            <option value="income">Income</option>
            <option value="transfer">Transfers</option>
          </select>
        </label>
        {hasFilters && (
          <button
            className="button filters__clear"
            onClick={() => {
              setSearch('');
              setParams({});
            }}
          >
            Clear
          </button>
        )}
      </div>

      {transactions.isError && (
        <div className="alert alert--error">Could not load transactions.</div>
      )}

      <div className="card table-card">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Account</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.isPending && <SkeletonRows columns={5} />}
            {data?.items.map((t) => {
              const category = t.categoryId ? categoryById.get(t.categoryId) : undefined;
              return (
                <tr
                  key={t.id}
                  className="table__row--clickable"
                  onClick={() => setEditing({ mode: 'edit', transaction: t })}
                >
                  <td className="nowrap">{formatDate(t.date)}</td>
                  <td>
                    <div className="cell-title">
                      {t.payee || (t.type === 'transfer' ? 'Transfer' : '—')}
                      {t.recurringId && (
                        <span className="recurring-mark" title="Added by a recurring rule">
                          <RepeatIcon width={14} height={14} />
                          <span className="visually-hidden">Recurring</span>
                        </span>
                      )}
                    </div>
                    {t.notes && <div className="cell-sub">{t.notes}</div>}
                  </td>
                  <td>
                    {category ? (
                      <span className="chip">
                        <span className="chip__dot" style={{ background: category.color }} />
                        {category.name}
                      </span>
                    ) : (
                      <span className="muted">{t.type === 'transfer' ? '—' : 'Uncategorized'}</span>
                    )}
                  </td>
                  <td className="nowrap">
                    {accountName.get(t.accountId)}
                    {t.transferAccountId && ` → ${accountName.get(t.transferAccountId)}`}
                  </td>
                  <td className={`num nowrap ${amountCell(t).className}`}>{amountCell(t).text}</td>
                </tr>
              );
            })}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="table__empty">
                  {hasFilters ? 'No transactions match these filters.' : 'No transactions yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.total > PAGE_SIZE && (
        <nav className="pagination" aria-label="Pagination">
          <button
            className="button"
            disabled={data.page <= 1}
            onClick={() => goToPage(data.page - 1)}
          >
            Previous
          </button>
          <span className="muted">
            Page {data.page} of {totalPages} · {data.total} transactions
          </span>
          <button
            className="button"
            disabled={data.page >= totalPages}
            onClick={() => goToPage(data.page + 1)}
          >
            Next
          </button>
        </nav>
      )}

      {importing && accounts.data && (
        <ImportDialog accounts={accounts.data} onClose={() => setImporting(false)} />
      )}

      {editing && accounts.data && categories.data && (
        <Modal
          title={editing.mode === 'edit' ? 'Edit transaction' : 'New transaction'}
          onClose={closeModal}
        >
          <TransactionForm
            transaction={editing.mode === 'edit' ? editing.transaction : undefined}
            accounts={accounts.data}
            categories={categories.data}
            submitting={save.isPending}
            error={save.error instanceof ApiError ? save.error.message : null}
            onSubmit={(input) => save.mutate(input)}
            onCancel={closeModal}
            suggestPayees={fetchPayeeSuggestions}
            onDelete={
              editing.mode === 'edit' ? () => confirmDelete(editing.transaction) : undefined
            }
          />
        </Modal>
      )}
    </>
  );
}
