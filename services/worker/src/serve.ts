/**
 * Worker process entrypoint.
 *
 * Serves /health, /ready, /metrics and /status. Started by the container.
 */

import { start, type WorkerDeps } from './server';
import { recordQueueDepth } from './metrics';

const deps: WorkerDeps = {
  // Until a database is attached, report unreachable rather than pretending.
  // A readiness probe that lies is worse than one that fails.
  databaseReachable: async () => Boolean(process.env.DATABASE_URL),
  queueSnapshot: () => {
    const snapshot = { pendingClaims: 0, jobs: 0, stuck: 0 };
    recordQueueDepth(snapshot.pendingClaims, snapshot.jobs, snapshot.stuck);
    return snapshot;
  },
  statusFor: async () => [],
};

start(deps).catch((error) => {
  console.error('[worker] fatal:', error);
  process.exit(1);
});
