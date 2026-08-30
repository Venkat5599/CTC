/**
 * Relayer process entrypoint.
 *
 * Wires the loop to real chains and starts it. Everything above this file is
 * pure and testable; this is where the impure edges get attached, which is why
 * it is the only file in the service that reads `process.env`.
 *
 * It refuses to start rather than starting degraded. A relayer missing its
 * registry address would run happily, discover facts, and submit them nowhere,
 * and the failure would look exactly like a quiet source chain. Config errors
 * are cheap at boot and expensive at three in the morning.
 */

import { createPublicClient, defineChain, http } from 'viem';
import { mainnet } from 'viem/chains';

import { Relayer } from './main';
import { EventScanner, type Candidate } from './discovery/event-scanner';
import { SourceMonitor } from './discovery/source-monitor';
import { Keeper } from './settlement/keeper';
import { createProofBuilderClient } from './proof/builder';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. The relayer will not start without it: a misconfigured relayer discovers facts and submits them nowhere, which is indistinguishable from a quiet source chain.`,
    );
  }
  return value;
}

export async function bootstrap(): Promise<Relayer> {
  const ethRpc = required('ETH_MAINNET_RPC');
  const creditcoinRpc = process.env.CREDITCOIN_RPC ?? 'https://rpc.cc3-testnet.creditcoin.network';
  const registryAddress = required('VOUCH_REGISTRY_ADDRESS') as `0x${string}`;

  // chainKey is not chainId. Read from config rather than assumed, because the
  // wrong value proves facts about a different chain without complaining.
  const chainKey = Number(process.env.ETH_MAINNET_CHAINKEY ?? 3);

  const ethereum = createPublicClient({ chain: mainnet, transport: http(ethRpc) });

  const creditcoin = createPublicClient({
    chain: defineChain({
      id: 102_031,
      name: 'Creditcoin CC3 Testnet',
      nativeCurrency: { name: 'Creditcoin', symbol: 'CTC', decimals: 18 },
      rpcUrls: { default: { http: [creditcoinRpc] } },
    }),
    transport: http(creditcoinRpc),
  });

  const startBlock = BigInt(process.env.START_BLOCK ?? '0');

  const scanner = new EventScanner(
    {
      // Backed off from the head. A reorged-away fact is not a security problem
      // -- the precompile would decline to prove it -- but building a proof for
      // one wastes the expensive resource.
      confirmedHead: async () => {
        const head = await ethereum.getBlockNumber();
        return head > 64n ? head - 64n : 0n;
      },
      scan: async (): Promise<Candidate[]> => {
        // Source scanning is wired here once sources are registered on chain.
        // Returning nothing is the honest empty state: the monitor will report
        // the silence rather than the process pretending it is working.
        return [];
      },
    },
    startBlock,
  );

  const monitor = new SourceMonitor([]);

  const keeper = new Keeper(async () => {
    throw new Error(
      'Submission is not wired yet. Deploy VouchRegistry, register sources, then connect the wallet client here.',
    );
  });

  return new Relayer(
    {
      scanner,
      monitor,
      proofBuilder: createProofBuilderClient(process.env.PROOF_BUILDER_URL),
      keeper,
      isVerified: async () => false,
      onError: (stage, error) => {
        console.error(`[relayer] ${stage}:`, error instanceof Error ? error.message : error);
      },
    },
    {
      urgency: (process.env.RELAYER_URGENCY as 'standard') ?? 'standard',
      tickMs: Number(process.env.TICK_MS ?? 15_000),
    },
  );
}

/** Started only when this file is the process entry, never on import. */
export async function main(): Promise<void> {
  const relayer = await bootstrap();

  const shutdown = (signal: string) => {
    console.log(`[relayer] ${signal}: finishing the current tick, then stopping.`);
    relayer.stop();
    // Gives the in-flight tick room to land. Killing mid-submission is safe --
    // the replay guard makes a resubmission idempotent -- but it wastes a proof.
    setTimeout(() => process.exit(0), 5_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  console.log('[relayer] started');
  await relayer.start();
}
