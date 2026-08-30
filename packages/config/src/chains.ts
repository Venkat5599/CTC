/**
 * Chain keys, precompiles and addresses.
 *
 * THE SINGLE MOST DANGEROUS CONSTANT IN THIS REPO IS `chainKey`.
 *
 * It is NOT an EVM chainId. Attestcoin maintains its own key space, and the
 * mapping differs per Creditcoin network: on CC3 Testnet, key 1 is Sepolia and
 * key 3 is Ethereum mainnet, while on CC3 Mainnet key 1 is Ethereum mainnet.
 * Passing a chainId where a chainKey is expected does not throw. It silently
 * proves facts about a different chain, and "silently" is the whole problem --
 * a testnet faucet transaction would be credited as real repayment history and
 * nothing anywhere would complain.
 *
 * So the two are given incompatible branded types below. The compiler will not
 * let a chainId reach a chainKey parameter, which turns a class of silent
 * production bug into a build failure.
 */

/** Attestcoin's key space. Never an EVM chainId. */
export type ChainKey = number & { readonly __brand: 'ChainKey' };

/** An EVM chainId. Never an Attestcoin chain key. */
export type ChainId = number & { readonly __brand: 'ChainId' };

const asChainKey = (n: number): ChainKey => n as ChainKey;
const asChainId = (n: number): ChainId => n as ChainId;

/** Which Creditcoin network the chain-key mapping belongs to. */
export type CreditcoinNetwork = 'cc3-testnet' | 'cc3-mainnet';

export interface SourceChain {
  name: string;
  chainKey: ChainKey;
  chainId: ChainId;
  /** Where the indexer reads logs from. */
  rpcEnvVar: string;
  /** Whether facts proven from this chain represent real economic activity. */
  isProductionSource: boolean;
}

/**
 * CC3 Testnet key mapping.
 *
 * Verified against the ChainInfo precompile before deployment, never taken from
 * memory. If this table is wrong, everything above it is wrong in a way tests
 * cannot catch, because the mock precompile happily accepts any key.
 */
export const CC3_TESTNET_SOURCES = {
  sepolia: {
    name: 'Ethereum Sepolia',
    chainKey: asChainKey(1),
    chainId: asChainId(11_155_111),
    rpcEnvVar: 'ETH_SEPOLIA_RPC',
    isProductionSource: false,
  },
  ethereum: {
    name: 'Ethereum Mainnet',
    chainKey: asChainKey(3),
    chainId: asChainId(1),
    rpcEnvVar: 'ETH_MAINNET_RPC',
    isProductionSource: true,
  },
} as const satisfies Record<string, SourceChain>;

/**
 * CC3 Mainnet key mapping.
 *
 * Note that mainnet Ethereum is key 1 here and key 3 on testnet. This is exactly
 * the collision the branded type exists to survive: the same number means a
 * different chain depending on which Creditcoin network you are on, so a
 * constant copied between environments is a silent chain swap.
 */
export const CC3_MAINNET_SOURCES = {
  ethereum: {
    name: 'Ethereum Mainnet',
    chainKey: asChainKey(1),
    chainId: asChainId(1),
    rpcEnvVar: 'ETH_MAINNET_RPC',
    isProductionSource: true,
  },
} as const satisfies Record<string, SourceChain>;

export function sourcesFor(network: CreditcoinNetwork): Record<string, SourceChain> {
  return network === 'cc3-testnet' ? CC3_TESTNET_SOURCES : CC3_MAINNET_SOURCES;
}

/**
 * Resolve a chain key for a source on a given Creditcoin network.
 *
 * Throws rather than defaulting. A missing mapping means the caller is about to
 * trust a chain nobody configured, and guessing would be the worst possible
 * recovery.
 */
export function chainKeyFor(network: CreditcoinNetwork, source: string): ChainKey {
  const chain = sourcesFor(network)[source];
  if (!chain) {
    throw new Error(
      `No chainKey mapping for source "${source}" on ${network}. ` +
        `Known sources: ${Object.keys(sourcesFor(network)).join(', ')}. ` +
        `chainKey is Attestcoin's key space and differs per network -- do not guess it.`,
    );
  }
  return chain.chainKey;
}

// ---------------------------------------------------------------------------
// Creditcoin
// ---------------------------------------------------------------------------

export const CREDITCOIN_TESTNET = {
  id: 102_031,
  name: 'Creditcoin CC3 Testnet',
  nativeCurrency: { name: 'Creditcoin', symbol: 'CTC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.cc3-testnet.creditcoin.network'] } },
  blockExplorers: {
    default: { name: 'Creditcoin Explorer', url: 'https://creditcoin-testnet.blockscout.com' },
  },
  testnet: true,
} as const;

// ---------------------------------------------------------------------------
// Precompiles
// ---------------------------------------------------------------------------

/**
 * Attestcoin Block Prover. Proves a transaction was INCLUDED in a block
 * belonging to the confirmed source chain -- and nothing else. It does not check
 * receipt status and it does not establish who emitted a log, which is why
 * S1 and S2 exist above it.
 */
export const BLOCK_PROVER_PRECOMPILE = '0x0000000000000000000000000000000000000FD2' as const;

/** Chain info. Authoritative source for chain-key mappings at runtime. */
export const CHAIN_INFO_PRECOMPILE = '0x0000000000000000000000000000000000000fd3' as const;

/** Attestcoin proof-builder API, CC3 Testnet. */
export const PROOF_BUILDER_URL_TESTNET =
  'https://proof-gen-api.cc3-testnet.creditcoin.network' as const;

// ---------------------------------------------------------------------------
// Protocol limits
// ---------------------------------------------------------------------------

/** Claims that may share one continuity proof. */
export const MAX_BATCH_SIZE = 10;

/** Source-chain span one continuity proof covers. */
export const CONTINUITY_WINDOW_BLOCKS = 1000n;

/**
 * Cap on continuity roots accepted by the registry.
 *
 * Sparse checkpoints run one per 1000 blocks, so proving old history needs
 * ~1000 roots; this allows headroom above that. The cap exists because
 * continuity length drives verification gas linearly and is attacker-supplied,
 * which makes an unbounded array a cheap way to burn a submitter's gas.
 */
export const MAX_CONTINUITY_ROOTS = 1200;

/** Practical provability ceiling for a source transaction, in bytes. */
export const MAX_TX_BYTES = 500_000;

/**
 * Reorg backoff before a source block is considered final enough to prove.
 *
 * A reorged-away fact is not a security problem -- the precompile would refuse
 * to prove it, because the block is no longer part of the confirmed chain -- but
 * it is a wasted proof, and proofs are the expensive resource.
 */
export const SOURCE_CONFIRMATIONS = 64n;

// ---------------------------------------------------------------------------
// Deployed addresses
// ---------------------------------------------------------------------------

export interface DeployedAddresses {
  registry: `0x${string}` | null;
  passport: `0x${string}` | null;
  credit: `0x${string}` | null;
  feeTier: `0x${string}` | null;
  access: `0x${string}` | null;
}

/**
 * Filled in after deployment. Null means not yet deployed, and every consumer
 * should treat null as "unavailable" rather than substituting a zero address,
 * which would read as a contract that exists and answers false to everything.
 */
export const DEPLOYED: Record<CreditcoinNetwork, DeployedAddresses> = {
  'cc3-testnet': {
    registry: null,
    passport: null,
    credit: null,
    feeTier: null,
    access: null,
  },
  'cc3-mainnet': {
    registry: null,
    passport: null,
    credit: null,
    feeTier: null,
    access: null,
  },
};

export function requireDeployed(
  network: CreditcoinNetwork,
  contract: keyof DeployedAddresses,
): `0x${string}` {
  const address = DEPLOYED[network][contract];
  if (!address) {
    throw new Error(
      `${contract} is not deployed on ${network}. Run Deploy.s.sol and record the address in @vouch/config.`,
    );
  }
  return address;
}
