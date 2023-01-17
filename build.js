import * as esbuild from "esbuild";
import fs from "fs/promises";

await fs.mkdir("files");

await Promise.all([
  esbuild.build({
    entryPoints: ["src/index.js"],
    outdir: "files",
    bundle: true,
    minify: true,
    format: "esm",
    target: ["esnext"],
    platform: "node",
    external: ["./mime.conf.js", "bun", "SERVER", "MANIFEST"],
    legalComments: "external",
  }),
  fs.copyFile("src/.env.example", "files/.env.example"),
  esbuild.build({
    entryPoints: ["src/mime.conf.js"],
    outfile: "files/mime.conf.js",
    format: "esm",
    target: ["esnext"],
  }),
]);
