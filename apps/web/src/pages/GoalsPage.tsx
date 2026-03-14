import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import {
  contributeToGoal,
  createGoal,
  deleteGoal,
  fetchGoals,
  updateGoal,
  type Goal,
  type GoalInput,
} from '../api/goals';
import { useUser } from '../auth/AuthContext';
import { GoalForm } from '../components/GoalForm';
import { PlusIcon } from '../components/icons';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { formatDate } from '../lib/dates';
import { formatMoney, parseMoneyInput } from '../lib/money';

const GOALS_KEY = ['goals'] as const;

type Editing = { mode: 'create' } | { mode: 'edit'; goal: Goal } | null;

function Contribute({ goal }: { goal: Goal }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const contribute = useMutation({
    mutationFn: (amount: number) => contributeToGoal(goal.id, amount),
    onSuccess: () => {
      setValue('');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: GOALS_KEY });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not update goal'),
  });

  function submit(sign: 1 | -1) {
    return (event?: FormEvent) => {
      event?.preventDefault();
      const cents = parseMoneyInput(value);
      if (!cents || cents <= 0) return setError('Enter an amount');
      contribute.mutate(sign * cents);
    };
  }

  return (
    <form className="contribute" onSubmit={submit(1)}>
      <input
        aria-label={`Amount for ${goal.name}`}
        inputMode="decimal"
        placeholder="Amount"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button className="button" disabled={contribute.isPending}>
        Add
      </button>
      <button
        type="button"
        className="button"
        disabled={contribute.isPending}
        onClick={() => submit(-1)()}
      >
        Withdraw
      </button>
      {error && <span className="field__error contribute__error">{error}</span>}
    </form>
  );
}

export function GoalsPage() {
  const { currency } = useUser();
  const queryClient = useQueryClient();
  const goals = useQuery({ queryKey: GOALS_KEY, queryFn: fetchGoals });
  const [editing, setEditing] = useState<Editing>(null);

  const save = useMutation({
    mutationFn: (input: GoalInput & { savedAmount?: number }) =>
      editing?.mode === 'edit' ? updateGoal(editing.goal.id, input) : createGoal(input),
    onSuccess: () => {
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: GOALS_KEY });
    },
  });
  const remove = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GOALS_KEY }),
  });

  function closeModal() {
    save.reset();
    setEditing(null);
  }

  const money = (cents: number) => formatMoney(cents, currency);

  return (
    <>
      <PageHeader
        title="Goals"
        description="Save up for the things that matter."
        actions={
          <button className="button button--primary" onClick={() => setEditing({ mode: 'create' })}>
            <PlusIcon /> New goal
          </button>
        }
      />

      {goals.data && goals.data.length === 0 && (
        <div className="card empty-state">
          <h2>No goals yet</h2>
          <p className="muted">
            An emergency fund, a holiday, a new laptop: pick something to aim for.
          </p>
        </div>
      )}

      <div className="goal-grid">
        {goals.data?.map((goal) => (
          <article key={goal.id} className="card goal-card">
            <header className="goal-card__header">
              <span className="goal-card__dot" style={{ background: goal.color }} />
              <h2>{goal.name}</h2>
              {goal.completed && <span className="badge badge--success">Reached</span>}
            </header>

            <div className="goal-card__amounts">
              <strong>{money(goal.savedAmount)}</strong>
              <span className="muted"> of {money(goal.targetAmount)}</span>
            </div>
            <div className="progress">
              <div
                className="progress__fill"
                style={{ width: `${goal.progress}%`, background: goal.color }}
              />
            </div>
            <div className="goal-card__meta muted">
              <span>{goal.progress}%</span>
              {goal.targetDate && <span>by {formatDate(goal.targetDate)}</span>}
            </div>

            <Contribute goal={goal} />

            <footer className="goal-card__footer">
              <button className="link-button" onClick={() => setEditing({ mode: 'edit', goal })}>
                Edit
              </button>
              <button
                className="link-button link-button--danger"
                onClick={() => window.confirm(`Delete "${goal.name}"?`) && remove.mutate(goal.id)}
              >
                Delete
              </button>
            </footer>
          </article>
        ))}
      </div>

      {editing && (
        <Modal title={editing.mode === 'edit' ? 'Edit goal' : 'New goal'} onClose={closeModal}>
          <GoalForm
            goal={editing.mode === 'edit' ? editing.goal : undefined}
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
