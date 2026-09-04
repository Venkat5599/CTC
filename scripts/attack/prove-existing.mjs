/**
 * Prove an ALREADY-EMITTED forged event, then submit the identical bytes to
 * both consumers.
 *
 * Split out from forge-fact.mjs for one reason: that script emits and proves in
 * the same run, and the proof builder cannot prove a block that has not been
 * attested yet. Emitting and proving are therefore minutes apart in practice,
 * so the emit is done separately and this takes the transaction hash.
 */
import { createPublicClient, createWalletClient, defineChain, http, keccak256, parseAbi, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const TX = process.argv[2];
if (!TX) { console.error('usage: node prove-existing.mjs <sepolia-tx-hash>'); process.exit(1); }

const CHAIN_KEY = 1;
const PROVER = 'https://proof-gen-api.cc3-testnet.creditcoin.network';
const AAVE_REPAYMENT = keccak256(toHex('AAVE_REPAYMENT'));
const REPAY_TOPIC = keccak256(toHex('Repay(address,address,address,uint256,bool)'));
const AAVE_POOL = '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951';

const cc3 = defineChain({ id: 102031, name: 'CC3', nativeCurrency: { name: 'CTC', symbol: 'CTC', decimals: 18 }, rpcUrls: { default: { http: ['https://rpc.cc3-testnet.creditcoin.network'] } } });
const sep = createPublicClient({ transport: http(env.ETH_SEPOLIA_RPC) });
const ccPub = createPublicClient({ chain: cc3, transport: http('https://rpc.cc3-testnet.creditcoin.network') });
const account = privateKeyToAccount(env.CREDITCOIN_PRIVATE_KEY);
const ccWallet = createWalletClient({ account, chain: cc3, transport: http('https://rpc.cc3-testnet.creditcoin.network') });

const REGISTRY_ABI = parseAbi([
  'function submitBatch((bytes32,bytes32[]) continuity, (uint64,uint64,bytes32,bytes32,uint32,bytes,bytes32,(bytes32,bool)[])[] claims) returns (uint256)',
  'function hasProof(address subject, bytes32 factType) view returns (bool)',
]);
const NAIVE_ABI = parseAbi([
  'function submit((bytes32,bytes32[]) continuity, (uint64,uint64,bytes32,bytes32,uint32,bytes,bytes32,(bytes32,bool)[]) claim) returns (address, uint256)',
  'function hasProof(address subject, bytes32 factType) view returns (bool)',
  'function proofValue(address subject, bytes32 factType) view returns (uint256)',
]);

const receipt = await sep.getTransactionReceipt({ hash: TX });
const idx = receipt.logs.findIndex((l) => l.topics[0] === REPAY_TOPIC);
const log = receipt.logs[idx];
const subject = `0x${log.topics[2].slice(-40)}`;

console.log('S2 LIVE — a valid proof of a forged event');
console.log('='.repeat(64));
console.log(`  source tx     ${TX}`);
console.log(`  block         ${receipt.blockNumber}`);
console.log(`  status        ${receipt.status}   <- it really succeeded`);
console.log(`  topic0        ${log.topics[0]}`);
console.log(`  aave topic0   ${REPAY_TOPIC}`);
console.log(`  identical     ${log.topics[0] === REPAY_TOPIC}`);
console.log(`  emitter       ${log.address}   <- the only thing that is wrong`);
console.log(`  aave pool     ${AAVE_POOL.toLowerCase()}`);
console.log(`  subject       ${subject}`);

console.log('\n1. Asking the REAL Attestcoin prover...');
const { service } = await import('@gluwa/usc-sdk/dist/proof-provider/index.js');
const result = await new service.ProofBuilder(CHAIN_KEY, PROVER, 120_000).getProof(TX);
if (!result.success || !result.data) {
  console.error(`   REFUSED: ${result.error}`);
  console.error('   S2 stays `defended by test only`.');
  process.exit(2);
}
const { txBytes, continuityProof, merkleProof, headerNumber } = result.data;
console.log(`   PROVEN. continuity roots ${continuityProof.roots.length}, tx bytes ${txBytes.length}`);
console.log('   The proof is genuine. Attestcoin did its job correctly.');

const continuity = [continuityProof.lowerEndpointDigest, continuityProof.roots];
const claim = [BigInt(CHAIN_KEY), BigInt(headerNumber), TX, AAVE_REPAYMENT, idx, txBytes, merkleProof.root, merkleProof.siblings.map((s) => [s.hash, s.isLeft])];
const fingerprint = keccak256(txBytes);
console.log(`   payload fingerprint ${fingerprint}`);

console.log('\n2. Submitting to the NAIVE consumer (checks topic0 only)...');
try {
  const h = await ccWallet.writeContract({ address: env.NAIVE_CONSUMER_ADDRESS, abi: NAIVE_ABI, functionName: 'submit', args: [continuity, claim] });
  const r = await ccPub.waitForTransactionReceipt({ hash: h });
  console.log(`   tx ${h}  status ${r.status}`);
  const [has, val] = await Promise.all([
    ccPub.readContract({ address: env.NAIVE_CONSUMER_ADDRESS, abi: NAIVE_ABI, functionName: 'hasProof', args: [subject, AAVE_REPAYMENT] }),
    ccPub.readContract({ address: env.NAIVE_CONSUMER_ADDRESS, abi: NAIVE_ABI, functionName: 'proofValue', args: [subject, AAVE_REPAYMENT] }),
  ]);
  console.log(`   ACCEPTED. hasProof=${has}  credited=${Number(val) / 1e6} USDC that never moved.`);
} catch (e) { console.log(`   naive rejected unexpectedly: ${e.shortMessage ?? e.message}`); }

console.log('\n3. Submitting the IDENTICAL bytes to VouchRegistry...');
console.log(`   fingerprint unchanged: ${keccak256(txBytes) === fingerprint}`);
try {
  const h = await ccWallet.writeContract({ address: env.VOUCH_REGISTRY_ADDRESS, abi: REGISTRY_ABI, functionName: 'submitBatch', args: [continuity, [claim]] });
  await ccPub.waitForTransactionReceipt({ hash: h });
  console.log(`   ACCEPTED — the S2 claim is REFUTED. Withdraw it from every surface.`);
  process.exit(3);
} catch (e) {
  const msg = e.shortMessage ?? e.message;
  console.log(`   REVERTED: ${msg.split('\n')[0]}`);
  const has = await ccPub.readContract({ address: env.VOUCH_REGISTRY_ADDRESS, abi: REGISTRY_ABI, functionName: 'hasProof', args: [subject, AAVE_REPAYMENT] });
  console.log(`   registry hasProof=${has}  <- no standing granted`);
}

console.log('\n' + '='.repeat(64));
console.log('Same bytes. Opposite outcomes. Only one contract asked who authored it.');
