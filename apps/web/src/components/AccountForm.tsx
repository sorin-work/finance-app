import { useState, type FormEvent } from 'react';
import type { AccountInput } from '../api/accounts';
import type { Account } from '../api/types';
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS } from '../lib/accounts';
import { centsToInput, parseMoneyInput } from '../lib/money';
import { Field } from './Field';

interface AccountFormProps {
  account?: Account;
  submitting: boolean;
  error?: string | null;
  onSubmit: (input: AccountInput) => void;
  onCancel: () => void;
}

export function AccountForm({ account, submitting, error, onSubmit, onCancel }: AccountFormProps) {
  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState(account?.type ?? 'checking');
  const [opening, setOpening] = useState(account ? centsToInput(account.openingBalance) : '0.00');
  const [errors, setErrors] = useState<{ name?: string; opening?: string }>({});

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const openingBalance = parseMoneyInput(opening);
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Give the account a name';
    if (openingBalance === null) next.opening = 'Enter an amount like 1250.00';
    setErrors(next);
    if (Object.keys(next).length > 0 || openingBalance === null) return;
    onSubmit({ name: name.trim(), type, openingBalance });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}
      <Field label="Name" error={errors.name}>
        {(id) => (
          <input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        )}
      </Field>
      <Field label="Type">
        {(id) => (
          <select
            id={id}
            value={type}
            onChange={(e) => setType(e.target.value as AccountInput['type'])}
          >
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {ACCOUNT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field
        label="Opening balance"
        error={errors.opening}
        hint="Use a negative amount for money you owe, e.g. a credit card balance."
      >
        {(id) => (
          <input
            id={id}
            inputMode="decimal"
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
          />
        )}
      </Field>
      <div className="form-actions">
        <button type="button" className="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="button button--primary" disabled={submitting}>
          {submitting ? 'Saving…' : account ? 'Save changes' : 'Add account'}
        </button>
      </div>
    </form>
  );
}
