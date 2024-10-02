import { Adapter } from "@sveltejs/kit";
import { Server } from "bun";

declare global {
  const ENV_PREFIX: string;
  const BUILD_OPTIONS: BuildOptions;
}

declare module "SERVER" {
  export { Server } from "@sveltejs/kit";
}

declare module "MANIFEST" {
  import { SSRManifest } from "@sveltejs/kit";
  export const manifest: SSRManifest;
}

interface BuildOptions {
  /**
   * Render contextual errors? This enables bun's error page
   * @default false
   */
  development?: boolean;
  /**
   * If enabled use `PROTOCOL_HEADER` `HOST_HEADER` like origin.
   * @default false
   */
  dynamic_origin?: boolean;
  /**
   * The default value of XFF_DEPTH if environment is not set.
   * @default 1
   */
  xff_depth?: number;

  /**
   * Browse a static assets
   * @default true
   */
  assets?: boolean;
}
type BuildOptionsMap = keyof BuildOptions;

interface MimeTypes {
  [key: string]: string;
}

interface CompressOptions {
  /**
   * @default false
   */
  gzip?: boolean;

  /**
   * @default false
   */
  brotli?: boolean;

  files?: string[];
}

interface AdapterOptions extends BuildOptions {
  /**
   * The directory to build the server to. It defaults to build — i.e. node build would start the server locally after it has been created.
   * @default "build"
   */
  out?: string;
  /**
   * Enables precompressing using gzip and brotli for assets and prerendered pages. It defaults to false.
   * @default false
   */
  precompress?: boolean | CompressOptions;

  /**
   * If you need to change the name of the environment variables used to configure the deployment (for example, to deconflict with environment variables you don't control), you can specify a prefix: envPrefix: 'MY_CUSTOM_';
   * @default ''
   */
  envPrefix?: string;
}

/**
 * **0** means the message was **dropped**
 *
 * **-1** means **backpressure**
 *
 * **> 0** is the **number of bytes sent**
 *
 */
type ServerWebSocketSendStatus = 0 | -1 | number;

/**
 * Fast WebSocket API designed for server environments.
 *
 * Features:
 * - **Message compression** - Messages can be compressed
 * - **Backpressure** - If the client is not ready to receive data, the server will tell you.
 * - **Dropped messages** - If the client cannot receive data, the server will tell you.
 * - **Topics** - Messages can be {@link ServerWebSocket.publish}ed to a specific topic and the client can {@link ServerWebSocket.subscribe} to topics
 *
 * This is slightly different than the browser {@link WebSocket} which Bun supports for clients.
 *
 * Powered by [uWebSockets](https://github.com/uNetworking/uWebSockets)
 */
interface ServerWebSocket<T = undefined> {
  /**
   *
   * Send a message to the client.
   *
   * @param data The message to send
   * @param compress Should the data be compressed? Ignored if the client does not support compression.
   *
   * @returns 0 if the message was dropped, -1 if backpressure was applied, or the number of bytes sent.
   *
   * @example
   *
   * ```js
   * const status = ws.send("Hello World");
   * if (status === 0) {
   *   console.log("Message was dropped");
   * } else if (status === -1) {
   *   console.log("Backpressure was applied");
   * } else {
   *   console.log(`Message sent! ${status} bytes sent`);
   * }
   * ```
   *
   * @example
   *
   * ```js
   * ws.send("Feeling very compressed", true);
   * ```
   *
   * @example
   *
   * ```js
   * ws.send(new Uint8Array([1, 2, 3, 4]));
   * ```
   *
   * @example
   *
   * ```js
   * ws.send(new ArrayBuffer(4));
   * ```
   *
   * @example
   *
   * ```js
   * ws.send(new DataView(new ArrayBuffer(4)));
   * ```
   *
   */
  send(data: string | ArrayBufferView | ArrayBuffer, compress?: boolean): ServerWebSocketSendStatus;

  /**
   *
   * Send a message to the client.
   *
   * This function is the same as {@link ServerWebSocket.send} but it only accepts a string. This function includes a fast path.
   *
   * @param data The message to send
   * @param compress Should the data be compressed? Ignored if the client does not support compression.
   *
   * @returns 0 if the message was dropped, -1 if backpressure was applied, or the number of bytes sent.
   *
   * @example
   *
   * ```js
   * const status = ws.send("Hello World");
   * if (status === 0) {
   *   console.log("Message was dropped");
   * } else if (status === -1) {
   *   console.log("Backpressure was applied");
   * } else {
   *   console.log(`Message sent! ${status} bytes sent`);
   * }
   * ```
   *
   * @example
   *
   * ```js
   * ws.send("Feeling very compressed", true);
   * ```
   *
   *
   */
  sendText(data: string, compress?: boolean): ServerWebSocketSendStatus;

  /**
   *
   * Send a message to the client.
   *
   * This function is the same as {@link ServerWebSocket.send} but it only accepts Uint8Array.
   *
   * @param data The message to send
   * @param compress Should the data be compressed? Ignored if the client does not support compression.
   *
   * @returns 0 if the message was dropped, -1 if backpressure was applied, or the number of bytes sent.
   *
   *
   * ```js
   * ws.sendBinary(new Uint8Array([1, 2, 3, 4]));
   * ```
   *
   * @example
   *
   * ```js
   * ws.sendBinary(new ArrayBuffer(4));
   * ```
   *
   * @example
   *
   * ```js
   * ws.sendBinary(new DataView(new ArrayBuffer(4)));
   * ```
   *
   */
  sendBinary(data: Uint8Array, compress?: boolean): ServerWebSocketSendStatus;

  /**
   * Gently close the connection.
   *
   * @param code The close code
   *
   * @param reason The close reason
   *
   * To close the connection abruptly, use `close(0, "")`
   */
  close(code?: number, reason?: string): void;

  /**
   * Send a message to all subscribers of a topic
   *
   * @param topic The topic to publish to
   * @param data The data to send
   * @param compress Should the data be compressed? Ignored if the client does not support compression.
   *
   * @returns 0 if the message was dropped, -1 if backpressure was applied, or the number of bytes sent.
   *
   * @example
   *
   * ```js
   * ws.publish("chat", "Hello World");
   * ```
   *
   * @example
   * ```js
   * ws.publish("chat", new Uint8Array([1, 2, 3, 4]));
   * ```
   *
   * @example
   * ```js
   * ws.publish("chat", new ArrayBuffer(4), true);
   * ```
   *
   * @example
   * ```js
   * ws.publish("chat", new DataView(new ArrayBuffer(4)));
   * ```
   */
  publish(
    topic: string,
    data: string | ArrayBufferView | ArrayBuffer,
    compress?: boolean,
  ): ServerWebSocketSendStatus;

  /**
   * Send a message to all subscribers of a topic
   *
   * This function is the same as {@link publish} but only accepts string input. This function has a fast path.
   *
   * @param topic The topic to publish to
   * @param data The data to send
   * @param compress Should the data be compressed? Ignored if the client does not support compression.
   *
   * @returns 0 if the message was dropped, -1 if backpressure was applied, or the number of bytes sent.
   *
   * @example
   *
   * ```js
   * ws.publishText("chat", "Hello World");
   * ```
   *
   */
  publishText(topic: string, data: string, compress?: boolean): ServerWebSocketSendStatus;

  /**
   * Send a message to all subscribers of a topic
   *
   * This function is the same as {@link publish} but only accepts a Uint8Array. This function has a fast path.
   *
   * @param topic The topic to publish to
   * @param data The data to send
   * @param compress Should the data be compressed? Ignored if the client does not support compression.
   *
   * @returns 0 if the message was dropped, -1 if backpressure was applied, or the number of bytes sent.
   *
   * @example
   *
   * ```js
   * ws.publishBinary("chat", "Hello World");
   * ```
   *
   * @example
   * ```js
   * ws.publishBinary("chat", new Uint8Array([1, 2, 3, 4]));
   * ```
   *
   * @example
   * ```js
   * ws.publishBinary("chat", new ArrayBuffer(4), true);
   * ```
   *
   * @example
   * ```js
   * ws.publishBinary("chat", new DataView(new ArrayBuffer(4)));
   * ```
   */
  publishBinary(topic: string, data: Uint8Array, compress?: boolean): ServerWebSocketSendStatus;

  /**
   * Subscribe to a topic
   * @param topic The topic to subscribe to
   *
   * @example
   * ```js
   * ws.subscribe("chat");
   * ```
   */
  subscribe(topic: string): void;

  /**
   * Unsubscribe from a topic
   * @param topic The topic to unsubscribe from
   *
   * @example
   * ```js
   * ws.unsubscribe("chat");
   * ```
   *
   */
  unsubscribe(topic: string): void;

  /**
   * Is the socket subscribed to a topic?
   * @param topic The topic to check
   *
   * @returns `true` if the socket is subscribed to the topic, `false` otherwise
   */
  isSubscribed(topic: string): boolean;

  /**
   * The remote address of the client
   * @example
   * ```js
   * console.log(socket.remoteAddress); // "127.0.0.1"
   * ```
   */
  readonly remoteAddress: string;

  /**
   * Ready state of the socket
   *
   * @example
   * ```js
   * console.log(socket.readyState); // 1
   * ```
   */
  readonly readyState: -1 | 0 | 1 | 2 | 3;

  /**
   * The data from the {@link Server.upgrade} function
   *
   * Put any data you want to share between the `fetch` function and the websocket here.
   *
   * You can read/write to this property at any time.
   */
  data: T;

  /**
   * Batch data sent to a {@link ServerWebSocket}
   *
   * This makes it significantly faster to {@link ServerWebSocket.send} or {@link ServerWebSocket.publish} multiple messages
   *
   * The `message`, `open`, and `drain` callbacks are automatically corked, so
   * you only need to call this if you are sending messages outside of those
   * callbacks or in async functions
   */
  cork: (callback: (ws: ServerWebSocket<T>) => any) => void | Promise<void>;

  /**
   * Configure the {@link WebSocketHandler.message} callback to return a {@link ArrayBuffer} instead of a {@link Uint8Array}
   *
   * @default "uint8array"
   */
  binaryType?: "arraybuffer" | "uint8array";
}

type WebSocketCompressor =
  | "disable"
  | "shared"
  | "dedicated"
  | "3KB"
  | "4KB"
  | "8KB"
  | "16KB"
  | "32KB"
  | "64KB"
  | "128KB"
  | "256KB";

/**
 * Create a server-side {@link ServerWebSocket} handler for use with {@link Bun.serve}
 *
 * @example
 * ```ts
 * import { websocket, serve } from "bun";
 *
 * serve({
 *   port: 3000,
 *   websocket: websocket<{name: string}>({
 *     open: (ws) => {
 *       console.log("Client connected");
 *    },
 *     message: (ws, message) => {
 *       console.log(`${ws.data.name}: ${message}`);
 *    },
 *     close: (ws) => {
 *       console.log("Client disconnected");
 *    },
 *  }),
 *
 *   fetch(req, server) {
 *     if (req.url === "/chat") {
 *       const upgraded = server.upgrade(req, {
 *         data: {
 *           name: new URL(req.url).searchParams.get("name"),
 *        },
 *      });
 *       if (!upgraded) {
 *         return new Response("Upgrade failed", { status: 400 });
 *      }
 *      return;
 *    }
 *     return new Response("Hello World");
 *  },
 * });
 */
export interface WebSocketHandler<T = undefined> {
  upgrade: (request: Request, server: Server) => boolean | Promise<boolean>;
  /**
   * Handle an incoming message to a {@link ServerWebSocket}
   *
   * @param ws The {@link ServerWebSocket} that received the message
   * @param message The message received
   *
   * To change `message` to be an `ArrayBuffer` instead of a `Uint8Array`, set `ws.binaryType = "arraybuffer"`
   */
  message: (ws: ServerWebSocket<T>, message: string | Uint8Array) => void | Promise<void>;

  /**
   * The {@link ServerWebSocket} has been opened
   *
   * @param ws The {@link ServerWebSocket} that was opened
   */
  open?: (ws: ServerWebSocket<T>) => void | Promise<void>;
  /**
   * The {@link ServerWebSocket} is ready for more data
   *
   * @param ws The {@link ServerWebSocket} that is ready
   */
  drain?: (ws: ServerWebSocket<T>) => void | Promise<void>;
  /**
   * The {@link ServerWebSocket} is being closed
   * @param ws The {@link ServerWebSocket} that was closed
   * @param code The close code
   * @param message The close message
   */
  close?: (ws: ServerWebSocket<T>, code: number, message: string) => void | Promise<void>;

  /**
   * Enable compression for clients that support it. By default, compression is disabled.
   *
   * @default false
   *
   * `true` is equivalent to `"shared"
   */
  perMessageDeflate?:
    | true
    | false
    | {
        /**
         * Enable compression on the {@link ServerWebSocket}
         *
         * @default false
         *
         * `true` is equivalent to `"shared"
         */
        compress?: WebSocketCompressor | false | true;
        /**
         * Configure decompression
         *
         * @default false
         *
         * `true` is equivalent to `"shared"
         */
        decompress?: WebSocketCompressor | false | true;
      };

  /**
   * The maximum size of a message
   */
  maxPayloadLength?: number;
  /**
   * After a connection has not received a message for this many seconds, it will be closed.
   * @default 120 (2 minutes)
   */
  idleTimeout?: number;
  /**
   * The maximum number of bytes that can be buffered for a single connection.
   * @default 16MB
   */
  backpressureLimit?: number;
  /**
   * Close the connection if the backpressure limit is reached.
   * @default false
   * @see {@link backpressureLimit}
   * @see {@link ServerWebSocketSendStatus}
   * @see {@link ServerWebSocket.send}
   * @see {@link ServerWebSocket.publish}
   */
  closeOnBackpressureLimit?: boolean;

  /**
   * Control whether or not ws.publish() should include the ServerWebSocket
   * that published the message. This is enabled by default, but it was an API
   * design mistake. A future version of Bun will change this default to
   * `false` and eventually remove this option entirely. The better way to publish to all is to use {@link Server.publish}.
   *
   * if `true` or `undefined`, {@link ServerWebSocket.publish} will publish to all subscribers, including the websocket publishing the message.
   *
   * if `false`, {@link ServerWebSocket.publish} will publish to all subscribers excluding the websocket publishing the message.
   *
   * @default true
   *
   */
  publishToSelf?: boolean;
}

export default function plugin(options?: AdapterOptions): Adapter;
