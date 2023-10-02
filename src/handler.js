import { Server } from "SERVER";
import { manifest } from "MANIFEST";
import { build_options, env } from "./env";
import { fileURLToPath } from "bun";
import path from "path";
import sirv from "./sirv";
import { existsSync } from "fs";
import installPolyfills from "./polyfills";

const __dirname = path.dirname(fileURLToPath(new URL(import.meta.url)));

installPolyfills();

/** @type {import('@sveltejs/kit').Server} */
const server = new Server(manifest);
await server.init({ env: (Bun || process).env });

const xff_depth = parseInt(env("XFF_DEPTH", build_options.xff_depth ?? 1));
const origin = env('ORIGIN', undefined);

const address_header = env("ADDRESS_HEADER", "").toLowerCase();
const protocol_header = env("PROTOCOL_HEADER", "X-Forwarded-Proto").toLowerCase();
const host_header = env("HOST_HEADER", "X-Forwarded-Host").toLowerCase();

/** @param {boolean} assets */
export default function (assets) {
  let handlers = [
    assets && serve(path.join(__dirname, "/client"), true),
    assets && serve(path.join(__dirname, "/prerendered")),
    ssr,
  ].filter(Boolean);

  /**@param {Request} req */
  function handler(req) {
    function handle(i) {
      return handlers[i](req, () => {
        if (i < handlers.length) {
          return handle(i + 1);
        } else {
          return new Response(404, { status: 404 });
        }
      });
    }
    return handle(0);
  }

  function defaultAcceptWebsocket(request, upgrade) {
    return upgrade(request);
  }

  try {
    const handleWebsocket = server.websocket();
    if (handleWebsocket) {
      return {
        httpserver: (req, srv) => {
          if (
            req.headers.get("connection")?.toLowerCase().includes("upgrade") &&
            req.headers.get("upgrade")?.toLowerCase() === "websocket"
          ) {
            (handleWebsocket.upgrade ?? defaultAcceptWebsocket)(req, srv.upgrade.bind(srv));
            return;
          }
          return handler(req, srv);
        },
        websocket: handleWebsocket,
      };
    }
  } catch (e) {
    console.warn("Fail: websocket handler error:", e);
  }
  return {
    httpserver: handler,
  };
}

function serve(path, client = false) {
  return (
    existsSync(path) &&
    sirv(path, {
      etag: true,
      gzip: true,
      brotli: true,
      setHeaders:
        client &&
        ((headers, pathname) => {
          if (pathname.startsWith(`/${manifest.appDir}/immutable/`)) {
            headers.set("cache-control", "public,max-age=31536000,immutable");
          }
          return headers;
        }),
    })
  );
}

/**@param {Request} req */
function ssr(req) {
  let request = req;
  if (build_options.dynamic_origin ?? false) {
    let url = req.url;
    let path = url.slice(url.split("/", 3).join("/").length);
    let base = origin || get_origin(req.headers);
    request = new Request(base + path, req);
  }

  if (address_header && !request.headers.has(address_header)) {
    throw new Error(
      `Address header was specified with ${
        ENV_PREFIX + "ADDRESS_HEADER"
      }=${address_header} but is absent from request`,
    );
  }

  return server.respond(request, {
    getClientAddress() {
      if (address_header) {
        const value = /** @type {string} */ (request.headers.get(address_header)) || "";

        if (address_header === "x-forwarded-for") {
          const addresses = value.split(",");

          if (xff_depth < 1) {
            throw new Error(`${ENV_PREFIX + "XFF_DEPTH"} must be a positive integer`);
          }

          if (xff_depth > addresses.length) {
            throw new Error(
              `${ENV_PREFIX + "XFF_DEPTH"} is ${xff_depth}, but only found ${
                addresses.length
              } addresses`,
            );
          }
          return addresses[addresses.length - xff_depth].trim();
        }

        return value;
      }
      return "127.0.0.1";
    },
    platform: {
      isBun() {
        return true;
      },
    },
  });
}

/**
 * @param {Headers} headers
 * @returns {string}
 */
function get_origin(headers) {
  const protocol = (protocol_header && headers.get(protocol_header)) || "http";
  const host = headers.get(host_header);
  return `${protocol}://${host}`;
}
