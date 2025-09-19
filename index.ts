import type { Adapter, Builder } from '@sveltejs/kit';
import { fileURLToPath } from 'node:url';
import { rolldown } from 'rolldown';

interface AdapterOptions {
  out?: string;
  precompress?: boolean;
  envPrefix?: string;
  serveAssets?: boolean;
}

const files = fileURLToPath(new URL('./files', import.meta.url).href);

export default function (options: AdapterOptions = {}): Adapter {
  const {
    out = 'build',
    precompress = true,
    envPrefix = '',
    serveAssets = true,
  } = options;

  return {
    name: 'svelte-adapter-bun',
    async adapt(builder: Builder) {
      const tmp = builder.getBuildDirectory('adapter-bun');

      builder.rimraf(out);
      builder.rimraf(tmp);
      builder.mkdirp(tmp);

      builder.log.minor('Copying assets');
      builder.writeClient(`${out}/client${builder.config.kit.paths.base}`);
      builder.writePrerendered(
        `${out}/prerendered${builder.config.kit.paths.base}`
      );

      if (precompress) {
        builder.log.minor('Compressing assets');
        await Promise.all([
          builder.compress(`${out}/client`),
          builder.compress(`${out}/prerendered`),
        ]);
      }

      builder.log.minor('Building server');

      builder.writeServer(tmp);

      Bun.write(
        `${tmp}/manifest.js`,
        [
          `export const manifest = ${builder.generateManifest({ relativePath: './' })};`,
          `export const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});`,
          `export const base = ${JSON.stringify(builder.config.kit.paths.base)};`,
        ].join('\n\n')
      );

      const pkg = await Bun.file('package.json').json();

      const entrypoints: Record<string, string> = {
        index: `${tmp}/index.js`,
        manifest: `${tmp}/manifest.js`,
      };

      if (builder.hasServerInstrumentationFile?.()) {
        entrypoints['instrumentation.server'] =
          `${tmp}/instrumentation.server.js`;
      }

      // ! Bun.build is not working for some reason
      // ! It will build successfully but the server will throw [500] GET / Error: https://svelte.dev/e/lifecycle_outside_component
      // const result = await Bun.build({
      // 	entrypoints: Object.values(entrypoints),
      // 	external: [
      // 		// dependencies could have deep exports, so we need a regex
      // 		...Object.keys(pkg.dependencies || {}).map((d) => new RegExp(`^${d}(\\/.*)?$`).toString())
      // 	],
      // 	target: 'bun',
      // 	minify: false,
      // 	outdir: `${out}/server`,
      // });

      // if (!result.success) {
      // 	console.error('Build failed:', result.logs);
      // 	process.exit(1);
      // }

      const bundle = await rolldown({
        input: entrypoints,
        external: [
          // dependencies could have deep exports, so we need a regex
          ...Object.keys(pkg.dependencies || {}).map(
            d => new RegExp(`^${d}(\\/.*)?$`)
          ),
          // Node.js built-in modules
          /^node:/,
        ],
      });

      await bundle.write({
        dir: `${out}/server`,
        format: 'esm',
        sourcemap: true,
        chunkFileNames: 'chunks/[name]-[hash].js',
      });

      await patchServerWebsocketHandler(`${out}/server/index.js`);

      builder.copy(files, out, {
        replace: {
          ENV: './env.js',
          HANDLER: './handler.js',
          MANIFEST: './server/manifest.js',
          SERVER: './server/index.js',
          ENV_PREFIX: JSON.stringify(envPrefix),
          BUILD_OPTIONS: JSON.stringify({ serveAssets }),
        },
      });

      if (builder.hasServerInstrumentationFile?.()) {
        builder.instrument?.({
          entrypoint: `${out}/index.js`,
          instrumentation: `${out}/server/instrumentation.server.js`,
          module: {
            exports: ['path', 'host', 'port', 'server'],
          },
        });
      }
    },

    supports: {
      read: () => true,
      instrumentation: () => true,
    },
  };
}

/**
 * Patch sveltekit server to return the websocket handler
 */
async function patchServerWebsocketHandler(path: string) {
  let content = await Bun.file(path).text();

  const result = content
    .replace(
      /(const (.*?) = await get_hooks\(\);)\s+(this\.#options\.hooks\s+=\s+{)/,
      '$1$3websocket: $2.websocket || null,'
    )
    .replace(/(async function get_hooks\(\) {)/, '$1let websocket;')
    .replace(/(\({handle,)((.|\s)*?{)/, '$1websocket,$2websocket,')
    .replace(
      /(async init\({ env, read }\) {)/,
      'websocket() {return this.#options.hooks.websocket}\n$1'
    );

  Bun.write(path, result);
}
