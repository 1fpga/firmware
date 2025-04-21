/**
 * A versioned schema that may contain a version field or a normalized version number.
 */
export type Versioned =
  | { version?: string | number | null; _version?: string | number | null }
  | string
  | number
  | null
  | undefined;

export function versionOf(a: Versioned): string | undefined {
  if (typeof a === 'object') {
    a = a && (a.version ?? a._version);
  }
  if (a === undefined || a === null) {
    return undefined;
  }
  return `${a}`;
}

/**
 * Compare two versions in the catalog JSONs.
 * @param a The first version.
 * @param b The second version.
 * @returns `<= -1` if `a` is smaller than `b`,
 *          `== 0` if `a` is equal to `b`,
 *          `>= 1` if `a` is greater than `b`.
 */
export function compare(a: Versioned, b: Versioned): number {
  a = versionOf(a);
  b = versionOf(b);

  if (a === null || a === undefined) {
    return b === null || b === undefined ? 0 : 1;
  } else if (b === null || b === undefined) {
    return -1;
  }

  const aParts = a.split('.');
  const bParts = b.split('.');
  const length = Math.max(aParts.length, bParts.length);
  const zipped = Array.from({ length }).map((_, i) => [aParts[i], bParts[i]]);

  for (const [aPart, bPart] of zipped) {
    if (aPart === undefined) {
      return bPart === undefined ? 0 : -1;
    }
    if (Number.isFinite(+aPart) && Number.isFinite(+bPart)) {
      const maybeResult = +aPart - +bPart;
      if (maybeResult !== 0) {
        return maybeResult;
      }
    }

    const maybeResult = aPart.localeCompare(bPart);
    if (maybeResult !== 0) {
      return maybeResult;
    }
  }

  return 0;
}

/**
 * A comparator for a simpler way to call compare on normalized schemas. Will return the
 * reverse of the `compare` function and can be used to sort descending.
 */
export const compareDesc = (a: Versioned, b: Versioned) => -compare(a, b);
