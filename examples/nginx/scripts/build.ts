import { $, build, write } from 'bun';
import { createBuilder } from 'vite';

const startTime = performance.now();
console.info('> Building...');

// Clean up and build with optimizations
await $`rm -fr ./_dist ./dist`;
try {
  const inlineConfig = {
    root: undefined,
    base: undefined,
    mode: 'production',
    configFile: undefined,
    configLoader: undefined,
    logLevel: undefined,
    clearScreen: undefined,
    build: {},
  };
  const builder = await createBuilder(inlineConfig, null);
  await builder.buildApp();
} catch (e) {
  console.error(e);
  process.exit(1);
}

console.info('> Building server...');
await build({
  entrypoints: ['./_dist/index.js'],
  outdir: './dist/',
  root: './_dist',
  target: 'bun',
  minify: true,
  format: 'esm',
  sourcemap: 'linked',
  packages: 'bundle',
  external: [], //Object.keys(packageJson.dependencies)
});
// We move client and prerendered to public folder, because we serve static files by nginx
await $`mkdir -p ./dist/public && cp -r ./_dist/client ./dist/public && cp -r ./_dist/prerendered ./dist/public`;
// Remove all .br files recursively
await $`find ./dist/public -name '*.br' -type f -delete`;

// Remove all files in public folder except . and ..
const entrypoint = `#!/bin/sh
set -e
rm -rf /home/bun/public/* /home/bun/public/.[!.]* /home/bun/public/..?*
cp -r /home/bun/app/public /home/bun/
echo ">> Updated public volume <<"
exec "$@"`;

await write('./dist/entrypoint.sh', entrypoint, { mode: 0o755 });

console.info('> Removing temp files...');
await $`rm -fr ./_dist`;

const buildTime = ((performance.now() - startTime) / 1000).toFixed(2);
console.info(`>> Done! Site build completed in ${buildTime}s <<`);
process.exit(0);
