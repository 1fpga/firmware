import { stripIndent } from 'common-tags';
import * as fs from 'fs';
import { globSync } from 'glob';
import * as path from 'path';

/**
 * Simplify the SQL content by removing comments and extra whitespace.
 * @param sql {string} The SQL content to simplify.
 * @returns {*}
 */
function simplifySql(sql) {
  return sql
    .split('\n')
    .map(x => x.replace(/--.*?$/, '').trim())
    .filter(x => x.length > 0)
    .join(' ')
    .replace(/\s\s+/g, ' ');
}

export default function (baseDir = process.cwd()) {
  return {
    name: '1fpga-codegen',
    async load(id) {
      if (id.startsWith('@:migrations')) {
        const files = globSync('migrations/**/up.sql');
        let output = '{';
        for (const file of files) {
          const content = fs.readFileSync(file, 'utf8');
          const version = path.basename(path.dirname(file));
          let migrationUpPath = path.join(path.dirname(file), 'migration.ts');
          if (!fs.existsSync(migrationUpPath)) {
            migrationUpPath = undefined;
          }

          output += stripIndent`
            ${JSON.stringify(version)}: {
              up: {
                sql: ${JSON.stringify(simplifySql(content))},
                ${
                  migrationUpPath
                    ? `
                      post: async (a, b, c, d, e) => {
                        await ((await import(${JSON.stringify(migrationUpPath)})).post?.(a, b, c, d, e));
                      },
                      pre: async (a, b, c, d, e) => {
                        await ((await import(${JSON.stringify(migrationUpPath)})).pre?.(a, b, c, d, e));
                      }
                    `
                    : ''
                }
              },
            },
          `;
        }
        output += '}';

        return `
          export const migrations = ${output};
        `;
      }
      return null;
    },
    resolveId(source) {
      if (source.startsWith('@:migrations')) {
        return source;
      }
      return null;
    },
  };
}
