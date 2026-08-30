/**
 * Metrics.
 *
 * Every series here measures a LIVENESS property, because that is the only class
 * of failure the off-chain half of Vouch can have. The relayer cannot corrupt
 * standing -- the registry re-derives subject, value and emitter from the proven
 * payload before storing anything -- so there is no correctness metric worth
 * emitting. What the relayer can do is stop, stall, or go quiet.
 *
 * The subtle one is silence. A source that has stopped producing facts is
 * indistinguishable from a source nobody is using, and every way of
 * misconfiguring a source (wrong topic0, wrong emitter, wrong chainKey) produces
 * exactly that silence with nothing thrown. So freshness is exported as a
 * timestamp per source rather than a counter: a counter that stops incrementing
 * looks the same as a counter nobody incremented yet, but a timestamp that stops
 * moving is visibly stale.
 *
 * Written by hand rather than with prom-client. The exposition format is a
 * dozen lines of text, the dependency would be the largest in this service, and
 * the hand-rolled version makes the label discipline explicit.
 */

export type MetricLabels = Record<string, string>;

interface Series {
  help: string;
  type: 'counter' | 'gauge' | 'histogram';
  values: Map<string, number>;
  buckets?: number[];
}

const registry = new Map<string, Series>();

function key(labels: MetricLabels): string {
  const entries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
  return entries.map(([k, v]) => `${k}="${escape(v)}"`).join(',');
}

function escape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
}

function series(name: string, help: string, type: Series['type'], buckets?: number[]): Series {
  let s = registry.get(name);
  if (!s) {
    s = { help, type, values: new Map(), buckets };
    registry.set(name, s);
  }
  return s;
}

export function counter(name: string, help: string, labels: MetricLabels = {}, by = 1): void {
  const s = series(name, help, 'counter');
  const k = key(labels);
  s.values.set(k, (s.values.get(k) ?? 0) + by);
}

export function gauge(name: string, help: string, value: number, labels: MetricLabels = {}): void {
  series(name, help, 'gauge').values.set(key(labels), value);
}

/**
 * Histogram, as cumulative buckets.
 *
 * Used for batch fill, which is the distribution the batching argument depends
 * on: a p50 of 1 means the deadline is firing before batches fill and the
 * amortisation has quietly stopped happening. An average would hide that behind
 * a handful of full batches.
 */
export function observe(
  name: string,
  help: string,
  value: number,
  buckets: number[],
  labels: MetricLabels = {},
): void {
  const s = series(name, help, 'histogram', buckets);
  const base = key(labels);

  for (const bucket of buckets) {
    if (value <= bucket) {
      const k = `${base}${base ? ',' : ''}le="${bucket}"`;
      s.values.set(k, (s.values.get(k) ?? 0) + 1);
    }
  }

  const infKey = `${base}${base ? ',' : ''}le="+Inf"`;
  s.values.set(infKey, (s.values.get(infKey) ?? 0) + 1);
  s.values.set(`__sum__${base}`, (s.values.get(`__sum__${base}`) ?? 0) + value);
  s.values.set(`__count__${base}`, (s.values.get(`__count__${base}`) ?? 0) + 1);
}

/** Render the Prometheus text exposition format. */
export function render(): string {
  const lines: string[] = [];

  for (const [name, s] of registry) {
    lines.push(`# HELP ${name} ${s.help}`);
    lines.push(`# TYPE ${name} ${s.type}`);

    for (const [labelKey, value] of s.values) {
      if (labelKey.startsWith('__sum__')) {
        lines.push(`${name}_sum${wrap(labelKey.slice(7))} ${value}`);
      } else if (labelKey.startsWith('__count__')) {
        lines.push(`${name}_count${wrap(labelKey.slice(9))} ${value}`);
      } else if (s.type === 'histogram') {
        lines.push(`${name}_bucket${wrap(labelKey)} ${value}`);
      } else {
        lines.push(`${name}${wrap(labelKey)} ${value}`);
      }
    }
  }

  return `${lines.join('\n')}\n`;
}

function wrap(labelKey: string): string {
  return labelKey ? `{${labelKey}}` : '';
}

export function reset(): void {
  registry.clear();
}

// ---------------------------------------------------------------------------
// The pipeline's metrics, named once so the dashboards and the code agree
// ---------------------------------------------------------------------------

export const BATCH_SIZE_BUCKETS = [1, 2, 3, 5, 8, 10];

export function recordFactVerified(factType: string): void {
  counter('vouch_facts_verified_total', 'Facts written to the registry.', { fact_type: factType });
}

export function recordBatchShipped(claimCount: number, reason: string): void {
  observe('vouch_batch_size', 'Claims per shipped batch.', claimCount, BATCH_SIZE_BUCKETS);
  counter('vouch_batches_shipped_total', 'Batches submitted.', { reason });
  gauge(
    'vouch_proofs_per_fact',
    'Continuity proofs spent per fact. 1.0 means batching amortised nothing.',
    claimCount > 0 ? 1 / claimCount : 0,
  );
}

export function recordSettlement(outcome: string): void {
  counter('vouch_settlement_total', 'Submission outcomes by classification.', { outcome });
}

/**
 * Freshness, as a timestamp rather than a counter.
 *
 * A counter that stops incrementing is indistinguishable from one nobody has
 * incremented yet. A timestamp that stops moving is visibly stale, which is the
 * whole point: silence here is the signal.
 */
export function recordSourceFact(factType: string, atMs: number = Date.now()): void {
  gauge(
    'vouch_source_last_fact_timestamp_seconds',
    'Unix time of the most recent fact from each source.',
    Math.floor(atMs / 1000),
    { fact_type: factType },
  );
}

export function recordQueueDepth(pendingClaims: number, jobs: number, stuck: number): void {
  gauge('vouch_queue_pending_claims', 'Claims waiting for a batch.', pendingClaims);
  gauge('vouch_queue_jobs', 'Open verification jobs.', jobs);
  gauge('vouch_jobs_stuck', 'Jobs that exhausted their retry budget.', stuck);
}

export function recordOldestJobAge(seconds: number): void {
  gauge('vouch_oldest_job_age_seconds', 'Age of the oldest open job.', seconds);
}

export function recordIndexerLag(blocksBehind: number, chain: string): void {
  gauge('vouch_indexer_blocks_behind', 'Blocks behind the confirmed head.', blocksBehind, { chain });
}
