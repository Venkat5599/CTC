"use client";

import Link from "next/link";
import type { VerifiedFact } from "@vouch/sdk";
import { factById } from "@vouch/schemas";

import { Button, Field, Mono, SectionLabel, StatusBadge } from "@/components/dashboard/primitives";
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
    <article className="rounded-xl border border-border bg-card-secondary">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <SectionLabel className="mb-1">Verified proof</SectionLabel>
          <h2 className="text-[16px] font-medium text-foreground">
            {definition?.label ?? "Unknown fact type"}
          </h2>
        </div>
        <StatusBadge status="verified" />
      </header>

      <dl className="px-5 py-1">
        <Field label="Source chain">Ethereum Sepolia</Field>
        <Field label="Block">
          <span className="font-mono tabular-nums">{String(fact.blockNumber)}</span>
        </Field>
        <Field label="Transaction">
          <Mono value={fact.txHash} />
        </Field>
        <Field label="Log index">
          <span className="font-mono tabular-nums">{fact.logIndex}</span>
        </Field>
        <Field label="Event">{definition?.eventSignature ?? "Not recorded"}</Field>
        <Field label="Emitter">
          <Mono value={fact.emitter} />
        </Field>
        <Field label="Subject">
          <Mono value={fact.subject} />
        </Field>
        <Field label="Payload hash">
          <Mono value={fact.payloadHash} />
        </Field>
        <Field label="Attestation">Verified by Attestcoin</Field>
        <Field label="Creditcoin">
          Recorded {fact.verifiedAt.toISOString().slice(0, 10)}
        </Field>
      </dl>

      <footer className="flex flex-wrap gap-2 border-t border-border px-5 py-4">
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
    <p className="mt-4 max-w-[68ch] text-[12px] leading-relaxed text-muted-foreground">
      A proof establishes that this event happened. It says nothing about what
      did not happen: Vouch can prove a repayment and can never prove the absence
      of a liquidation, so an address with no proofs is unknown rather than
      clean.{" "}
      <Link
        href="https://github.com/Venkat5599/CTC/blob/master/docs/security/assumptions.md"
        className="underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
      >
        Assumptions in full
      </Link>
      .
    </p>
  );
}
