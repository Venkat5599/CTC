import { beforeEach, describe, expect, it } from 'vitest';
import {
  counter,
  gauge,
  recordBatchShipped,
  recordSettlement,
  recordSourceFact,
  render,
  reset,
} from './metrics.js';

beforeEach(reset);

describe('exposition format', () => {
  it('renders HELP and TYPE lines', () => {
    counter('vouch_test_total', 'A test counter.', { fact_type: 'AAVE_REPAYMENT' });

    const output = render();

    expect(output).toContain('# HELP vouch_test_total A test counter.');
    expect(output).toContain('# TYPE vouch_test_total counter');
    expect(output).toContain('vouch_test_total{fact_type="AAVE_REPAYMENT"} 1');
  });

  it('accumulates a counter across increments', () => {
    counter('vouch_test_total', 'A test counter.', { outcome: 'confirmed' });
    counter('vouch_test_total', 'A test counter.', { outcome: 'confirmed' });

    expect(render()).toContain('vouch_test_total{outcome="confirmed"} 2');
  });

  it('replaces a gauge rather than accumulating it', () => {
    gauge('vouch_queue_pending_claims', 'Pending.', 10);
    gauge('vouch_queue_pending_claims', 'Pending.', 3);

    expect(render()).toContain('vouch_queue_pending_claims 3');
  });

  it('orders labels deterministically so identical series collapse', () => {
    counter('vouch_test_total', 'help', { b: '2', a: '1' });
    counter('vouch_test_total', 'help', { a: '1', b: '2' });

    expect(render()).toContain('vouch_test_total{a="1",b="2"} 2');
  });

  it('escapes a label value that would break the format', () => {
    counter('vouch_test_total', 'help', { reason: 'said "no"' });

    expect(render()).toContain('reason="said \\"no\\""');
  });
});

describe('batch metrics', () => {
  // The number the batching argument turns on. A full batch amortises one
  // continuity proof across ten claims; a batch of one amortises nothing.
  it('reports proofs-per-fact as 1.0 for a single-claim batch', () => {
    recordBatchShipped(1, 'deadline');

    expect(render()).toContain('vouch_proofs_per_fact 1');
  });

  it('reports 0.1 for a full batch', () => {
    recordBatchShipped(10, 'full');

    expect(render()).toContain('vouch_proofs_per_fact 0.1');
  });

  // A p50 near 1 means the deadline is firing before batches fill, which is the
  // amortisation quietly evaporating. An average would hide it behind a few
  // full batches, so the distribution is what gets exported.
  it('exports batch fill as cumulative buckets', () => {
    recordBatchShipped(3, 'deadline');

    const output = render();
    expect(output).toContain('vouch_batch_size_bucket{le="3"} 1');
    expect(output).toContain('vouch_batch_size_bucket{le="10"} 1');
    expect(output).not.toContain('vouch_batch_size_bucket{le="2"} 1');
    expect(output).toContain('vouch_batch_size_count 1');
  });
});

describe('source freshness', () => {
  // Exported as a timestamp, not a counter. A counter that stops incrementing is
  // indistinguishable from one nobody has incremented yet; a timestamp that
  // stops moving is visibly stale. Silence is the signal here, because a wrong
  // topic0, emitter or chainKey all produce exactly this silence with nothing
  // thrown.
  it('exports the last-seen time per source', () => {
    recordSourceFact('AAVE_REPAYMENT', 1_800_000_000_000);

    expect(render()).toContain(
      'vouch_source_last_fact_timestamp_seconds{fact_type="AAVE_REPAYMENT"} 1800000000',
    );
  });
});

describe('settlement outcomes', () => {
  // already-verified is a SUCCESS: a competing relayer landed the fact first,
  // which is what permissionless submission means. Counting it as a failure
  // would make the dashboard report a healthy system as broken.
  it('counts each outcome class separately', () => {
    recordSettlement('confirmed');
    recordSettlement('already-verified');
    recordSettlement('rejected');

    const output = render();
    expect(output).toContain('vouch_settlement_total{outcome="confirmed"} 1');
    expect(output).toContain('vouch_settlement_total{outcome="already-verified"} 1');
    expect(output).toContain('vouch_settlement_total{outcome="rejected"} 1');
  });
});
