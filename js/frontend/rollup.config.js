import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import del from 'rollup-plugin-delete';

import * as child_process from 'node:child_process';

import codegen from './rollup/rollup-plugin-codegen.js';
import constants from './rollup/rollup-plugin-consts.js';
import dbMigrations from './rollup/rollup-plugin-db-migrations.js';
import {
  transformCommonTags,
  transformTaggedTemplate,
} from './rollup/rollup-plugin-template-literals.js';

const production = !('NODE_ENV' in process.env) || process.env.NODE_ENV === 'production';

const gitRev = child_process
  .execSync('git describe --all --always --dirty')
  .toString()
  .trim()
  .replace(/^.*\//, '');

export default {
  input: 'src/main.ts',
  output: {
    dir: 'dist/',
    format: 'es',
    sourcemap: !production,
    hoistTransitiveImports: false,
  },
  plugins: [
    del({ targets: 'dist/*' }),
    codegen(),
    dbMigrations(),
    nodeResolve({
      preferBuiltins: false,
    }),
    constants({
      environment: process.env.NODE_ENV,
      production,
      revision: gitRev,
    }),
    typescript({
      tsconfig: './tsconfig.json',
      exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts', '*.config.ts'],
      compilerOptions: {
        declaration: !production,
      },
    }),
    json({}),
    commonjs({
      extensions: ['.js', '.ts', '.cjs'],
      transformMixedEsModules: true,
    }),
    // Remove tagged template in production only.
    ...(production
      ? [
          transformTaggedTemplate({
            tagsToProcess: ['sql', 'sql1', 'sql2', 'sql3', 'sql4', 'sql5', 'sql6', 'sql7'],
            transformer: sql => {
              return sql.replace(/\n/g, ' ').replace(/\s\s+/g, ' ');
            },
          }),
          transformCommonTags('oneLine'),
          transformCommonTags('source'),
          transformCommonTags('stripIndent'),
          transformCommonTags('stripIndents'),
        ]
      : []),
    [
      ...(production
        ? [
            terser({
              compress: {
                arguments: true,
                ecma: 2020,
                module: true,
                passes: 2,
                pure_new: true,
                unsafe: true,
                unsafe_arrows: true,
                unsafe_comps: true,
                unsafe_math: true,
              },
              ecma: 2020,
              mangle: true,
            }),
          ]
        : []),
    ],
  ],
  external: [/^1fpga:/],
  onLog(level, log, handler) {
    if (log.code === 'CIRCULAR_DEPENDENCY') {
      // Show as warning.
      handler('warn', log);
    } else if (level === 'warn') {
      // Warnings are errors.
      handler('error', log);
    } else {
      handler(level, log);
    }
  },
};
