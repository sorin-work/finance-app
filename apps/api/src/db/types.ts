export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

/** Anything that can run SQL: the pool itself or a client inside a transaction. */
export interface Queryable {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
  /** Runs one or more statements without parameters (used for migrations). */
  exec(sql: string): Promise<void>;
}

export interface Database extends Queryable {
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
