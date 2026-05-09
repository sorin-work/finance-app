import type { Queryable } from '../../db/types.js';
import { badRequest } from '../../lib/errors.js';
import { AccountsRepository } from '../accounts/accounts.repository.js';
import { CategoriesRepository } from '../categories/categories.repository.js';
import type { TransactionType } from './transactions.schemas.js';

export interface TransactionReferences {
  type: TransactionType;
  accountId: string;
  transferAccountId: string | null;
  categoryId: string | null;
}

/**
 * Makes sure the accounts and category belong to the user and fit the
 * transaction type. Shared by one-off and recurring transactions.
 */
export async function checkTransactionReferences(
  db: Queryable,
  userId: string,
  tx: TransactionReferences,
): Promise<void> {
  const accounts = new AccountsRepository(db);

  const account = await accounts.findById(userId, tx.accountId);
  if (!account) throw badRequest('Unknown account');
  if (account.archived) throw badRequest(`"${account.name}" is archived`);
  if (tx.type === 'transfer') {
    if (!tx.transferAccountId) throw badRequest('Transfers need a destination account');
    if (tx.transferAccountId === tx.accountId) {
      throw badRequest('Cannot transfer money to the same account');
    }
    const destination = await accounts.findById(userId, tx.transferAccountId);
    if (!destination) throw badRequest('Unknown destination account');
    if (destination.archived) throw badRequest(`"${destination.name}" is archived`);
    if (tx.categoryId) throw badRequest('Transfers cannot have a category');
    return;
  }
  if (tx.categoryId) {
    const category = await new CategoriesRepository(db).findById(userId, tx.categoryId);
    if (!category) throw badRequest('Unknown category');
    if (category.kind !== tx.type) {
      throw badRequest(
        `"${category.name}" is an ${category.kind} category and cannot be used for ${tx.type} transactions`,
      );
    }
  }
}
