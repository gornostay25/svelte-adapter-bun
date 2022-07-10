import { createReadStream, createWriteStream, existsSync, statSync, writeFileSync } from 'fs';
import { pipeline } from 'stream';
import glob from 'tiny-glob';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import zlib from 'zlib';

const pipe = promisify(pipeline);

const files = fileURLToPath(new URL('./files', import.meta.url).href);

/** @type {import('.').default} */
export default function (opts = {}) {
	const { out = 'build', precompress = false, envPrefix = '', development = false, dynamic_origin = false, xff_depth = 1, assets = true } = opts;
	return {
		name: 'svelte-adapter-bun',
		async adapt(builder) {
			builder.rimraf(out);

			builder.log.minor('Copying assets');
			builder.writeClient(`${out}/client`);
			builder.writeServer(`${out}/server`);
			builder.writeStatic(`${out}/static`);
			builder.writePrerendered(`${out}/prerendered`);


			writeFileSync(
				`${out}/manifest.js`,
				`export const manifest = ${builder.generateManifest({
					relativePath: './server'
				})};\n`
			);

			builder.copy(files, out, {
				replace: {
					SERVER: './server/index.js',
					MANIFEST: './manifest.js',
					ENV_PREFIX: JSON.stringify(envPrefix),
					dotENV_PREFIX: envPrefix,
					BUILD_OPTIONS: JSON.stringify({ development, dynamic_origin, xff_depth, assets })
				}
			});

			if (precompress) {
				builder.log.minor('Compressing assets');
				await compress(`${out}/client`, precompress);
				await compress(`${out}/static`, precompress);
				await compress(`${out}/prerendered`, precompress);
				builder.log.success("Compression success")
			}

			builder.log.success("Start server with: bun /build/index.js")
		}
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

	
	let files_ext = options.files ?? ['html','js','json','css','svg','xml','wasm']
	const files = await glob(`**/*.{${files_ext.join()}}`, {
		cwd: directory,
		dot: true,
		absolute: true,
		filesOnly: true
	});

	let doBr = false, doGz = false;

	if (options === true) {
		doBr = doGz = true
	} else if (typeof options == "object") {
		doBr = options.brotli ?? false
		doGz = options.gzip ?? false
	}

	await Promise.all(
		files.map((file) => Promise.all([
			doGz && compress_file(file, 'gz'),
			doBr && compress_file(file, 'br')
		]))
	);
}

/**
 * @param {string} file
 * @param {'gz' | 'br'} format
 */
async function compress_file(file, format = 'gz') {
	const compress =
		format == 'br'
			? zlib.createBrotliCompress({
				params: {
					[zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
					[zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
					[zlib.constants.BROTLI_PARAM_SIZE_HINT]: statSync(file).size
				}
			})
			: zlib.createGzip({ level: zlib.constants.Z_BEST_COMPRESSION });

	const source = createReadStream(file);
	const destination = createWriteStream(`${file}.${format}`);

	await pipe(source, compress, destination);
}