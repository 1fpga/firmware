import { ZodSchema, ZodType } from '@1fpga/schemas';

import { fail } from './error';

export * as not from './not';
export * as user from './user';
export * as version from './version';

export * from './error';

export function assert(v: unknown, message?: string | (() => string)) {
  isTrue(v, message);
}

export function isTrue<T = unknown>(v: T, message?: string | (() => string)) {
  if (!v) {
    fail(message ?? (() => `Value ${JSON.stringify(v)} should be truey.`));
  }
}

export function gt<T>(a: T, b: T, message?: string): void {
  if (a < b) {
    fail(message ?? `${a} should be greater than ${b}.`);
  }
}

export function eq<T>(a: T, b: T, message?: string | ((a: T, b: T) => string)): void {
  if (a !== b) {
    fail(message ?? `${a} should be greater than ${b}.`, a, b);
  }
}

export function isSchema<T extends ZodType>(
  v: unknown,
  schema: ZodSchema,
  message?: string | (() => string),
): asserts v is T {
  const { success, error } = schema.safeParse(v);

  if (!success) {
    fail(message ?? (() => error.message));
  }
}

export function oneOfEnum(v: string, record: Record<any, string>, message?: string) {
  if (!Object.values(record).includes(v)) {
    fail(message ?? (() => `Value ${JSON.stringify(v)} not found in enum.`));
  }
}
