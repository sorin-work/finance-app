import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { createCategory, deleteCategory, updateCategory } from '../api/categories';
import { ApiError } from '../api/client';
import type { Category, CategoryKind } from '../api/types';
import { CATEGORIES_KEY, useCategories } from '../hooks/useCategories';
import { invalidateFinancialData } from '../hooks/invalidate';

const PALETTE = [
  '#16a34a',
  '#0891b2',
  '#2563eb',
  '#4f46e5',
  '#7c3aed',
  '#db2777',
  '#dc2626',
  '#ea580c',
  '#ca8a04',
  '#0d9488',
  '#64748b',
];

function CategoryRow({ category }: { category: Category }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(category.name);
  const [error, setError] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: (input: { name?: string; color?: string }) => updateCategory(category.id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY }),
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not save');
      setName(category.name);
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteCategory(category.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
      await invalidateFinancialData(queryClient);
    },
  });

  function commitName() {
    const trimmed = name.trim();
    setError(null);
    if (!trimmed) setName(category.name);
    else if (trimmed !== category.name) update.mutate({ name: trimmed });
  }

  return (
    <li className="category-row">
      <input
        type="color"
        className="category-row__color"
        value={category.color}
        aria-label={`Color for ${category.name}`}
        onChange={(e) => update.mutate({ color: e.target.value })}
      />
      <input
        className="category-row__name"
        value={name}
        aria-label="Category name"
        onChange={(e) => setName(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
      {error && <span className="field__error">{error}</span>}
      <button
        className="button button--danger"
        onClick={() => {
          if (
            window.confirm(
              `Delete "${category.name}"? Transactions in it will become uncategorized.`,
            )
          ) {
            remove.mutate();
          }
        }}
      >
        Delete
      </button>
    </li>
  );
}

function AddCategory({ kind }: { kind: CategoryKind }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      setName('');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not add category'),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const color = PALETTE[Math.floor(Math.random() * PALETTE.length)]!;
    create.mutate({ name: name.trim(), kind, color });
  }

  return (
    <form className="add-category" onSubmit={handleSubmit}>
      <input
        placeholder={kind === 'income' ? 'New income category' : 'New expense category'}
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={60}
      />
      <button className="button" disabled={create.isPending || !name.trim()}>
        Add
      </button>
      {error && <span className="field__error">{error}</span>}
    </form>
  );
}

export function CategoryManager() {
  const categories = useCategories();

  if (categories.isPending) return <p className="muted">Loading categories…</p>;
  if (categories.isError)
    return <div className="alert alert--error">Could not load categories.</div>;

  return (
    <div className="category-columns">
      {(['expense', 'income'] as const).map((kind) => (
        <div key={kind}>
          <h3 className="category-columns__title">
            {kind === 'expense' ? 'Expense categories' : 'Income categories'}
          </h3>
          <ul className="category-list">
            {categories.data
              .filter((c) => c.kind === kind)
              .map((c) => (
                <CategoryRow key={c.id} category={c} />
              ))}
          </ul>
          <AddCategory kind={kind} />
        </div>
      ))}
    </div>
  );
}
