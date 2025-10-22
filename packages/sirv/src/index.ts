/*! MIT © Luke Edwards https://github.com/lukeed/sirv/blob/master/packages/sirv/index.js */
import type { Stats } from 'fs';
import { resolve } from 'path';
import { totalist } from 'totalist/sync';
import { lookup } from 'mrmime';

// Type definitions
type Arrayable<T> = T | T[];

export type NextHandler = () => Response | Promise<Response>;

export type RequestHandler = (
  req: Request,
  next?: NextHandler
) => Response | Promise<Response>;

export interface Options {
  // dev?: boolean;
  etag?: boolean;
  maxAge?: number;
  immutable?: boolean;
  // single?: string | boolean;
  ignores?: false | Arrayable<string | RegExp>;
  extensions?: string[];
  dotfiles?: boolean;
  brotli?: boolean;
  gzip?: boolean;
  onNoMatch?: (req: Request) => Response;
  setHeaders?: (headers: Headers, pathname: string, stats: Stats) => Headers;
}

function isMatch(uri: string, arr: RegExp[]) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]?.test(uri)) return true;
  }
}

function toAssume(uri: string, extns: string[]) {
  let i = 0,
    x,
    len = uri.length - 1;
  if (uri.charCodeAt(len) === 47) {
    uri = uri.substring(0, len);
  }

  const arr = [],
    tmp = `${uri}/index`;
  for (; i < extns.length; i++) {
    x = extns[i] ? `.${extns[i]}` : '';
    if (uri) arr.push(uri + x);
    arr.push(tmp + x);
  }

  return arr;
}

function viaCache(
  cache: Record<string, any>,
  uri: string,
  extns: string[]
): { abs: string; stats: Stats; headers: Headers } | undefined {
  let i = 0,
    data,
    arr = toAssume(uri, extns);
  for (; i < arr.length; i++) {
    if ((data = cache[arr[i]!])) return data;
  }
}

// function viaLocal(dir: string, isEtag: boolean, uri: string, extns: string[]) {
//     let i = 0, arr = toAssume(uri, extns);
//     let abs, stats, name, headers;
//     for (; i < arr.length; i++) {
//         abs = normalize(
//             join(dir, name = arr[i]!)
//         );

//         if (abs.startsWith(dir) && fs.existsSync(abs)) {
//             stats = fs.statSync(abs);
//             if (stats.isDirectory()) continue;
//             headers = toHeaders(name, stats, isEtag);
//             headers.set('Cache-Control', isEtag ? 'no-cache' : 'no-store');
//             return { abs, stats, headers };
//         }
//     }
// }

function is404(req: Request) {
  return new Response(null, {
    status: 404,
    statusText: '404',
  });
}

function send(
  req: Request,
  data: { abs: string; stats: Stats; headers: Headers }
) {
  let code = 200;
  const opts: { end: number; start: number } = { end: 0, start: 0 };

  if (req.headers.has('range')) {
    code = 206;
    const [x, y] = req.headers.get('range')!.replace('bytes=', '').split('-');
    if (x !== undefined && y !== undefined) {
      let end = (opts.end = parseInt(y, 10) || data.stats.size - 1);
      const start = (opts.start = parseInt(x, 10) || 0);

      if (end >= data.stats.size) {
        end = data.stats.size - 1;
      }

      if (start >= data.stats.size) {
        data.headers.set('Content-Range', `bytes */${data.stats.size}`);
        return new Response(null, {
          headers: data.headers,
          status: 416,
        });
      }

      data.headers.set(
        'Content-Range',
        `bytes ${start}-${end}/${data.stats.size}`
      );
      data.headers.set('Content-Length', (end - start + 1).toString());
      data.headers.set('Accept-Ranges', 'bytes');

      return new Response(Bun.file(data.abs).slice(opts.start, opts.end + 1), {
        headers: data.headers,
        status: code,
      });
    }
  }

  return new Response(Bun.file(data.abs), {
    headers: data.headers,
    status: code,
  });
}

const ENCODING: Record<string, string> = {
  '.br': 'br',
  '.gz': 'gzip',
};

function toHeaders(name: string, stats: Stats, isEtag: boolean) {
  const enc = ENCODING[name.slice(-3)];

  let ctype = lookup(name.slice(0, enc ? -3 : undefined)) || '';
  if (ctype === 'text/html') ctype += ';charset=utf-8';

  const headers = new Headers({
    'Content-Length': stats.size.toString(),
    'Content-Type': ctype,
    'Last-Modified': stats.mtime.toUTCString(),
  });

  if (enc) headers.set('Content-Encoding', enc);
  if (isEtag) headers.set('ETag', `W/"${stats.size}-${stats.mtime.getTime()}"`);

  return headers;
}

export default function (dir: string, opts: Options = {}): RequestHandler {
  dir = resolve(dir || '.');

  const isNotFound = opts.onNoMatch || is404;
  const setHeaders = opts.setHeaders;

  const extensions = opts.extensions || ['html', 'htm'];
  const gzips = opts.gzip && extensions.map(x => `${x}.gz`).concat('gz');
  const brots = opts.brotli && extensions.map(x => `${x}.br`).concat('br');

  const FILES: Record<string, { abs: string; stats: Stats; headers: Headers }> =
    {};

  const fallback = '/';
  const isEtag = !!opts.etag;
  // let isSPA = !!opts.single;
  // if (typeof opts.single === 'string') {
  //     let idx = opts.single.lastIndexOf('.');
  //     fallback += !!~idx ? opts.single.substring(0, idx) : opts.single;
  // }

  const ignores: RegExp[] = [];
  if (opts.ignores !== false) {
    ignores.push(/[/]([A-Za-z\s\d~$._-]+\.\w+){1,}$/); // any extn
    if (opts.dotfiles) {
      ignores.push(/\/\.\w/);
    } else {
      ignores.push(/\/\.well-known/);
    }

    if (opts.ignores && Array.isArray(opts.ignores)) {
      ignores.push(...opts.ignores.map(x => new RegExp(x, 'i')));
    } else if (typeof opts.ignores === 'string') {
      ignores.push(new RegExp(opts.ignores, 'i'));
    }
  }

  let CacheControl = opts.maxAge != null && `public,max-age=${opts.maxAge}`;
  if (CacheControl && opts.immutable) CacheControl += ',immutable';
  else if (CacheControl && opts.maxAge === 0)
    CacheControl += ',must-revalidate';

  // if (!opts.dev) {
  totalist(dir, (name, abs, stats) => {
    if (/\.well-known[\\+/]/.test(name)) {
    } // keep
    else if (!opts.dotfiles && /(^\.|[\\+|/+]\.)/.test(name)) return;

    const headers = toHeaders(name, stats, isEtag);
    if (CacheControl) headers.set('Cache-Control', CacheControl);

    FILES['/' + name.normalize().replace(/\\+/g, '/')] = {
      abs,
      stats,
      headers,
    };
  });
  // }

  const lookup =
    /*opts.dev ? viaLocal.bind(0, dir + sep, isEtag) :*/ viaCache.bind(
      0,
      FILES
    );

  return (req, next) => {
    const extns = [''];
    let pathname = new URL(req.url).pathname;
    const val = req.headers.get('accept-encoding') || '';
    if (gzips && val.includes('gzip')) extns.unshift(...gzips);
    if (brots && /(br|brotli)/i.test(val)) extns.unshift(...brots);
    extns.push(...extensions); // [...br, ...gz, orig, ...exts]

    if (pathname.indexOf('%') !== -1) {
      try {
        pathname = decodeURI(pathname);
      } catch (err) {
        /* malform uri */
      }
    }

    let data =
      lookup(pathname, extns) ||
      (isMatch(pathname, ignores) && lookup(fallback, extns));
    if (!data) return next ? next() : isNotFound(req);

    if (
      isEtag &&
      req.headers.get('if-none-match') === data.headers.get('ETag')
    ) {
      return new Response(null, {
        status: 304,
      });
    }

    data = {
      ...data,
      // clone a new headers to prevent the cached one getting modified
      headers: new Headers(data.headers),
    };

    if (gzips || brots) {
      data.headers.set('Vary', 'Accept-Encoding');
    }

    if (setHeaders) {
      data.headers = setHeaders(data.headers, pathname, data.stats);
    }

    return send(req, data);
  };
}
