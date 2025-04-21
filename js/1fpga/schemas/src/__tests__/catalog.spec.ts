import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { Catalog } from '../catalog';

describe('catalog', () => {
  test('works with nothing', () => {
    Catalog.parse({
      name: 'Test Catalog',
      uniqueName: 'test',
      version: '1',
    });
  });

  test.failing('fails with no fields', () => {
    Catalog.parse({});
  });

  test.failing.each([
    '',
    '1',
    '2',
    'So very very very very long long long more than sixty four characters whawheee',
  ])('fails with an invalid name (%s)', name => {
    Catalog.parse({ name, version: '1' });
  });

  test.failing.each(['', '##', 'a###', [], {}, false, null])(
    'fails with an invalid version (%s)',
    version => {
      Catalog.parse({ name: 'Test Catalog', version });
    },
  );

  test('Works with 1FPGA catalog', async () => {
    const json = await fs.readFile(path.join(__dirname, './testdata/catalog.json'), {
      encoding: 'utf-8',
    });

    Catalog.parse(JSON.parse(json));
  });
});
