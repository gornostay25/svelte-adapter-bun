import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import copy from 'rollup-plugin-copy';


export default [{
		input: {
			index: 'src/index.js',
			handler: 'src/handler.js'
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
				targets:[
					{ src:"src/.env.example", dest:"files/" }
				]
			})
		],
		external: ['bun','SERVER', 'MANIFEST', ...require('module').builtinModules]
}]