import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Field } from '../components/Field';
import { CURRENCIES } from '../lib/currencies';

type Errors = Partial<Record<'name' | 'email' | 'password' | 'form', string>>;

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', currency: 'USD' });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  function validate(): Errors {
    const next: Errors = {};
    if (!form.name.trim()) next.name = 'Tell us what to call you';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address';
    if (form.password.length < 8) next.password = 'Use at least 8 characters';
    return next;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldErrors: Errors = {};
        for (const issue of err.issues) {
          if (issue.path === 'name' || issue.path === 'email' || issue.path === 'password') {
            fieldErrors[issue.path] = issue.message;
          }
        }
        setErrors(Object.keys(fieldErrors).length ? fieldErrors : { form: err.message });
      } else {
        setErrors({ form: 'Could not reach the server' });
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <div className="auth-card__brand" aria-hidden="true">
          <img src="/favicon.svg" alt="" width={36} height={36} />
        </div>
        <h1>Create your account</h1>
        <p className="muted">Start tracking where your money goes.</p>

        {errors.form && (
          <div className="alert alert--error" role="alert">
            {errors.form}
          </div>
        )}

        <Field label="Name" error={errors.name}>
          {(id) => (
            <input
              id={id}
              autoComplete="name"
              value={form.name}
              onChange={(e) => set('name')(e.target.value)}
              autoFocus
            />
          )}
        </Field>
        <Field label="Email" error={errors.email}>
          {(id) => (
            <input
              id={id}
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => set('email')(e.target.value)}
            />
          )}
        </Field>
        <Field label="Password" error={errors.password} hint="At least 8 characters">
          {(id) => (
            <input
              id={id}
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => set('password')(e.target.value)}
            />
          )}
        </Field>
        <Field label="Currency">
          {(id) => (
            <select id={id} value={form.currency} onChange={(e) => set('currency')(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} · {c.label}
                </option>
              ))}
            </select>
          )}
        </Field>

        <button className="button button--primary button--block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>

        <p className="auth-card__switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
