import { CategoryManager } from '../components/CategoryManager';
import { PageHeader } from '../components/PageHeader';

export function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <section className="card settings-section">
        <h2>Categories</h2>
        <p className="muted">
          Rename, recolor or remove the categories used to group transactions.
        </p>
        <CategoryManager />
      </section>
    </>
  );
}
