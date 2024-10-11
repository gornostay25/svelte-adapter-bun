import {
  createReadStream,
  createWriteStream,
  existsSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "fs";
import { pipeline } from "stream";
import glob from "tiny-glob";
import { fileURLToPath } from "url";
import { promisify } from "util";
import zlib from "zlib";

const pipe = promisify(pipeline);

const files = fileURLToPath(new URL("./files", import.meta.url).href);

/** @type {import('.').default} */
export default function (opts = {}) {
  const {
    out = "build",
    precompress = false,
    envPrefix = "",
    development = false,
    dynamic_origin = false,
    xff_depth = 1,
    assets = true,
  } = opts;
  return {
    name: "svelte-adapter-bun",
    async adapt(builder) {
      builder.rimraf(out);
      builder.mkdirp(out);

      builder.log.minor("Copying assets");
      builder.writeClient(`${out}/client${builder.config.kit.paths.base}`);
      builder.writePrerendered(`${out}/prerendered${builder.config.kit.paths.base}`);

      if (precompress) {
        builder.log.minor("Compressing assets");
        await Promise.all([
          compress(`${out}/client`, precompress),
          compress(`${out}/prerendered`, precompress),
        ]);
      }

      builder.log.minor("Building server");
      builder.writeServer(`${out}/server`);

      writeFileSync(
        `${out}/manifest.js`,
        `export const manifest = ${builder.generateManifest({ relativePath: "./server" })};\n\n` +
          `export const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});\n`,
      );

      builder.log.minor("Patching server (websocket support)");
      patchServerWebsocketHandler(`${out}/server`);

      const pkg = JSON.parse(readFileSync("package.json", "utf8"));

      builder.copy(files, out, {
        replace: {
          SERVER: "./server/index.js",
          MANIFEST: "./manifest.js",
          ENV_PREFIX: JSON.stringify(envPrefix),
          dotENV_PREFIX: envPrefix,
          BUILD_OPTIONS: JSON.stringify({ development, dynamic_origin, xff_depth, assets }),
        },
      });

      let package_data = {
        name: "bun-sveltekit-app",
        version: "0.0.0",
        type: "module",
        private: true,
        main: "index.js",
        scripts: {
          start: "bun ./index.js",
        },
        dependencies: { cookie: "^1", devalue: "^5", "set-cookie-parser": "^2" },
      };

      try {
        pkg.name && (package_data.name = pkg.name);
        pkg.version && (package_data.version = pkg.version);
        pkg.dependencies &&
          (package_data.dependencies = {
            ...pkg.dependencies,
            ...package_data.dependencies,
          });
      } catch (error) {
        builder.log.warn(`Parse package.json error: ${error.message}`);
      }

      writeFileSync(`${out}/package.json`, JSON.stringify(package_data, null, "\t"));

      builder.log.success(`Start server with: bun ./${out}/index.js`);
    },
  };
}

/**
 * @param {string} directory
 * @param {import('.').CompressOptions} options
 */
async function compress(directory, options) {
  if (!existsSync(directory)) {
    return;
  }

  let files_ext = options.files ?? ["html", "js", "json", "css", "svg", "xml", "wasm"];
  const files = await glob(`**/*.{${files_ext.join()}}`, {
    cwd: directory,
    dot: true,
    absolute: true,
    filesOnly: true,
  });

  let doBr = false,
    doGz = false;

  if (options === true) {
    doBr = doGz = true;
  } else if (typeof options == "object") {
    doBr = options.brotli ?? false;
    doGz = options.gzip ?? false;
  }

  await Promise.all(
    files.map(file =>
      Promise.all([doGz && compress_file(file, "gz"), doBr && compress_file(file, "br")]),
    ),
  );
}

/**
 * @param {string} file
 * @param {'gz' | 'br'} format
 */
async function compress_file(file, format = "gz") {
  const compress =
    format == "br"
      ? zlib.createBrotliCompress({
          params: {
            [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
            [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
            [zlib.constants.BROTLI_PARAM_SIZE_HINT]: statSync(file).size,
          },
        })
      : zlib.createGzip({ level: zlib.constants.Z_BEST_COMPRESSION });

  const source = createReadStream(file);
  const destination = createWriteStream(`${file}.${format}`);

  await pipe(source, compress, destination);
}

/**
 * @param {string} out
 */
function patchServerWebsocketHandler(out) {
  let src = readFileSync(`${out}/index.js`, "utf8");
  const regex_gethook = /(this\.#options\.hooks\s+=\s+{)\s+(handle:)/gm;
  const substr_gethook = `$1 \nhandleWebsocket: module.handleWebsocket || null,\n$2`;
  const result1 = src.replace(regex_gethook, substr_gethook);

  const regex_sethook = /(this\.#options\s+=\s+options;)/gm;
  const substr_sethook = `$1\nthis.websocket = ()=>this.#options.hooks.handleWebsocket;`;
  const result = result1.replace(regex_sethook, substr_sethook);

  writeFileSync(`${out}/index.js`, result, "utf8");
}
