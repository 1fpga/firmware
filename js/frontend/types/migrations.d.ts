import { SqlTag } from '@sqltags/core';

export interface MigrationDetails<T = any> {
  /**
   * SQL to be executed.
   */
  sql: string;

  pre: (db: SqlTag<unknown, unknown>, options: { initial: boolean }) => Promise<T>;

  /**
   * Function to be executed after the SQL is executed.
   */
  post: (
    db: SqlTag<unknown, unknown>,
    options: {
      context: T;
      initial: boolean;
    },
  ) => Promise<void>;
}

export interface Migration {
  up?: MigrationDetails;
}

/**
 * List of up migrations to be applied.
 */
export declare const migrations: {
  [key: string]: Migration;
};
