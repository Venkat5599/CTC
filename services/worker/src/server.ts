/**
 * Worker HTTP surface.
 *
 * Fastify rather than Next.js API routes, because the relayer and indexer are
 * long-running processes with their own lifecycle and deploying them behind a
 * frontend framework couples two things that fail for unrelated reasons.
 *
 * The surface is small on purpose: health, readiness, metrics, and a status
 * endpoint the SDK polls so a UI can show what is happening while a fact works
 * its way through the pipeline. Nothing here writes to the chain, and nothing
 * here is authoritative -- every answer is either an observation about local
 * queue state or a mirror of something the registry already decided.
 */

import Fastify, { type FastifyInstance } from 'fastify';
import { render } from './metrics.js';

export interface WorkerDeps {
  /** Liveness of the database. */
  databaseReachable: () => Promise<boolean>;
  /** Queue snapshot, for readiness and status. */
  queueSnapshot: () => { pendingClaims: number; jobs: number; stuck: number };
  /** Verification status for one subject, mirrored from the pipeline. */
  statusFor: (subject: string, factType?: string) => Promise<unknown[]>;
}

export function createServer(deps: WorkerDeps): FastifyInstance {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });

  /**
   * Liveness. Answers "is this process running", nothing more.
   *
   * Deliberately does not touch the database. A liveness probe that fails on a
   * database blip gets the process killed and restarted, which does not fix the
   * database and does lose the in-flight queue.
   */
  app.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));

  /**
   * Readiness. Answers "can this process do useful work right now".
   *
   * This one DOES check the database, because a worker that cannot persist a job
   * should not be sent traffic. The distinction from /health is the point:
   * restart me versus do not route to me.
   */
  app.get('/ready', async (_request, reply) => {
    const database = await deps.databaseReachable();
    if (!database) {
      return reply.code(503).send({ status: 'not-ready', reason: 'database unreachable' });
    }
    return { status: 'ready', ...deps.queueSnapshot() };
  });

  app.get('/metrics', async (_request, reply) => {
    reply.header('content-type', 'text/plain; version=0.0.4');
    return render();
  });

  /**
   * Where a subject's facts are in the pipeline.
   *
   * Read-only and advisory. A consumer deciding whether to grant a benefit must
   * read `hasProof` on chain, never this -- the worker is untrusted, and an
   * endpoint that could be believed would be an endpoint that could lie.
   */
  app.get<{ Querystring: { subject?: string; factType?: string } }>(
    '/status',
    async (request, reply) => {
      const { subject, factType } = request.query;

      if (!subject || !/^0x[0-9a-fA-F]{40}$/.test(subject)) {
        return reply.code(400).send({ error: 'subject must be a 0x-prefixed address' });
      }

      return { statuses: await deps.statusFor(subject.toLowerCase(), factType) };
    },
  );

  return app;
}

export async function start(deps: WorkerDeps, port = Number(process.env.PORT ?? 8082)) {
  const app = createServer(deps);

  // 0.0.0.0 so the container is reachable from outside it. Binding to localhost
  // inside a container is a health check that passes locally and fails in
  // deployment, which is the most annoying class of bug available.
  await app.listen({ port, host: '0.0.0.0' });

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'shutting down');
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  return app;
}
