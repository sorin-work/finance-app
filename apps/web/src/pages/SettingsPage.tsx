import { CategoryManager } from '../components/CategoryManager';
import { PageHeader } from '../components/PageHeader';
import { DeleteAccount } from '../components/settings/DeleteAccount';
import { PasswordForm } from '../components/settings/PasswordForm';
import { ProfileForm } from '../components/settings/ProfileForm';

export function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />

      <section className="card settings-section">
        <h2>Profile</h2>
        <p className="muted">Your name and the currency amounts are shown in.</p>
        <ProfileForm />
      </section>

      <section className="card settings-section">
        <h2>Categories</h2>
        <p className="muted">
          Rename, recolor or remove the categories used to group transactions.
        </p>
        <CategoryManager />
      </section>

      <section className="card settings-section">
        <h2>Password</h2>
        <p className="muted">Choose a password you do not use anywhere else.</p>
        <PasswordForm />
      </section>

      <section className="card settings-section settings-section--danger">
        <h2>Delete account</h2>
        <p className="muted">
          Removes your accounts, transactions, budgets and goals. This cannot be undone.
        </p>
        <DeleteAccount />
      </section>
    </>
  );
}
