import { serve } from "bun";
import { build_options, env } from "./env.js";
import handler from "./handler.js";

const hostname = env("HOST", "0.0.0.0");
const port = parseInt(env("PORT", 3000));

const { httpserver, websocket } = handler(build_options.assets ?? true);

const serverOptions = {
  baseURI: env("ORIGIN", undefined),
  fetch: httpserver,
  hostname,
  port,
  development: env("SERVERDEV", build_options.development ?? false),
};

websocket ? (serverOptions.websocket = websocket) : 0;

console.info(`Listening on ${hostname + ":" + port}` + (websocket ? " (Websocket)" : ""));
serve(serverOptions);
