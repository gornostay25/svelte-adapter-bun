// node_modules/@sveltejs/kit/src/exports/node/polyfills.js"

import { FormData } from "formdata-polyfill/esm.min.js";
import multipart from "parse-multipart-data";

// https://github.com/oven-sh/bun/issues/621#issuecomment-1396462734
class File extends Blob {
  constructor(bytes, filename, options = {}) {
    super(bytes, options);
    Object.defineProperties(this, {
      name: { value: filename },
      lastModified: { value: options.lastModified || null },
      lastModifiedDate: { value: options.lastModified ? new Date(options.lastModified) : null },
      [Symbol.toStringTag]: { value: "File" },
    });
  }
}

/** @type {Record<string, any>} */
const globals = {
  FormData,
  File,
};
export default function installPolyfills() {
  Request.prototype.formData = async function formData() {
    const boundary = multipart.getBoundary(this.headers.get("content-type"));
    const buffer = Buffer.from(await new Response(this.body).text());
    const parts = multipart.parse(buffer, boundary);
    const form = new FormData();

    for (let i = 0; i < parts.length; i++) {
      form.append(parts[i].name, parts[i].data);
    }
    return form;
  };

  for (const name in globals) {
    Object.defineProperty(globalThis, name, {
      enumerable: true,
      configurable: true,
      writable: true,
      value: globals[name],
    });
  }
}
