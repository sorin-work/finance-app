import type { Database, Queryable } from '../db/types.js';
import { addMonths, currentMonth, daysInMonth, monthsBetween, shiftMonth, todayISO } from '../lib/dates.js';
import { hashPassword } from '../modules/auth/password.js';
import { CategoriesRepository } from '../modules/categories/categories.repository.js';
import { DEFAULT_CATEGORIES } from '../modules/categories/defaults.js';

export const DEMO_EMAIL = 'demo@example.com';
export const DEMO_PASSWORD = 'demo-password';

/** Small deterministic PRNG so the demo data looks the same on every machine. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Tx {
  account: string;
  to?: string;
  category?: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  date: string;
  payee: string;
  notes?: string;
}

const ACCOUNTS = [
  { key: 'checking', name: 'Everyday Checking', type: 'checking', opening: 2450_00 },
  { key: 'savings', name: 'High-Yield Savings', type: 'savings', opening: 8000_00 },
  { key: 'card', name: 'Visa Credit Card', type: 'credit_card', opening: -320_00 },
  { key: 'cash', name: 'Wallet', type: 'cash', opening: 120_00 },
  { key: 'brokerage', name: 'Brokerage', type: 'investment', opening: 15000_00 },
] as const;

const BUDGETS: Record<string, number> = {
  Housing: 1450_00,
  Groceries: 650_00,
  'Dining Out': 300_00,
  Transport: 250_00,
  Utilities: 220_00,
  Subscriptions: 80_00,
  Shopping: 300_00,
  Entertainment: 150_00,
};

/** Builds a year of realistic transactions ending today. */
function buildTransactions(today: string, random: () => number): Tx[] {
  const between = (min: number, max: number) => Math.round(min + random() * (max - min));
  const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)]!;
  const firstMonth = shiftMonth(currentMonth(new Date(`${today}T00:00:00Z`)), -11);
  const txs: Tx[] = [];

  for (const month of monthsBetween(firstMonth, today.slice(0, 7))) {
    const [y, m] = month.split('-').map(Number) as [number, number];
    const lastDay = daysInMonth(y, m);
    const day = (d: number) => `${month}-${String(Math.min(d, lastDay)).padStart(2, '0')}`;
    const add = (tx: Tx) => txs.push(tx);
    let cardSpend = 0;
    const onCard = (tx: Omit<Tx, 'account'>) => {
      cardSpend += tx.amount;
      add({ ...tx, account: 'card' });
    };

    add({ account: 'checking', category: 'Housing', type: 'expense', amount: 1450_00, date: day(1), payee: 'Parkside Apartments', notes: 'Rent' });
    add({ account: 'checking', category: 'Salary', type: 'income', amount: 4200_00, date: day(25), payee: 'Acme Corp', notes: 'Payroll' });
    add({ account: 'checking', to: 'savings', type: 'transfer', amount: 500_00, date: day(26), payee: 'Monthly savings' });
    add({ account: 'savings', category: 'Interest & Dividends', type: 'income', amount: between(24_00, 36_00), date: day(lastDay), payee: 'Interest' });

    add({ account: 'checking', category: 'Utilities', type: 'expense', amount: between(58_00, 112_00), date: day(9), payee: 'City Power & Light' });
    add({ account: 'checking', category: 'Utilities', type: 'expense', amount: 49_99, date: day(14), payee: 'FiberNet Internet' });
    add({ account: 'checking', category: 'Utilities', type: 'expense', amount: between(28_00, 46_00), date: day(17), payee: 'Mobile plan' });

    onCard({ category: 'Subscriptions', type: 'expense', amount: 15_49, date: day(3), payee: 'Netflix' });
    onCard({ category: 'Subscriptions', type: 'expense', amount: 11_99, date: day(6), payee: 'Spotify' });
    onCard({ category: 'Subscriptions', type: 'expense', amount: 2_99, date: day(12), payee: 'iCloud' });
    add({ account: 'checking', category: 'Health', type: 'expense', amount: 39_00, date: day(2), payee: 'Peak Fitness', notes: 'Gym membership' });
    add({ account: 'checking', category: 'Transport', type: 'expense', amount: 85_00, date: day(1), payee: 'Metro transit pass' });

    for (let i = between(6, 9); i > 0; i--) {
      onCard({ category: 'Groceries', type: 'expense', amount: between(22_00, 138_00), date: day(between(1, 28)), payee: pick(['FreshMart', 'Green Grocer', 'Costco', 'Corner Market', "Trader Joe's"]) });
    }
    for (let i = between(4, 8); i > 0; i--) {
      const small = random() < 0.4;
      const tx = { category: 'Dining Out', type: 'expense' as const, amount: small ? between(4_50, 9_50) : between(14_00, 68_00), date: day(between(1, 28)), payee: small ? pick(['Blue Bottle Coffee', 'Corner Bakery']) : pick(["Luigi's Trattoria", 'Sushi Go', 'Taco Stand', 'The Green Bowl', 'Burger Joint']) };
      if (small && random() < 0.5) add({ ...tx, account: 'cash' });
      else onCard(tx);
    }
    for (let i = 2; i > 0; i--) {
      onCard({ category: 'Transport', type: 'expense', amount: between(35_00, 72_00), date: day(between(1, 28)), payee: pick(['Shell', 'Chevron']) });
    }
    for (let i = between(1, 3); i > 0; i--) {
      onCard({ category: 'Shopping', type: 'expense', amount: between(18_00, 240_00), date: day(between(1, 28)), payee: pick(['Amazon', 'Target', 'IKEA', 'Uniqlo', 'Best Buy']) });
    }
    for (let i = between(1, 3); i > 0; i--) {
      onCard({ category: 'Entertainment', type: 'expense', amount: between(12_00, 85_00), date: day(between(1, 28)), payee: pick(['Cinema City', 'Steam', 'Ticketmaster', 'Bowling Alley']) });
    }
    if (random() < 0.35) {
      onCard({ category: 'Health', type: 'expense', amount: between(20_00, 160_00), date: day(between(1, 28)), payee: pick(['CVS Pharmacy', 'Dental Care', 'Eye Clinic']) });
    }
    if (random() < 0.4) {
      add({ account: 'checking', category: 'Freelance', type: 'income', amount: between(300_00, 950_00), date: day(between(5, 20)), payee: pick(['Northwind Studio', 'Contoso Ltd', 'Fabrikam']), notes: 'Freelance invoice' });
    }
    if (m === 7 || m === 12 || random() < 0.1) {
      onCard({ category: 'Travel', type: 'expense', amount: between(380_00, 1250_00), date: day(between(8, 22)), payee: pick(['Booking.com', 'SkyAir', 'Airbnb']) });
    }
    if (m % 3 === 0) {
      add({ account: 'brokerage', category: 'Interest & Dividends', type: 'income', amount: between(60_00, 140_00), date: day(15), payee: 'Index fund dividend' });
      add({ account: 'checking', to: 'brokerage', type: 'transfer', amount: 750_00, date: day(27), payee: 'Investing' });
    }
    add({ account: 'checking', to: 'cash', type: 'transfer', amount: 100_00, date: day(between(3, 10)), payee: 'ATM withdrawal' });

    // Pay off the card early next month.
    const payDate = addMonths(`${month}-01`, 1).slice(0, 8) + '05';
    add({ account: 'checking', to: 'card', type: 'transfer', amount: cardSpend, date: payDate, payee: 'Card payment' });
  }

  return txs.filter((tx) => tx.date <= today).sort((a, b) => a.date.localeCompare(b.date));
}

async function insertTransactions(
  tx: Queryable,
  userId: string,
  rows: Tx[],
  accountIds: Map<string, string>,
  categoryIds: Map<string, string>,
) {
  const batchSize = 200;
  for (let i = 0; i < rows.length; i += batchSize) {
    const params: unknown[] = [userId];
    const values = rows.slice(i, i + batchSize).map((row) => {
      params.push(
        accountIds.get(row.account),
        row.to ? accountIds.get(row.to) : null,
        row.category ? categoryIds.get(row.category) : null,
        row.type,
        row.amount,
        row.date,
        row.payee,
        row.notes ?? '',
      );
      const n = params.length;
      return `($1, ${Array.from({ length: 8 }, (_, k) => `$${n - 7 + k}`).join(', ')})`;
    });
    await tx.query(
      `INSERT INTO transactions
         (user_id, account_id, transfer_account_id, category_id, type, amount, date, payee, notes)
       VALUES ${values.join(', ')}`,
      params,
    );
  }
}

/**
 * Creates a demo user with a year of history. Does nothing if the demo user
 * already exists. Returns true when data was created.
 */
export async function seedDemoData(
  db: Database,
  options: { today?: string; bcryptRounds?: number } = {},
): Promise<boolean> {
  const today = options.today ?? todayISO();
  const existing = await db.query('SELECT 1 FROM users WHERE lower(email) = $1', [DEMO_EMAIL]);
  if (existing.rowCount > 0) return false;

  const passwordHash = await hashPassword(DEMO_PASSWORD, options.bcryptRounds ?? 10);
  const random = mulberry32(20251115);

  await db.transaction(async (tx) => {
    const { rows: users } = await tx.query<{ id: string }>(
      `INSERT INTO users (email, name, password_hash, currency) VALUES ($1, $2, $3, 'USD') RETURNING id`,
      [DEMO_EMAIL, 'Alex Morgan', passwordHash],
    );
    const userId = users[0]!.id;

    const categoriesRepo = new CategoriesRepository(tx);
    await categoriesRepo.createMany(userId, DEFAULT_CATEGORIES);
    const categoryIds = new Map((await categoriesRepo.list(userId)).map((c) => [c.name, c.id]));

    const accountIds = new Map<string, string>();
    for (const account of ACCOUNTS) {
      const { rows } = await tx.query<{ id: string }>(
        `INSERT INTO accounts (user_id, name, type, opening_balance) VALUES ($1, $2, $3, $4) RETURNING id`,
        [userId, account.name, account.type, account.opening],
      );
      accountIds.set(account.key, rows[0]!.id);
    }

    await insertTransactions(tx, userId, buildTransactions(today, random), accountIds, categoryIds);

    const month = today.slice(0, 7);
    for (const m of [shiftMonth(month, -2), shiftMonth(month, -1), month]) {
      for (const [name, amount] of Object.entries(BUDGETS)) {
        await tx.query(
          `INSERT INTO budgets (user_id, category_id, month, amount) VALUES ($1, $2, $3, $4)`,
          [userId, categoryIds.get(name), `${m}-01`, amount],
        );
      }
    }
  });

  return true;
}
