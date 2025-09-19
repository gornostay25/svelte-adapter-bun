import { getHandler } from 'HANDLER';
import process from 'process';
import { env } from 'ENV';

export const hostname = env('HOST', '0.0.0.0');
export const port = env('PORT', '3000');
const body_size_limit = parse_as_bytes(env('BODY_SIZE_LIMIT', '512K'));
if (isNaN(body_size_limit)) {
  throw new Error(
    `Invalid BODY_SIZE_LIMIT: '${env('BODY_SIZE_LIMIT')}'. Please provide a numeric value.`
  );
}

const idle_timeout = parseInt(env('IDLE_TIMEOUT', '10'));

const { fetch: handlerFetch, websocket } = getHandler();
const options = {
  hostname,
  port,
  idleTimeout: idle_timeout,
  bodySizeLimit: body_size_limit,
  fetch: handlerFetch,
};

if (websocket) {
  // @ts-expect-error too many types
  options.websocket = websocket;
}

const server = Bun.serve(options);

console.log(`Listening on ${server.url}`);

async function graceful_shutdown(reason: 'SIGINT' | 'SIGTERM' | 'IDLE') {
  console.log('Shutting down...');
  await server.stop(true).then(() => {
    // @ts-expect-error custom events cannot be typed
    process.emit('sveltekit:shutdown', reason);
  });
  process.exit(0);
}

process.on('SIGTERM', graceful_shutdown);
process.on('SIGINT', graceful_shutdown);

export { server };

/**
 * Parses the given value into number of bytes.
 *
 * @param {string} value - Size in bytes. Can also be specified with a unit suffix kilobytes (K), megabytes (M), or gigabytes (G).
 * @returns {number}
 */
function parse_as_bytes(value: string): number {
  const units = value.at(-1)?.toUpperCase();
  const multiplier =
    {
      B: 1,
      K: 1024,
      M: 1024 * 1024,
      G: 1024 * 1024 * 1024,
    }[units ?? 'B'] ?? 1;
  return Number(multiplier != 1 ? value.slice(0, -1) : value) * multiplier;
}
