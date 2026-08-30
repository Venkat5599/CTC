/**
 * Worker entrypoint.
 *
 * Runs the HTTP surface the monitoring stack scrapes and the SDK polls. It owns
 * no authority and holds no key: everything it reports is either a local queue
 * observation or a mirror of something the registry already decided.
 */

export { createServer, start, type WorkerDeps } from './server.js';
export * from './metrics.js';
