// node_modules/@sveltejs/kit/src/exports/node/polyfills.js"

import { FormData } from "formdata-polyfill/esm.min.js";

/** @type {Record<string, any>} */
const globals = {
  FormData,
};

export default function installPolyfills() {
  for (const name in globals) {
    Object.defineProperty(globalThis, name, {
      enumerable: true,
      configurable: true,
      writable: true,
      value: globals[name],
    });
  }
}
