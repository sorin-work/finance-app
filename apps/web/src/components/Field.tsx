import { useId, type ReactNode } from 'react';

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: (id: string) => ReactNode;
}

/** Label + control + error message. The control receives the generated id. */
export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId();
  return (
    <div className={`field${error ? ' field--invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {error ? (
        <span className="field__error" role="alert">
          {error}
        </span>
      ) : (
        hint && <span className="field__hint">{hint}</span>
      )}
    </div>
  );
}
