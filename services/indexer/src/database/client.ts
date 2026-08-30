/**
 * Prisma client.
 *
 * A single instance per process, reused. Node's module cache normally makes that
 * automatic, but a dev server that hot-reloads re-evaluates modules without
 * tearing down the process, and a fresh PrismaClient per reload exhausts the
 * Postgres connection pool within a few saves. The global stash below is the
 * standard guard against that, and it is deliberately dev-only: in production a
 * module-scoped constant is correct and a global is not.
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { vouchPrisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.vouchPrisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.vouchPrisma = prisma;
}

/**
 * uint256 values are stored as decimal strings, because they exceed every native
 * numeric type Postgres and JavaScript offer. These two helpers are the only
 * sanctioned crossing of that boundary -- doing it inline invites a `Number()`
 * somewhere, which silently loses precision above 2^53 and produces a wrong
 * balance rather than an error.
 */
export function toAmountString(value: bigint): string {
  return value.toString();
}

export function fromAmountString(value: string): bigint {
  return BigInt(value);
}

/**
 * Addresses are stored lowercase so that lookups are exact-match rather than
 * case-insensitive comparisons. Checksummed input from a wallet and lowercase
 * input from a log are the same address, and the database should not have an
 * opinion about which spelling arrived first.
 */
export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Liveness probe backing `/health`. Deliberately a real query rather than a
 * connection check: a pool that hands out a dead connection reports healthy
 * until something tries to use it.
 */
export async function isDatabaseReachable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
