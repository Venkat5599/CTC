/**
 * Relayer process entrypoint.
 *
 * A dedicated file rather than a self-detecting check inside index.ts. The
 * "am I the process entry" trick is fragile across path separators and module
 * loaders, and getting it wrong either launches a relayer from a test import or
 * silently fails to launch one in the container. A separate file the Dockerfile
 * names explicitly has neither failure mode.
 */

import { main } from './bootstrap';

main().catch((error) => {
  console.error('[relayer] fatal:', error);
  process.exit(1);
});
