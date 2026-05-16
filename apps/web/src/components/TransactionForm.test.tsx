import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Account, Category } from '../api/types';
import { TransactionForm } from './TransactionForm';

const accounts: Account[] = [
  {
    id: 'checking',
    name: 'Checking',
    type: 'checking',
    openingBalance: 0,
    balance: 0,
    archived: false,
    createdAt: '',
  },
  {
    id: 'savings',
    name: 'Savings',
    type: 'savings',
    openingBalance: 0,
    balance: 0,
    archived: false,
    createdAt: '',
  },
  {
    id: 'old',
    name: 'Old wallet',
    type: 'cash',
    openingBalance: 0,
    balance: 0,
    archived: true,
    createdAt: '',
  },
];

const categories: Category[] = [
  { id: 'groceries', name: 'Groceries', kind: 'expense', color: '#16a34a' },
  { id: 'salary', name: 'Salary', kind: 'income', color: '#15803d' },
];

function renderForm(onSubmit = vi.fn()) {
  render(
    <TransactionForm
      accounts={accounts}
      categories={categories}
      submitting={false}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
    />,
  );
  return onSubmit;
}

describe('TransactionForm', () => {
  it('submits an expense with the amount in cents', async () => {
    const onSubmit = renderForm();

    await userEvent.type(screen.getByLabelText('Amount'), '12.50');
    await userEvent.clear(screen.getByLabelText('Date'));
    await userEvent.type(screen.getByLabelText('Date'), '2026-05-16');
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'groceries');
    await userEvent.type(screen.getByLabelText('Payee'), '  FreshMart ');
    await userEvent.click(screen.getByRole('button', { name: 'Add transaction' }));

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'expense',
      amount: 1250,
      date: '2026-05-16',
      accountId: 'checking',
      transferAccountId: null,
      categoryId: 'groceries',
      payee: 'FreshMart',
      notes: '',
    });
  });

  it('rejects a missing or non-positive amount', async () => {
    const onSubmit = renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Add transaction' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a positive amount');

    await userEvent.type(screen.getByLabelText('Amount'), '-5');
    await userEvent.click(screen.getByRole('button', { name: 'Add transaction' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('only offers categories that match the type', async () => {
    renderForm();
    const options = () =>
      within(screen.getByLabelText('Category'))
        .getAllByRole('option')
        .map((o) => o.textContent);

    expect(options()).toEqual(['Uncategorized', 'Groceries']);
    await userEvent.click(screen.getByRole('radio', { name: 'Income' }));
    expect(options()).toEqual(['Uncategorized', 'Salary']);
  });

  it('asks for a destination account for transfers', async () => {
    const onSubmit = renderForm();
    await userEvent.click(screen.getByRole('radio', { name: 'Transfer' }));
    expect(screen.queryByLabelText('Category')).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Amount'), '100');
    await userEvent.click(screen.getByRole('button', { name: 'Add transaction' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose where the money goes');

    await userEvent.selectOptions(screen.getByLabelText('To account'), 'savings');
    await userEvent.click(screen.getByRole('button', { name: 'Add transaction' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'transfer', transferAccountId: 'savings', categoryId: null }),
    );
  });

  it('hides archived accounts', () => {
    renderForm();
    const names = within(screen.getByLabelText('Account'))
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(names).toEqual(['Checking', 'Savings']);
  });
});
