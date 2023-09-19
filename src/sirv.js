/*! MIT © Luke Edwards https://github.com/lukeed/sirv/blob/master/packages/sirv/index.js */
import { existsSync, statSync, Stats } from "fs";
import { join, normalize, resolve } from "path";
import { mimes, lookup as getExt } from "mrmime";
import { totalist } from "totalist/sync";
import exmimes from "./mime.conf.js";

// function isMatch(uri, arr) {
//     for (let i = 0; i < arr.length; i++) {
//         if (arr[i].test(uri)) return true;
//     }
// }

function toAssume(uri, extns) {
  let i = 0,
    x,
    len = uri.length - 1;
  if (uri.charCodeAt(len) === 47) {
    uri = uri.substring(0, len);
  }

  let arr = [],
    tmp = `${uri}/index`;
  for (; i < extns.length; i++) {
    x = extns[i] ? `.${extns[i]}` : "";
    if (uri) arr.push(uri + x);
    arr.push(tmp + x);
  }

  return arr;
}

function viaCache(cache, uri, extns) {
  let i = 0,
    data,
    arr = toAssume(uri, extns);
  for (; i < arr.length; i++) {
    if ((data = cache[arr[i]])) return data;
  }
}

function viaLocal(dir, isEtag, uri, extns) {
  let i = 0,
    arr = toAssume(uri, extns);
  let abs, stats, name, headers;
  for (; i < arr.length; i++) {
    abs = normalize(join(dir, (name = arr[i])));
    if (abs.startsWith(dir) && existsSync(abs)) {
      stats = statSync(abs);
      if (stats.isDirectory()) continue;
      headers = toHeaders(name, stats, isEtag);
      headers.set("Cache-Control", isEtag ? "no-cache" : "no-store");
      return { abs, stats, headers };
    }
  }
}

function is404(req) {
  return new Response(null, {
    status: 404,
    statusText: "404",
  });
}
/**
 *
 * @param {Request} req
 * @param {import('../sirv').SirvData} data
 */
function send(req, data) {
  let code = 200,
    opts = {};

  if (req.headers.has("range")) {
    code = 206;
    let [x, y] = req.headers.get("range").replace("bytes=", "").split("-");
    let end = (opts.end = parseInt(y, 10) || data.stats.size - 1);
    let start = (opts.start = parseInt(x, 10) || 0);

    if (start >= data.stats.size || end >= data.stats.size) {
      data.headers.set("Content-Range", `bytes */${data.stats.size}`);
      return new Response(null, {
        headers: data.headers,
        status: 416,
      });
    }

    data.headers.set("Content-Range", `bytes ${start}-${end}/${data.stats.size}`);
    data.headers.set("Content-Length", end - start + 1);
    data.headers.set("Accept-Ranges", "bytes");
    opts.range = true;
  }

  if (opts.range) {
    return new Response(Bun.file(data.abs).slice(opts.start, opts.end), {
      headers: data.headers,
      status: code,
    });
  }

  return new Response(Bun.file(data.abs), {
    headers: data.headers,
    status: code,
  });
}

const ENCODING = {
  ".br": "br",
  ".gz": "gzip",
};
/**
 *
 * @param {string} name
 * @param {Stats} stats
 * @param {boolean} isEtag
 */
function toHeaders(name, stats, isEtag) {
  let enc = ENCODING[name.slice(-3)];

  let ctype = getExt(name.slice(0, enc && -3)) || "";
  if (ctype === "text/html") ctype += ";charset=utf-8";

  let headers = new Headers({
    "Content-Length": stats.size,
    "Content-Type": ctype,
    "Last-Modified": stats.mtime.toUTCString(),
  });

  if (enc) headers.set("Content-Encoding", enc);

  if (isEtag) headers.set("ETag", `W/"${stats.size}-${stats.mtime.getTime()}"`);

  return headers;
}

for (const mime in exmimes) {
  mimes[mime] = exmimes[mime];
}

/**
 * @param {import("../sirv").Options} opts
 * @param {string} dir
 * @return {import('../sirv').RequestHandler}
 */
export default function (dir, opts = {}) {
  dir = resolve(dir || ".");

  let isNotFound = opts.onNoMatch || is404;
  let setHeaders = opts.setHeaders || false;

  let extensions = opts.extensions || ["html", "htm"];
  let gzips = opts.gzip && extensions.map(x => `${x}.gz`).concat("gz");
  let brots = opts.brotli && extensions.map(x => `${x}.br`).concat("br");

  /** @type {import('../sirv').SirvFiles} */
  const FILES = {};

  // let fallback = '/';
  let isEtag = !!opts.etag;
  // let isSPA = !!opts.single;

  // if (typeof opts.single === 'string') {
  //     let idx = opts.single.lastIndexOf('.');
  //     fallback += !!~idx ? opts.single.substring(0, idx) : opts.single;
  // }

  let ignores = [];
  if (opts.ignores !== false) {
    ignores.push(/[/]([A-Za-z\s\d~$._-]+\.\w+){1,}$/); // any extn
    if (opts.dotfiles) ignores.push(/\/\.\w/);
    else ignores.push(/\/\.well-known/);
    [].concat(opts.ignores || []).forEach(x => {
      ignores.push(new RegExp(x, "i"));
    });
  }

  let cc = opts.maxAge != null && `public,max-age=${opts.maxAge}`;
  if (cc && opts.immutable) cc += ",immutable";
  else if (cc && opts.maxAge === 0) cc += ",must-revalidate";

  if (!opts.dev) {
    totalist(dir, (name, abs, stats) => {
      if (/\.well-known[\\+\/]/.test(name)) {
      } // keep
      else if (!opts.dotfiles && /(^\.|[\\+|\/+]\.)/.test(name)) return;

      let headers = toHeaders(name, stats, isEtag);
      if (cc) headers.set("Cache-Control", cc);

      FILES["/" + name.normalize().replace(/\\+/g, "/")] = { abs, stats, headers };
    });
  }

  /**
   * @callback lookup
   * @return { import('../sirv').SirvData }
   */
  /**@type {lookup} */
  let lookup = opts.dev ? viaLocal.bind(0, dir, isEtag) : viaCache.bind(0, FILES);

  /**
   * @param {Request} req
   */
  return function (req, next) {
    let extns = [""];
    let pathname = new URL(req.url).pathname;
    let val = req.headers.get("accept-encoding") || "";
    if (gzips && val.includes("gzip")) extns.unshift(...gzips);
    if (brots && /(br|brotli)/i.test(val)) extns.unshift(...brots);
    extns.push(...extensions); // [...br, ...gz, orig, ...exts]

    if (pathname.indexOf("%") !== -1) {
      try {
        pathname = decodeURIComponent(pathname);
      } catch (err) {
        /* malform uri */
      }
    }

    // tmp = lookup(pathname, extns)
    // if (!tmp) {
    //     if (isSPA && !isMatch(pathname, ignores)) {
    //         tmp = lookup(fallback, extns)
    //     }
    // }
    let data = lookup(pathname, extns);
    //  || isSPA && !isMatch(pathname, ignores) && lookup(fallback, extns);

    if (!data) return next ? next() : isNotFound(req);

    if (isEtag && req.headers.get("if-none-match") === data.headers.get("ETag")) {
      return new Response(null, { status: 304 });
    }

    data = {
      ...data,
      // clone a new headers to prevent the cached one getting modified
      headers: new Headers(data.headers)
    }

    if (gzips || brots) {
      data.headers.append("Vary", "Accept-Encoding");
    }

    if (setHeaders) {
      data.headers = setHeaders(data.headers, pathname, data.stats);
    }
    return send(req, data);
  };
}
