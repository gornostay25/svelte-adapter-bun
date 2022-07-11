import { Adapter } from '@sveltejs/kit';


declare global {
	const ENV_PREFIX: string;
	const BUILD_OPTIONS: BuildOptions;
}

declare module 'SERVER' {
	export { Server } from '@sveltejs/kit';
}

declare module 'MANIFEST' {
	import { SSRManifest } from '@sveltejs/kit';
	export const manifest: SSRManifest;
}

interface BuildOptions {
	/**
	 * Render contextual errors? This enables bun's error page
	 * @default false
	 */
	development?: boolean
	/**
	 * If enabled use `PROTOCOL_HEADER` `HOST_HEADER` like origin.
	 * @default false
	 */
	dynamic_origin?: boolean;
	/**
	 * The default value of XFF_DEPTH if environment is not set.
	 * @default 1
	 */
	xff_depth?: number,

	/**
	 * Browse a static assets
	 * @default true
	 */
	assets?: boolean
}
type BuildOptionsMap = keyof BuildOptions


interface MimeTypes {
	[key: string]: string;
}

interface CompressOptions {
	/**
	 * @default false
	 */
	gzip?: boolean

	/**
	 * @default false
	 */
	brotli?: boolean

	/**
	 * @default html,js,json,css,svg,xml,wasm
	 */
	files?: string[]
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

export default function plugin(options?: AdapterOptions): Adapter;