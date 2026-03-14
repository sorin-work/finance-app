import { useState, type FormEvent } from 'react';
import type { Goal, GoalInput } from '../api/goals';
import { centsToInput, parseMoneyInput } from '../lib/money';
import { Field } from './Field';

const COLORS = ['#4f46e5', '#0891b2', '#16a34a', '#ca8a04', '#ea580c', '#db2777', '#7c3aed'];

interface GoalFormProps {
  goal?: Goal;
  submitting: boolean;
  error?: string | null;
  onSubmit: (input: GoalInput & { savedAmount?: number }) => void;
  onCancel: () => void;
}

export function GoalForm({ goal, submitting, error, onSubmit, onCancel }: GoalFormProps) {
  const [name, setName] = useState(goal?.name ?? '');
  const [target, setTarget] = useState(goal ? centsToInput(goal.targetAmount) : '');
  const [saved, setSaved] = useState('');
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? '');
  const [color, setColor] = useState(goal?.color ?? COLORS[0]!);
  const [errors, setErrors] = useState<{ name?: string; target?: string; saved?: string }>({});

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const targetAmount = parseMoneyInput(target);
    const savedAmount = saved ? parseMoneyInput(saved) : 0;
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Name your goal';
    if (!targetAmount || targetAmount <= 0) next.target = 'Enter a target amount';
    if (savedAmount === null || savedAmount < 0) next.saved = 'Enter an amount or leave empty';
    setErrors(next);
    if (Object.keys(next).length > 0 || !targetAmount) return;

    onSubmit({
      name: name.trim(),
      targetAmount,
      targetDate: targetDate || null,
      color,
      ...(goal ? {} : { savedAmount: savedAmount ?? 0 }),
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}
      <Field label="Goal" error={errors.name}>
        {(id) => (
          <input
            id={id}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Emergency fund"
            maxLength={100}
          />
        )}
      </Field>
      <div className="form-row">
        <Field label="Target amount" error={errors.target}>
          {(id) => (
            <input
              id={id}
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          )}
        </Field>
        {goal ? (
          <Field label="Target date (optional)">
            {(id) => (
              <input
                id={id}
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            )}
          </Field>
        ) : (
          <Field label="Already saved" error={errors.saved}>
            {(id) => (
              <input
                id={id}
                inputMode="decimal"
                placeholder="0.00"
                value={saved}
                onChange={(e) => setSaved(e.target.value)}
              />
            )}
          </Field>
        )}
      </div>
      {!goal && (
        <Field label="Target date (optional)">
          {(id) => (
            <input
              id={id}
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          )}
        </Field>
      )}
      <div className="field">
        <span className="field__label">Color</span>
        <div className="swatches" role="radiogroup" aria-label="Color">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={c}
              className={`swatch${color === c ? ' swatch--active' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="button button--primary" disabled={submitting}>
          {submitting ? 'Saving…' : goal ? 'Save changes' : 'Create goal'}
        </button>
      </div>
    </form>
  );
}
