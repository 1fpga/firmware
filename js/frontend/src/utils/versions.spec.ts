import { expect, test } from '@jest/globals';

import { compare } from './versions';

const cases = [
  ['a', 'b', -1],
  ['a', 'a', 0],
  [0, 1, -1],
  [1, 0, 1],
  [123, 123, 0],
  ['0.2', '0.12', -1],
  ['0.2.1', '0.2.2', -1],
  ['0.2.3', '0.2.2', 1],
  ['0.2.3-beta', '0.2.2', 1],
  ['0.2.3-1', '0.2.3', 1],
  ['0.2.3', '0.2.3-1', -1],
];

test.each(cases)('compare(%p, %p) == %p', (a, b, expected) => {
  const result = compare(a, b);
  const actual = result < 0 ? -1 : result > 0 ? 1 : 0;
  expect(actual).toBe(expected);
});

test.each(cases)('compare({ version: %p }, %p) == %p', (a, b, expected) => {
  {
    const result = compare({ version: a }, b);
    const actual = result < 0 ? -1 : result > 0 ? 1 : 0;
    expect(actual).toBe(expected);
  }
  {
    const result = compare({ _version: a }, b);
    const actual = result < 0 ? -1 : result > 0 ? 1 : 0;
    expect(actual).toBe(expected);
  }
});

test.each(cases)('compare({ version: %p }, { version: %p }) == %p', (a, b, expected) => {
  {
    const result = compare({ version: a }, { version: b });
    const actual = result < 0 ? -1 : result > 0 ? 1 : 0;
    expect(actual).toBe(expected);
  }
  {
    const result = compare({ _version: a }, { version: b });
    const actual = result < 0 ? -1 : result > 0 ? 1 : 0;
    expect(actual).toBe(expected);
  }
  {
    const result = compare({ version: a }, { _version: b });
    const actual = result < 0 ? -1 : result > 0 ? 1 : 0;
    expect(actual).toBe(expected);
  }
  {
    const result = compare({ _version: a }, { _version: b });
    const actual = result < 0 ? -1 : result > 0 ? 1 : 0;
    expect(actual).toBe(expected);
  }
});

test.each(cases)('compare(%p, { version: %p }) == %p', (a, b, expected) => {
  {
    const result = compare(a, { version: b });
    const actual = result < 0 ? -1 : result > 0 ? 1 : 0;
    expect(actual).toBe(expected);
  }
  {
    const result = compare(a, { _version: b });
    const actual = result < 0 ? -1 : result > 0 ? 1 : 0;
    expect(actual).toBe(expected);
  }
});
