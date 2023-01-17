import type { Stats } from "fs";

type Arrayable<T> = T | T[];
type NextHandler = () => void | Promise<void>;
type RequestHandler = (req: RequestHandler, next?: NextHandler) => Response;

interface SirvFiles {
  [key: string]: SirvData;
}

interface SirvData {
  abs: string;
  stats: Stats;
  headers: Headers;
}

interface Options {
  dev?: boolean;
  etag?: boolean;
  maxAge?: number;
  immutable?: boolean;
  single?: string | boolean;
  ignores?: false | Arrayable<string | RegExp>;
  extensions?: string[];
  dotfiles?: boolean;
  brotli?: boolean;
  gzip?: boolean;
  onNoMatch?: (req: Request) => Response;
  setHeaders?: (headers: Headers, pathname: string, stats: Stats) => Headers;
}
