import { useState, type FormEvent } from 'react';
import type { Frequency, Recurring, RecurringInput } from '../api/recurring';
import type { Account, Category, TransactionType } from '../api/types';
import { today } from '../lib/dates';
import { centsToInput, parseMoneyInput } from '../lib/money';
import { FREQUENCY_LABELS } from '../lib/recurring';
import { Field } from './Field';

interface RecurringFormProps {
  recurring?: Recurring;
  accounts: Account[];
  categories: Category[];
  submitting: boolean;
  error?: string | null;
  onSubmit: (input: RecurringInput) => void;
  onCancel: () => void;
}

type Errors = Partial<Record<'amount' | 'startDate' | 'endDate' | 'transferAccountId', string>>;

export function RecurringForm({
  recurring,
  accounts,
  categories,
  submitting,
  error,
  onSubmit,
  onCancel,
}: RecurringFormProps) {
  const [type, setType] = useState<TransactionType>(recurring?.type ?? 'expense');
  const [amount, setAmount] = useState(recurring ? centsToInput(recurring.amount) : '');
  const [accountId, setAccountId] = useState(recurring?.accountId ?? accounts[0]?.id ?? '');
  const [transferAccountId, setTransferAccountId] = useState(recurring?.transferAccountId ?? '');
  const [categoryId, setCategoryId] = useState(recurring?.categoryId ?? '');
  const [payee, setPayee] = useState(recurring?.payee ?? '');
  const [frequency, setFrequency] = useState<Frequency>(recurring?.frequency ?? 'monthly');
  const [startDate, setStartDate] = useState(recurring?.startDate ?? today());
  const [endDate, setEndDate] = useState(recurring?.endDate ?? '');
  const [errors, setErrors] = useState<Errors>({});

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const cents = parseMoneyInput(amount);
    const next: Errors = {};
    if (cents === null || cents <= 0) next.amount = 'Enter a positive amount';
    if (!startDate) next.startDate = 'Pick a start date';
    if (endDate && endDate < startDate) next.endDate = 'Must be after the start date';
    if (type === 'transfer' && !transferAccountId) next.transferAccountId = 'Choose an account';
    setErrors(next);
    if (Object.keys(next).length > 0 || cents === null) return;

    onSubmit({
      type,
      amount: cents,
      accountId,
      transferAccountId: type === 'transfer' ? transferAccountId : null,
      categoryId: type === 'transfer' || !categoryId ? null : categoryId,
      payee: payee.trim(),
      notes: recurring?.notes ?? '',
      frequency,
      startDate,
      endDate: endDate || null,
      active: recurring?.active ?? true,
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
        {(['expense', 'income', 'transfer'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            className={`segmented__option${type === t ? ' segmented__option--active' : ''}`}
            onClick={() => {
              setType(t);
              setCategoryId('');
            }}
          >
            {t[0]!.toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <Field label={type === 'income' ? 'From' : 'Description'}>
        {(id) => (
          <input
            id={id}
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
            placeholder={type === 'income' ? 'Employer' : 'e.g. Rent, Netflix'}
          />
        )}
      </Field>

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
        <Field label="Repeats">
          {(id) => (
            <select
              id={id}
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Frequency)}
            >
              {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <div className="form-row">
        <Field label={type === 'transfer' ? 'From account' : 'Account'}>
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
                {categories
                  .filter((c) => c.kind === type)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            )}
          </Field>
        )}
      </div>

      <div className="form-row">
        <Field label="Starts" error={errors.startDate}>
          {(id) => (
            <input
              id={id}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          )}
        </Field>
        <Field label="Ends (optional)" error={errors.endDate}>
          {(id) => (
            <input
              id={id}
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          )}
        </Field>
      </div>

      <div className="form-actions">
        <button type="button" className="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="button button--primary" disabled={submitting}>
          {submitting ? 'Saving…' : recurring ? 'Save changes' : 'Create rule'}
        </button>
      </div>
    </form>
  );
}
