
import type { Stats } from 'fs';

type Arrayable<T> = T | T[];
export type NextHandler = () => void | Promise<void>;
export type RequestHandler = (req: RequestHandler, next?: NextHandler) => void;

export interface Options {
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
    onNoMatch?: (req: Request, res: ServerResponse) => void;
    setHeaders?: (headers: Headers, pathname: string, stats: Stats) => Headers;
}
