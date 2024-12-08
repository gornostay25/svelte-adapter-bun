const expected = new Set([
  "SOCKET_PATH",
  "HOST",
  "PORT",
  "ORIGIN",
  "XFF_DEPTH",
  "ADDRESS_HEADER",
  "PROTOCOL_HEADER",
  "HOST_HEADER",
  "PORT_HEADER",
  "SERVERDEV",
]);
export const build_options = BUILD_OPTIONS;

if (ENV_PREFIX) {
  for (const name in Bun.env) {
    if (name.startsWith(ENV_PREFIX)) {
      const unprefixed = name.slice(ENV_PREFIX.length);
      if (!expected.has(unprefixed)) {
        throw new Error(
          `You should change envPrefix (${ENV_PREFIX}) to avoid conflicts with existing environment variables — unexpectedly saw ${name}`,
        );
      }
    }
  }
}

/**
 * @param {string} name
 * @param {any} fallback
 */
export function env(name, fallback) {
  const prefixed = ENV_PREFIX + name;

  return prefixed in Bun.env ? Bun.env[prefixed] : fallback;
}
