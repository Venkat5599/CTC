"use client";

import Link from "next/link";
import type { VerifiedFact } from "@vouch/sdk";
import { factById } from "@vouch/schemas";

import { KeyValue } from "@/components/dashboard/data";
import { Button, Mono } from "@/components/dashboard/primitives";
import { explorerUrl, sourceExplorerUrl } from "@/lib/contracts";

/**
 * A single proof, in full.
 *
 * Reads like a receipt rather than a card: every field the registry stored,
 * labelled, with the technical values in monospace so a hash is scannable
 * character by character.
 *
 * Both explorer links are here on purpose. A registry that asked to be believed
 * would show a green tick and stop; this shows the source transaction on
 * Sepolia and the verification on Creditcoin so anyone can open both and
 * confirm they describe the same event.
 */
export function ProofDetail({ fact }: { fact: VerifiedFact }) {
  const definition = factById(fact.factType);

  return (
    <article>
      <dl>
        <KeyValue label="Fact type">{definition?.label ?? "Unknown fact type"}</KeyValue>
        <KeyValue label="Source chain">Ethereum Sepolia</KeyValue>
        <KeyValue label="Block">
          <span className="font-mono tabular-nums">{String(fact.blockNumber)}</span>
        </KeyValue>
        <KeyValue label="Transaction">
          <Mono value={fact.txHash} />
        </KeyValue>
        <KeyValue label="Log index">
          <span className="font-mono tabular-nums">{fact.logIndex}</span>
        </KeyValue>
        <KeyValue label="Event">{definition?.eventSignature ?? "Not recorded"}</KeyValue>
        <KeyValue label="Emitter">
          <Mono value={fact.emitter} />
        </KeyValue>
        <KeyValue label="Subject">
          <Mono value={fact.subject} />
        </KeyValue>
        <KeyValue label="Payload hash">
          <Mono value={fact.payloadHash} />
        </KeyValue>
        <KeyValue label="Attestation">Verified by Attestcoin</KeyValue>
        <KeyValue label="Creditcoin">
          Recorded {fact.verifiedAt.toISOString().slice(0, 10)}
        </KeyValue>
      </dl>

      <footer className="flex flex-wrap gap-2 border-t border-white/[0.06] px-6 py-4">
        <Button href={sourceExplorerUrl(fact.txHash)} variant="secondary">
          View source transaction
        </Button>
        <Button href={explorerUrl("tx", fact.factId)} variant="secondary">
          View on Creditcoin
        </Button>
      </footer>
    </article>
  );
}

/**
 * The honest limitation, shown where a proof is being read.
 *
 * A reader looking at one verified fact is exactly the person most likely to
 * over-read it, so the caveat belongs here rather than only in the docs.
 */
export function ProofCaveat() {
  return (
    <p className="max-w-[70ch] px-1 text-[12px] leading-relaxed text-[var(--vouch-text-muted)]">
      A proof establishes that this event happened. It says nothing about what
      did not happen: Vouch can prove a repayment and can never prove the absence
      of a liquidation, so an address with no proofs is unknown rather than
      clean.{" "}
      <Link
        href="https://github.com/Venkat5599/CTC/blob/master/docs/security/assumptions.md"
        className="underline decoration-white/20 underline-offset-4 transition-colors hover:text-[var(--vouch-text)]"
      >
        Assumptions in full
      </Link>
      .
    </p>
  );
}
