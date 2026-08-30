/**
 * Indexer process entrypoint.
 *
 * Polls the registry for verified facts and mirrors them into Postgres, and
 * serves a health endpoint so the container can be probed.
 *
 * Safe to restart at any moment. The cursor lives in the database and every
 * pass re-reads an overlap behind it, so a restart costs one duplicate page
 * rather than a missed fact.
 */

import { createServer } from 'node:http';
import { createPublicClient, defineChain, http as httpTransport } from 'viem';

import { VouchRegistryListener } from './listeners/vouch-registry';
import { CreditcoinListener } from './listeners/creditcoin';
import { processFacts } from './processors/facts';
import { isDatabaseReachable } from './database/client';

const PORT = Number(process.env.PORT ?? 8081);
const POLL_MS = Number(process.env.POLL_MS ?? 15_000);

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Refusing to start: an indexer with no registry address polls nothing and reports healthy, which is the worst of both.`,
    );
  }
  return value;
}

async function main(): Promise<void> {
  const rpc = process.env.CREDITCOIN_RPC ?? 'https://rpc.cc3-testnet.creditcoin.network';
  const registry = required('VOUCH_REGISTRY_ADDRESS') as `0x${string}`;

  const client = createPublicClient({
    chain: defineChain({
      id: 102_031,
      name: 'Creditcoin CC3 Testnet',
      nativeCurrency: { name: 'Creditcoin', symbol: 'CTC', decimals: 18 },
      rpcUrls: { default: { http: [rpc] } },
    }),
    transport: httpTransport(rpc),
  });

  const chain = new CreditcoinListener(client);
  const listener = new VouchRegistryListener(
    client,
    registry,
    BigInt(process.env.START_BLOCK ?? '0'),
  );

  let lastError: string | null = null;

  // Liveness only, deliberately. A probe that failed on a database blip would
  // get the process killed, which does not fix the database.
  const server = createServer((request, response) => {
    if (request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ status: 'ok', cursor: listener.position.toString() }));
      return;
    }

    if (request.url === '/ready') {
      void (async () => {
        const [database, health] = await Promise.all([isDatabaseReachable(), chain.health()]);
        const ready = database && health.reachable;
        response.writeHead(ready ? 200 : 503, { 'content-type': 'application/json' });
        response.end(
          JSON.stringify({
            status: ready ? 'ready' : 'not-ready',
            database,
            chain: health.reachable,
            cursor: listener.position.toString(),
            lastError,
          }),
        );
      })();
      return;
    }

    response.writeHead(404);
    response.end();
  });

  server.listen(PORT, '0.0.0.0');
  console.log(`[indexer] listening on ${PORT}`);

  let running = true;
  const stop = (signal: string) => {
    console.log(`[indexer] ${signal}: stopping`);
    running = false;
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', () => stop('SIGTERM'));
  process.on('SIGINT', () => stop('SIGINT'));

  while (running) {
    try {
      const facts = await listener.poll();
      if (facts.length > 0) {
        const result = await processFacts(facts);
        console.log(`[indexer] ${result.written} written, ${result.alreadyPresent} already present`);
      }
      lastError = null;
    } catch (error) {
      // Logged and swallowed. The cursor does not advance on failure, so the
      // next pass re-reads the same range; crashing would lose nothing but
      // would take the health endpoint down with it.
      lastError = error instanceof Error ? error.message.slice(0, 200) : String(error);
      console.error('[indexer] poll failed:', lastError);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

main().catch((error) => {
  console.error('[indexer] fatal:', error);
  process.exit(1);
});
