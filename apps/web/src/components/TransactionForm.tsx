import { useState, type FormEvent } from 'react';
import type { TransactionInput } from '../api/transactions';
import type { Account, Category, Transaction, TransactionType } from '../api/types';
import { today } from '../lib/dates';
import { centsToInput, parseMoneyInput } from '../lib/money';
import { Field } from './Field';

interface TransactionFormProps {
  transaction?: Transaction;
  accounts: Account[];
  categories: Category[];
  submitting: boolean;
  error?: string | null;
  onSubmit: (input: TransactionInput) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const TYPES: { value: TransactionType; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
];

type Errors = Partial<Record<'amount' | 'date' | 'accountId' | 'transferAccountId', string>>;

export function TransactionForm({
  transaction,
  accounts,
  categories,
  submitting,
  error,
  onSubmit,
  onCancel,
  onDelete,
}: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>(transaction?.type ?? 'expense');
  const [amount, setAmount] = useState(transaction ? centsToInput(transaction.amount) : '');
  const [date, setDate] = useState(transaction?.date ?? today());
  const [accountId, setAccountId] = useState(transaction?.accountId ?? accounts[0]?.id ?? '');
  const [transferAccountId, setTransferAccountId] = useState(
    transaction?.transferAccountId ?? '',
  );
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? '');
  const [payee, setPayee] = useState(transaction?.payee ?? '');
  const [notes, setNotes] = useState(transaction?.notes ?? '');
  const [errors, setErrors] = useState<Errors>({});

  const categoryOptions = categories.filter((c) => c.kind === type);

  function changeType(next: TransactionType) {
    setType(next);
    // A category only fits one kind, so clear it when it no longer applies.
    const current = categories.find((c) => c.id === categoryId);
    if (current && current.kind !== next) setCategoryId('');
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const cents = parseMoneyInput(amount);
    const next: Errors = {};
    if (cents === null || cents <= 0) next.amount = 'Enter a positive amount like 12.50';
    if (!date) next.date = 'Pick a date';
    if (!accountId) next.accountId = 'Choose an account';
    if (type === 'transfer' && !transferAccountId) {
      next.transferAccountId = 'Choose where the money goes';
    }
    setErrors(next);
    if (Object.keys(next).length > 0 || cents === null) return;

    onSubmit({
      type,
      amount: cents,
      date,
      accountId,
      transferAccountId: type === 'transfer' ? transferAccountId : null,
      categoryId: type === 'transfer' || !categoryId ? null : categoryId,
      payee: payee.trim(),
      notes: notes.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      <div className="segmented" role="radiogroup" aria-label="Type">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={type === t.value}
            className={`segmented__option${type === t.value ? ' segmented__option--active' : ''}`}
            onClick={() => changeType(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="form-row">
        <Field label="Amount" error={errors.amount}>
          {(id) => (
            <input
              id={id}
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          )}
        </Field>
        <Field label="Date" error={errors.date}>
          {(id) => (
            <input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          )}
        </Field>
      </div>

      <div className="form-row">
        <Field label={type === 'transfer' ? 'From account' : 'Account'} error={errors.accountId}>
          {(id) => (
            <select id={id} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        {type === 'transfer' ? (
          <Field label="To account" error={errors.transferAccountId}>
            {(id) => (
              <select
                id={id}
                value={transferAccountId}
                onChange={(e) => setTransferAccountId(e.target.value)}
              >
                <option value="">Choose…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        ) : (
          <Field label="Category">
            {(id) => (
              <select id={id} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Uncategorized</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}
      </div>

      <Field label={type === 'income' ? 'From' : type === 'transfer' ? 'Description' : 'Payee'}>
        {(id) => (
          <input id={id} value={payee} onChange={(e) => setPayee(e.target.value)} maxLength={200} />
        )}
      </Field>
      <Field label="Notes">
        {(id) => (
          <textarea
            id={id}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
            rows={2}
          />
        )}
      </Field>

      <div className="form-actions">
        {onDelete && (
          <button type="button" className="button button--danger form-actions__left" onClick={onDelete}>
            Delete
          </button>
        )}
        <button type="button" className="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="button button--primary" disabled={submitting}>
          {submitting ? 'Saving…' : transaction ? 'Save changes' : 'Add transaction'}
        </button>
      </div>
    </form>
  );
}
