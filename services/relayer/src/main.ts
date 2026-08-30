/**
 * The relayer loop.
 *
 * Ethereum event -> discovery -> queue -> batch scheduler -> proof builder
 * -> Attestcoin -> Creditcoin.
 *
 * One pass of that pipeline per tick, run forever. Written as a loop with an
 * explicit tick rather than a set of independent timers because the stages are
 * strictly sequential: discovery feeds the queue, the queue feeds the scheduler,
 * and running them on separate schedules would only add ways for them to
 * disagree about what is in flight.
 *
 * The loop is crash-safe rather than crash-proof. Every durable decision lives
 * in Postgres and every submission is idempotent against the on-chain replay
 * guard, so the correct response to an unexpected failure is to let the process
 * die and start again. A relayer that tries to heroically recover in place is a
 * relayer whose state can diverge from the chain.
 */

import { BatchQueue, type QueuedJob } from './scheduler/queue';
import type { BatchUrgency } from './scheduler/deadline';
import { Keeper, type SettlementOutcome } from './settlement/keeper';
import { EventScanner, type Candidate, type ScanBackend } from './discovery/event-scanner';
import { SourceMonitor, type MonitoredSource } from './discovery/source-monitor';
import { buildSubmission, type ProofBuilderClient } from './proof/builder';

export interface RelayerDeps {
  scanner: EventScanner;
  monitor: SourceMonitor;
  proofBuilder: ProofBuilderClient;
  keeper: Keeper;
  /** Facts already on chain, so a proof is never spent re-proving one. */
  isVerified: (claimKey: string) => Promise<boolean>;
  /** Called for every outcome, so metrics and persistence stay out of the loop. */
  onOutcome?: (job: QueuedJob, outcome: SettlementOutcome) => void | Promise<void>;
  onError?: (stage: string, error: unknown) => void;
}

export interface RelayerOptions {
  tickMs?: number;
  sources?: readonly MonitoredSource[];
  /**
   * How long a batch may wait for company.
   *
   * `standard` is the right default for an unattended relayer: two minutes to
   * fill, then ship regardless. A deployment serving a live demo runs
   * `interactive` and pays roughly ten times the per-fact proof cost to answer
   * in fifteen seconds; a historical sweep runs `backfill` and fills every
   * batch completely because nobody is waiting.
   *
   * Configurable rather than fixed because the tradeoff is a deployment
   * decision, not a protocol one.
   */
  urgency?: BatchUrgency;
  maxAttempts?: number;
}

export class Relayer {
  private readonly queue: BatchQueue;
  private running = false;

  constructor(
    private readonly deps: RelayerDeps,
    private readonly options: RelayerOptions = {},
  ) {
    this.queue = new BatchQueue({
      urgency: options.urgency ?? 'standard',
      maxAttempts: options.maxAttempts,
    });
  }

  /**
   * One full pass. Exposed separately from `start` so tests can drive the
   * pipeline deterministically instead of waiting on a timer.
   */
  async tick(): Promise<{ discovered: number; shipped: number }> {
    let discovered = 0;
    let shipped = 0;

    // 1. Discovery. A failure here is not fatal: the cursor does not advance,
    //    so the next tick re-reads the same range.
    let candidates: Candidate[] = [];
    try {
      candidates = await this.deps.scanner.next();
      discovered = candidates.length;

      for (const candidate of candidates) {
        this.deps.monitor.record(candidate.factType, candidate.blockNumber);
      }
    } catch (error) {
      this.deps.onError?.('discovery', error);
    }

    // 2. Drop anything already on chain before it can cost a proof.
    const fresh: Candidate[] = [];
    for (const candidate of candidates) {
      const key = [
        candidate.chainKey,
        candidate.blockNumber,
        candidate.txHash,
        candidate.factType,
        candidate.logIndex,
      ].join(':');

      try {
        if (!(await this.deps.isVerified(key))) fresh.push(candidate);
      } catch (error) {
        // If the check itself fails, queue the claim anyway. The on-chain
        // replay guard is the real defence, and a wasted proof is cheaper than
        // a fact that never lands.
        this.deps.onError?.('verified-check', error);
        fresh.push(candidate);
      }
    }

    this.queue.enqueue(fresh);

    // 3. Ship whatever is full or past its deadline.
    for (const job of this.queue.ready()) {
      try {
        const payload = await buildSubmission(this.deps.proofBuilder, {
          chainKey: job.chainKey,
          windowStart: job.windowStart,
          windowEnd: job.windowEnd,
          claims: job.claims,
        });

        const outcome = await this.deps.keeper.settle(payload);
        await this.deps.onOutcome?.(job, outcome);

        if (outcome.kind === 'confirmed' || outcome.kind === 'already-verified') {
          // already-verified is a success. Someone else landed the fact first,
          // which is exactly what permissionless submission means.
          this.queue.complete(job.id);
          shipped += 1;
        } else if (outcome.kind === 'rejected') {
          // Permanent. Retrying burns a fresh proof to reach the same revert.
          this.queue.complete(job.id);
        } else {
          this.queue.fail(job.id, outcome.reason);
        }
      } catch (error) {
        this.queue.fail(job.id, error instanceof Error ? error.message : String(error));
        this.deps.onError?.('submission', error);
      }
    }

    return { discovered, shipped };
  }

  async start(): Promise<void> {
    this.running = true;
    const tickMs = this.options.tickMs ?? 15_000;

    while (this.running) {
      await this.tick();
      await new Promise((resolve) => setTimeout(resolve, tickMs));
    }
  }

  stop(): void {
    this.running = false;
  }

  /** Queue state, for the worker's /metrics and /ready endpoints. */
  snapshot() {
    return {
      pendingClaims: this.queue.pendingClaims,
      jobs: this.queue.size,
      stuck: this.queue.stuck().length,
      sources: this.deps.monitor.report(),
    };
  }
}

export type { ScanBackend };
