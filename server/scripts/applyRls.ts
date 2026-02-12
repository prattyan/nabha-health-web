import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { prisma } from '../src/db.js';

function splitSqlStatements(sql: string): string[] {
  // Simple splitter: assumes no semicolons inside $$ blocks.
  return sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => (s.endsWith(';') ? s : `${s};`));
}

async function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const sqlPath = path.join(here, '..', 'prisma', 'rls.sql');
  const sql = readFileSync(sqlPath, 'utf8');

  const statements = splitSqlStatements(sql);
  for (const stmt of statements) {
    // DDL requires unsafe since Prisma parameterization is for values.
    // We control this file in-repo.
    await prisma.$executeRawUnsafe(stmt);
  }

  // eslint-disable-next-line no-console
  console.log(`Applied ${statements.length} RLS statements`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
