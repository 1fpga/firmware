import { fail } from '@/utils/assert/error';
import { Versioned, compare, versionOf } from '@/utils/versions';

export function gt(a: Versioned, b: Versioned, message?: string | (() => string)) {
  if (compare(a, b) <= 0) {
    fail(
      message ??
        (() =>
          `Version ${JSON.stringify(versionOf(a))} should be greater than ${JSON.stringify(versionOf(b))}.`),
    );
  }
}

export function lt(
  a: Versioned,
  b: Versioned,
  message?: string | ((a: string, b: string) => string),
) {
  if (compare(a, b) >= 0) {
    fail(
      message ??
        ((a, b) =>
          `Version ${JSON.stringify(a)} should be greater than ${JSON.stringify(versionOf(b))}.`),
      versionOf(a),
      versionOf(b),
    );
  }
}
