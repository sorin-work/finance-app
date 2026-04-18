import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { updateProfile } from '../../api/users';
import { ME_QUERY_KEY, useUser } from '../../auth/AuthContext';
import { CURRENCIES } from '../../lib/currencies';
import { Field } from '../Field';

export function ProfileForm() {
  const user = useUser();
  const queryClient = useQueryClient();
  const [name, setName] = useState(user.name);
  const [currency, setCurrency] = useState(user.currency);

  const save = useMutation({
    mutationFn: () => updateProfile({ name: name.trim(), currency }),
    onSuccess: (updated) => queryClient.setQueryData(ME_QUERY_KEY, updated),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim()) save.mutate();
  }

  const unchanged = name.trim() === user.name && currency === user.currency;

  return (
    <form className="settings-form" onSubmit={handleSubmit}>
      {save.error && (
        <div className="alert alert--error" role="alert">
          {save.error instanceof ApiError ? save.error.message : 'Could not save'}
        </div>
      )}
      <div className="form-row">
        <Field label="Name">
          {(id) => (
            <input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          )}
        </Field>
        <Field label="Currency" hint="Changing it does not convert existing amounts.">
          {(id) => (
            <select id={id} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} · {c.label}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <Field label="Email">{(id) => <input id={id} value={user.email} disabled />}</Field>
      <div className="form-actions">
        {save.isSuccess && unchanged && <span className="muted">Saved.</span>}
        <button className="button button--primary" disabled={save.isPending || unchanged}>
          Save profile
        </button>
      </div>
    </form>
  );
}
