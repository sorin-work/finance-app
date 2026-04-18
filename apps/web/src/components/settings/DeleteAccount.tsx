import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { deleteAccount } from '../../api/users';
import { ME_QUERY_KEY } from '../../auth/AuthContext';
import { Field } from '../Field';

export function DeleteAccount() {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState('');

  const remove = useMutation({
    mutationFn: () => deleteAccount(password),
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(ME_QUERY_KEY, null);
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (window.confirm('This permanently deletes your account and all of your data. Continue?')) {
      remove.mutate();
    }
  }

  return (
    <form className="settings-form" onSubmit={handleSubmit}>
      {remove.error && (
        <div className="alert alert--error" role="alert">
          {remove.error.message}
        </div>
      )}
      <Field label="Confirm with your password">
        {(id) => (
          <input
            id={id}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
      </Field>
      <div className="form-actions">
        <button className="button button--danger" disabled={!password || remove.isPending}>
          Delete my account
        </button>
      </div>
    </form>
  );
}
