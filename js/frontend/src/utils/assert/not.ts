import { fail } from '@/utils/assert/error';

/**
 * Assert that a value is not null, otherwise throw an exception.
 */
export function null_<T>(
  value: T | undefined | null,
  message?: string | (() => string),
): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    fail(message ?? `Value should not be null or undefined.`);
  }
}
