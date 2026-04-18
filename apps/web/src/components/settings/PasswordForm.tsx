import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { changePassword } from '../../api/users';
import { Field } from '../Field';

export function PasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => changePassword(current, next),
    onSuccess: () => {
      setCurrent('');
      setNext('');
      setConfirm('');
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not change password'),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (next.length < 8) return setError('Use at least 8 characters');
    if (next !== confirm) return setError('The new passwords do not match');
    save.mutate();
  }

  return (
    <form className="settings-form" onSubmit={handleSubmit}>
      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}
      {save.isSuccess && (
        <div className="alert alert--info" role="status">
          Password changed.
        </div>
      )}
      <Field label="Current password">
        {(id) => (
          <input
            id={id}
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        )}
      </Field>
      <div className="form-row">
        <Field label="New password">
          {(id) => (
            <input
              id={id}
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          )}
        </Field>
        <Field label="Repeat new password">
          {(id) => (
            <input
              id={id}
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          )}
        </Field>
      </div>
      <div className="form-actions">
        <button className="button button--primary" disabled={save.isPending || !current || !next}>
          Change password
        </button>
      </div>
    </form>
  );
}
