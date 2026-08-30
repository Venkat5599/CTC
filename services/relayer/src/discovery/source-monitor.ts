/**
 * Source health.
 *
 * A source that has stopped producing facts looks exactly like a source nobody
 * is using, and that ambiguity is genuinely dangerous here, because every way of
 * misconfiguring a source fails SILENTLY. A mistyped topic0 matches no logs. A
 * wrong emitter address matches no logs. A chainKey pointing at Sepolia instead
 * of mainnet matches no logs. In all three cases the registry simply appears
 * empty, nothing throws, and the failure is indistinguishable from a quiet
 * protocol.
 *
 * So silence is reported as a condition rather than treated as an absence. The
 * monitor cannot tell which of the two it is looking at -- nothing can -- but it
 * can insist that a human be shown the question.
 */

export interface MonitoredSource {
  factType: string;
  emitter: string;
  chainKey: number;
}

export interface SourceHealth extends MonitoredSource {
  lastSeenAt: Date | null;
  lastSeenBlock: bigint | null;
  factsDiscovered: number;
  /** Silent longer than expected. Worth a human look. */
  suspicious: boolean;
  note: string;
}

export interface MonitorOptions {
  /** How long a source may be quiet before it is worth reporting. */
  silenceThresholdMs?: number;
  now?: () => Date;
}

export class SourceMonitor {
  private readonly state = new Map<
    string,
    { at: Date | null; block: bigint | null; count: number }
  >();
  private readonly silenceThresholdMs: number;
  private readonly now: () => Date;

  constructor(
    private readonly sources: readonly MonitoredSource[],
    options: MonitorOptions = {},
  ) {
    this.silenceThresholdMs = options.silenceThresholdMs ?? 6 * 60 * 60 * 1000;
    this.now = options.now ?? (() => new Date());
    for (const source of sources) {
      this.state.set(source.factType, { at: null, block: null, count: 0 });
    }
  }

  record(factType: string, blockNumber: bigint): void {
    const entry = this.state.get(factType);
    if (!entry) return;
    entry.at = this.now();
    entry.block = blockNumber;
    entry.count += 1;
  }

  report(): SourceHealth[] {
    const now = this.now().getTime();

    return this.sources.map((source) => {
      const entry = this.state.get(source.factType) ?? { at: null, block: null, count: 0 };
      const quietForMs = entry.at ? now - entry.at.getTime() : Number.POSITIVE_INFINITY;
      const suspicious = quietForMs > this.silenceThresholdMs;

      return {
        ...source,
        lastSeenAt: entry.at,
        lastSeenBlock: entry.block,
        factsDiscovered: entry.count,
        suspicious,
        note: !suspicious
          ? 'Healthy.'
          : entry.at === null
            ? 'No fact ever seen. Verify topic0, emitter and chainKey against the source chain -- all three fail silently when wrong.'
            : 'Silent longer than expected. Either the protocol is quiet or the source configuration drifted.',
      };
    });
  }

  /** Sources worth surfacing. Empty is the healthy answer. */
  alerts(): SourceHealth[] {
    return this.report().filter((health) => health.suspicious);
  }
}
