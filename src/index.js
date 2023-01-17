import { serve } from "bun";
import { build_options, env } from "./env.js";
import handler from "./handler.js";

const hostname = env("HOST", "0.0.0.0");
const port = parseInt(env("PORT", 3000));

console.info(`Listening on ${hostname + ":" + port}`);
serve({
  baseURI: env("ORIGIN", undefined),
  fetch: handler(build_options.assets ?? true),
  hostname,
  port,
  development: env("SERVERDEV", build_options.development ?? false),
});
