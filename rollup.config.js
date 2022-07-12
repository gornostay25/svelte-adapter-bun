import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import copy from 'rollup-plugin-copy';
import cleanup from 'rollup-plugin-cleanup';

export default [{
	input: {
		index: 'src/index.js',
		// handler: 'src/handler.js',
		// sirv: "src/sirv.js",
		"mime.conf": 'src/mime.conf.js'
	},
	output: {
		dir: 'files',
		format: 'esm'
	},
	plugins: [
		nodeResolve(),
		commonjs(),
		json(),
		copy({
			targets: [
				{ src: "src/.env.example", dest: "files/" }
			]
		}),
		cleanup()
	],
	external: ['bun', 'SERVER', 'MANIFEST', ...require('module').builtinModules]
}]