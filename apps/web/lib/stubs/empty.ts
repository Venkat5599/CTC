/**
 * Stub for optional wallet-SDK dependencies that are never executed.
 *
 * RainbowKit bundles Coinbase Wallet SDK, which supports x402 payments through
 * `@x402/*` packages it imports and treats as optional. Those packages are not
 * installed and never will be -- Vouch does not take payments through a wallet
 * -- but Turbopack resolves the import graph statically and fails the build on
 * modules it cannot find, even inside a branch that never runs.
 *
 * Every export below throws. If any of this is ever genuinely reached, the
 * error says exactly what happened instead of surfacing as an undefined
 * somewhere further down the stack.
 */

function unreachable(name: string): never {
  throw new Error(
    `Optional x402 payment module "${name}" was called. Vouch does not use x402; this stub exists only to satisfy Turbopack's static resolution of Coinbase Wallet SDK's optional imports.`,
  );
}

export const toClientEvmSigner = () => unreachable("toClientEvmSigner");
export const x402Client = () => unreachable("x402Client");
export const registerExactEvmScheme = () => unreachable("registerExactEvmScheme");
export const registerExactSvmScheme = () => unreachable("registerExactSvmScheme");
export const UptoEvmScheme = () => unreachable("UptoEvmScheme");
export const ExactSvmScheme = () => unreachable("ExactSvmScheme");
export const fromCdpSmartWallet = () => unreachable("fromCdpSmartWallet");
export const cdpSolanaAccountToSvmSigner = () => unreachable("cdpSolanaAccountToSvmSigner");

export default {};
