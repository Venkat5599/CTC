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
import { createPublicClient, defineChain, http as httpTransport, parseAbi } from 'viem';

import { VouchRegistryListener } from './listeners/vouch-registry';
import { CreditcoinListener } from './listeners/creditcoin';
import { processFacts, type FactReader } from './processors/facts';
import { isDatabaseReachable } from './database/client';

/// `getFact` only. The mirror reads the canonical record and never writes; it
/// holds no authority over the registry beyond a view call.
const REGISTRY_ABI = parseAbi([
  'function getFact(bytes32 factId) view returns ((bytes32 factId, uint64 sourceChain, uint64 blockNumber, bytes32 txHash, uint32 logIndex, address subject, address emitter, bytes32 factType, bytes32 payloadHash, uint256 value, uint64 verifiedAt))',
]);

/// An unset fact returns a zeroed struct rather than reverting, so the id field
/// is what distinguishes "absent" from "present". Checking `value` or `emitter`
/// instead would misread a legitimate zero-value fact as missing.
const ZERO_FACT_ID = `0x${'0'.repeat(64)}` as const;

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

  // Reads the canonical record for a factId. Every column the FactVerified
  // event does not carry -- source chain, block, txHash, logIndex, emitter,
  // payloadHash -- exists only here, and `emitter` is the S2 field, so a
  // placeholder is not an acceptable substitute for a failed read.
  const readFact: FactReader = async (factId) => {
    const fact = await client.readContract({
      address: registry,
      abi: REGISTRY_ABI,
      functionName: 'getFact',
      args: [factId as `0x${string}`],
    });

    if (fact.factId === ZERO_FACT_ID) return null;

    return {
      sourceChainKey: Number(fact.sourceChain),
      blockNumber: fact.blockNumber,
      txHash: fact.txHash,
      logIndex: Number(fact.logIndex),
      emitter: fact.emitter,
      payloadHash: fact.payloadHash,
      verifiedAt: new Date(Number(fact.verifiedAt) * 1000),
    };
  };

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
        const result = await processFacts(facts, readFact);
        console.log(
          `[indexer] ${result.written} written, ${result.alreadyPresent} already present` +
            (result.unresolved > 0
              ? `, ${result.unresolved} unresolved (registry did not return them; retried next pass)`
              : ''),
        );
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
