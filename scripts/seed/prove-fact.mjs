/**
 * Prove one real source-chain fact, end to end.
 *
 * Finds a genuine Aave repayment on Sepolia, asks the Attestcoin proof builder
 * for an inclusion proof, and submits it to VouchRegistry on CC3 Testnet.
 *
 * This is PRD M1, and it is the only script in the repo that touches all three
 * systems at once, so it is also the honest test of whether the architecture
 * works. Everything else runs against a mocked precompile.
 *
 * Deliberately proves someone ELSE's transaction. The point of a standing
 * registry is that history is proven, not asserted, and proving a repayment the
 * submitter had no hand in demonstrates that better than proving our own.
 *
 *   node scripts/seed/prove-fact.mjs
 */

import { createPublicClient, createWalletClient, defineChain, http, keccak256, parseAbi, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'node:fs';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const SEPOLIA_RPC = env.ETH_SEPOLIA_RPC;
const CREDITCOIN_RPC = env.CREDITCOIN_RPC ?? 'https://rpc.cc3-testnet.creditcoin.network';
const REGISTRY = env.VOUCH_REGISTRY_ADDRESS;
const KEY = env.CREDITCOIN_PRIVATE_KEY;
const PROVER = 'https://prover.cc3-testnet.creditcoin.network';

// chainKey is Attestcoin's key space, not chainId. On CC3 Testnet 1 is Sepolia.
const CHAIN_KEY = 1;

const AAVE_POOL_SEPOLIA = '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951';
const REPAY_TOPIC = keccak256(toHex('Repay(address,address,address,uint256,bool)'));
const AAVE_REPAYMENT = keccak256(toHex('AAVE_REPAYMENT'));

const REGISTRY_ABI = parseAbi([
  'function submitBatch((bytes32,bytes32[]) continuity, (uint64,uint64,bytes32,bytes32,uint32,bytes,bytes32,(bytes32,bool)[])[] claims) returns (uint256)',
  'function hasProof(address subject, bytes32 factType) view returns (bool)',
  'function proofCount(address subject, bytes32 factType) view returns (uint32)',
  'function totalProofs(address subject) view returns (uint32)',
]);

const creditcoinChain = defineChain({
  id: 102_031,
  name: 'Creditcoin CC3 Testnet',
  nativeCurrency: { name: 'Creditcoin', symbol: 'CTC', decimals: 18 },
  rpcUrls: { default: { http: [CREDITCOIN_RPC] } },
});

const sepolia = createPublicClient({ transport: http(SEPOLIA_RPC) });
const creditcoin = createPublicClient({ chain: creditcoinChain, transport: http(CREDITCOIN_RPC) });
const account = privateKeyToAccount(KEY);
const wallet = createWalletClient({ account, chain: creditcoinChain, transport: http(CREDITCOIN_RPC) });

// ---------------------------------------------------------------------------

async function findRepayment() {
  const head = await sepolia.getBlockNumber();

  // Walk backwards in windows. The proof builder needs the block attested, and
  // very recent blocks may not be yet, so starting a little back is pragmatic
  // rather than arbitrary.
  for (let offset = 2_000n; offset < 60_000n; offset += 8_000n) {
    const toBlock = head - offset;
    const fromBlock = toBlock - 8_000n;

    const logs = await sepolia.getLogs({
      address: AAVE_POOL_SEPOLIA,
      fromBlock,
      toBlock,
    });

    const repay = logs.find((l) => l.topics[0] === REPAY_TOPIC);
    if (repay) return repay;
  }

  throw new Error('No Aave Repay found on Sepolia in the searched range.');
}

async function main() {
  console.log('1. Finding a real Aave repayment on Sepolia...');
  const log = await findRepayment();

  // Subject is topic 2 (`user`), the borrower whose debt was cleared -- not
  // `repayer`, who may be a third party settling on their behalf.
  const subject = `0x${log.topics[2].slice(-40)}`;

  // eth_getLogs reports logIndex scoped to the BLOCK. The registry decodes a
  // RECEIPT, whose logs are numbered within that one transaction. Passing the
  // block-wide number reverts with LogIndexOutOfRange, and would be far worse if
  // it happened to land in range: it would prove the wrong log.
  const receipt = await sepolia.getTransactionReceipt({ hash: log.transactionHash });
  const receiptLogIndex = receipt.logs.findIndex((l) => l.logIndex === log.logIndex);
  if (receiptLogIndex < 0) throw new Error('Log not found in its own receipt.');

  console.log(`   tx           ${log.transactionHash}`);
  console.log(`   block        ${log.blockNumber}`);
  console.log(`   block log    ${log.logIndex}`);
  console.log(`   receipt log  ${receiptLogIndex}  <- what the registry wants`);
  console.log(`   subject      ${subject}`);

  console.log('\n2. Asking Attestcoin to prove it...');
  const { service } = await import('@gluwa/usc-sdk/dist/proof-provider/index.js');
  const builder = new service.ProofBuilder(CHAIN_KEY, PROVER, 120_000);

  const result = await builder.getProof(log.transactionHash);
  if (!result.success || !result.data) {
    throw new Error(`Proof builder refused: ${result.error ?? 'unknown'}`);
  }

  const { txBytes, continuityProof, merkleProof, headerNumber } = result.data;
  console.log(`   continuity roots ${continuityProof.roots.length}`);
  console.log(`   tx bytes         ${txBytes.length} chars`);

  console.log('\n3. Submitting to VouchRegistry on CC3 Testnet...');
  const hash = await wallet.writeContract({
    address: REGISTRY,
    abi: REGISTRY_ABI,
    functionName: 'submitBatch',
    args: [
      [continuityProof.lowerEndpointDigest, continuityProof.roots],
      [[
        BigInt(CHAIN_KEY),
        BigInt(headerNumber),
        log.transactionHash,
        AAVE_REPAYMENT,
        receiptLogIndex,
        txBytes,
        merkleProof.root,
        merkleProof.siblings.map((s) => [s.hash, s.isLeft]),
      ]],
    ],
  });

  console.log(`   tx ${hash}`);
  const submission = await creditcoin.waitForTransactionReceipt({ hash });
  console.log(`   status ${submission.status}  gas ${submission.gasUsed}`);

  if (submission.status !== 'success') throw new Error('Submission reverted.');

  console.log('\n4. Reading the fact back off chain...');
  const [proven, count, total] = await Promise.all([
    creditcoin.readContract({ address: REGISTRY, abi: REGISTRY_ABI, functionName: 'hasProof', args: [subject, AAVE_REPAYMENT] }),
    creditcoin.readContract({ address: REGISTRY, abi: REGISTRY_ABI, functionName: 'proofCount', args: [subject, AAVE_REPAYMENT] }),
    creditcoin.readContract({ address: REGISTRY, abi: REGISTRY_ABI, functionName: 'totalProofs', args: [subject] }),
  ]);

  console.log(`   hasProof     ${proven}`);
  console.log(`   proofCount   ${count}`);
  console.log(`   totalProofs  ${total}`);
  console.log(`\n   subject ${subject}`);
  console.log(`   https://creditcoin-testnet.blockscout.com/tx/${hash}`);
}

main().catch((error) => {
  console.error('\nFAILED:', error.shortMessage ?? error.message);
  process.exit(1);
});
