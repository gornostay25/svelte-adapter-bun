import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
const files = fileURLToPath(new URL('./files', import.meta.url).href);

/** @type {import('.').default} */
export default function (opts = {}) {
	const { out = 'build', precompress, envPrefix = '',development = false, dynamic_origin = false, xff_depth = 1 } = opts;
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
					BUILD_OPTIONS:JSON.stringify({development,dynamic_origin,xff_depth})
				}
			});

			builder.log.success("Start server with: bun /build/index.js")
		}
	};
}

// /**
//  * @param {string} directory
//  */
// async function compress(directory) {
// 	if (!existsSync(directory)) {
// 		return;
// 	}

// 	const files = await glob('**/*.{html,js,json,css,svg,xml,wasm}', {
// 		cwd: directory,
// 		dot: true,
// 		absolute: true,
// 		filesOnly: true
// 	});

// 	await Promise.all(
// 		files.map((file) => Promise.all([compress_file(file, 'gz'), compress_file(file, 'br')]))
// 	);
// }

// /**
//  * @param {string} file
//  * @param {'gz' | 'br'} format
//  */
// async function compress_file(file, format = 'gz') {
// 	const compress =
// 		format == 'br'
// 			? zlib.createBrotliCompress({
// 					params: {
// 						[zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
// 						[zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
// 						[zlib.constants.BROTLI_PARAM_SIZE_HINT]: statSync(file).size
// 					}
// 			  })
// 			: zlib.createGzip({ level: zlib.constants.Z_BEST_COMPRESSION });

// 	const source = createReadStream(file);
// 	const destination = createWriteStream(`${file}.${format}`);

// 	await pipe(source, compress, destination);
// }