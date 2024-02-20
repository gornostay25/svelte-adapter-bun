import fs from "fs/promises";

await fs.rm("./files", { recursive: true, force: true });
await Bun.build({
  entrypoints: ["src/index.js", "src/handler.js", "src/mime.conf.js"],
  outdir: "./files",
  splitting: true,
  external: ["SERVER", "MANIFEST"],
  format: "esm",
  target: "bun",
});
await Promise.all([fs.copyFile("src/.env.example", "files/.env.example")]);
