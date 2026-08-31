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

import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  keccak256,
  parseAbi,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';

import { Relayer } from './main';
import { EventScanner, type Candidate } from './discovery/event-scanner';
import { SourceMonitor, type MonitoredSource } from './discovery/source-monitor';
import { Keeper } from './settlement/keeper';
import { createProofBuilderClient } from './proof/builder';

/** Only what the relayer calls. A narrow ABI fails loudly on a real change. */
const REGISTRY_ABI = parseAbi([
  'function submitBatch((bytes32,bytes32[]) continuity, (uint64,uint64,bytes32,bytes32,uint32,bytes,bytes32,(bytes32,bool)[])[] claims) returns (uint256)',
  'function isVerified(bytes32 factId) view returns (bool)',
  'function registeredFactTypes() view returns (bytes32[])',
  'function getSource(bytes32 factType) view returns ((uint64,address,bytes32,bytes32,uint8,bool))',
]);

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
  const submitterKey = required('CREDITCOIN_PRIVATE_KEY') as `0x${string}`;

  // chainKey is not chainId. Read from config rather than assumed, because the
  // wrong value proves facts about a different chain without complaining.
  const chainKey = Number(process.env.ETH_MAINNET_CHAINKEY ?? 3);

  const ethereum = createPublicClient({ chain: mainnet, transport: http(ethRpc) });

  const creditcoinChain = defineChain({
    id: 102_031,
    name: 'Creditcoin CC3 Testnet',
    nativeCurrency: { name: 'Creditcoin', symbol: 'CTC', decimals: 18 },
    rpcUrls: { default: { http: [creditcoinRpc] } },
  });

  const creditcoin = createPublicClient({ chain: creditcoinChain, transport: http(creditcoinRpc) });

  // Pays gas and grants nothing. The registry reads every subject from the
  // proven log, so this account cannot claim standing for itself.
  const submitter = createWalletClient({
    account: privateKeyToAccount(submitterKey),
    chain: creditcoinChain,
    transport: http(creditcoinRpc),
  });

  // ---------------------------------------------------------------------
  // Sources, read FROM CHAIN rather than from a local list.
  //
  // The registry is the source of truth for what counts as a fact. A relayer
  // holding its own copy would drift the moment an admin registered a fourth
  // type, and it would drift silently -- scanning for events nobody accepts, or
  // missing events everybody does.
  // ---------------------------------------------------------------------
  const factTypes = await creditcoin.readContract({
    address: registryAddress,
    abi: REGISTRY_ABI,
    functionName: 'registeredFactTypes',
  });

  const sources = await Promise.all(
    factTypes.map(async (factType) => {
      const src = await creditcoin.readContract({
        address: registryAddress,
        abi: REGISTRY_ABI,
        functionName: 'getSource',
        args: [factType],
      });
      const [srcChainKey, emitter, topic0, , subjectTopicIndex, enabled] = src;
      return { factType, chainKey: Number(srcChainKey), emitter, topic0, subjectTopicIndex, enabled };
    }),
  );

  const active = sources.filter((s) => s.enabled && s.chainKey === chainKey);

  if (active.length === 0) {
    throw new Error(
      `No enabled sources for chainKey ${chainKey} on ${registryAddress}. Run ConfigureSources.s.sol before starting the relayer -- with none registered it would scan for nothing and report healthy.`,
    );
  }

  console.log(`[relayer] ${active.length} source(s) registered on chain`);

  const monitor = new SourceMonitor(
    active.map<MonitoredSource>((s) => ({
      factType: s.factType,
      emitter: s.emitter,
      chainKey: s.chainKey,
    })),
  );

  const scanner = new EventScanner(
    {
      // Backed off from the head. A reorged-away fact is not a security problem
      // -- the precompile would decline to prove it -- but building a proof for
      // one wastes the expensive resource.
      confirmedHead: async () => {
        const head = await ethereum.getBlockNumber();
        return head > 64n ? head - 64n : 0n;
      },

      scan: async ({ fromBlock, toBlock }): Promise<Candidate[]> => {
        const found: Candidate[] = [];

        for (const source of active) {
          const logs = await ethereum.getLogs({
            address: source.emitter,
            fromBlock,
            toBlock,
          });

          for (const log of logs) {
            if (log.topics[0] !== source.topic0) continue;
            if (log.blockNumber === null || log.logIndex === null) continue;

            // The subject comes from the topic the registry pinned. Reading it
            // from anywhere else would let the relayer choose whose standing
            // this becomes, which is exactly the authority it must not have.
            const subjectTopic = log.topics[source.subjectTopicIndex];
            if (subjectTopic === undefined) continue;

            found.push({
              chainKey: source.chainKey,
              blockNumber: log.blockNumber,
              txHash: log.transactionHash as `0x${string}`,
              // Receipt-wide, straight from the node. Recomputing it by
              // enumeration would name nothing on the source chain.
              logIndex: log.logIndex,
              factType: source.factType,
              subject: `0x${subjectTopic.slice(-40)}` as `0x${string}`,
            });
          }
        }

        return found.sort(byPosition);
      },
    },
    BigInt(process.env.START_BLOCK ?? '0'),
  );

  const keeper = new Keeper(async (payload) => {
    const { continuity, claims } = payload as {
      continuity: { lowerEndpointDigest: `0x${string}`; roots: `0x${string}`[] };
      claims: Array<Record<string, unknown>>;
    };

    const hash = await submitter.writeContract({
      address: registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'submitBatch',
      args: [
        [continuity.lowerEndpointDigest, continuity.roots],
        claims.map((c) => [
          c.chainKey,
          c.blockNumber,
          c.txHash,
          c.factType,
          c.logIndex,
          c.encodedTransaction,
          c.merkleRoot,
          c.siblings,
        ]),
      ] as never,
    });

    const receipt = await creditcoin.waitForTransactionReceipt({ hash });

    // A reverted submission is thrown rather than returned, so the keeper's
    // classifier decides whether it is permanent, transient, or somebody else
    // winning the race.
    if (receipt.status !== 'success') {
      throw new Error(`Submission reverted: ${hash}`);
    }

    return { txHash: hash, verifiedCount: claims.length, gasUsed: receipt.gasUsed };
  });

  return new Relayer(
    {
      scanner,
      monitor,
      proofBuilder: createProofBuilderClient(process.env.PROOF_BUILDER_URL),
      keeper,

      // Asked of the chain, not of a local cache. Spending a proof to re-prove
      // a fact already on chain is the most wasteful thing this loop can do.
      isVerified: async (claimKey) => {
        const [ck, block, txHash, factType, logIndex] = claimKey.split(':');
        const factId = factIdOf(
          Number(ck),
          BigInt(block!),
          txHash as `0x${string}`,
          factType as `0x${string}`,
          Number(logIndex),
        );
        return creditcoin.readContract({
          address: registryAddress,
          abi: REGISTRY_ABI,
          functionName: 'isVerified',
          args: [factId],
        });
      },

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

/** Mirrors ReplayGuard._factId: keccak(chainKey, blockNumber, txHash, factType, logIndex). */
function factIdOf(
  chainKey: number,
  blockNumber: bigint,
  txHash: `0x${string}`,
  factType: `0x${string}`,
  logIndex: number,
): `0x${string}` {
  // encodePacked ordering must match the contract exactly; a mismatch here
  // would make every isVerified check answer false and every batch re-prove
  // facts already on chain.
  const packed = [
    chainKey.toString(16).padStart(16, '0'),
    blockNumber.toString(16).padStart(16, '0'),
    txHash.slice(2),
    factType.slice(2),
    logIndex.toString(16).padStart(8, '0'),
  ].join('');

  return keccak256(`0x${packed}` as `0x${string}`);
}

function byPosition(a: Candidate, b: Candidate): number {
  if (a.blockNumber !== b.blockNumber) return a.blockNumber < b.blockNumber ? -1 : 1;
  if (a.txHash !== b.txHash) return a.txHash < b.txHash ? -1 : 1;
  return a.logIndex - b.logIndex;
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
