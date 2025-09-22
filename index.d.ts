import type { Adapter } from '@sveltejs/kit';
import './ambient.js';

interface AdapterOptions {
  out?: string;
  precompress?: boolean;
  envPrefix?: string;
  /**
   * If enabled, the adapter will serve static assets.
   * @default true
   */
  serveAssets?: boolean;
}

export default function adapter(options?: AdapterOptions): Adapter;
