// node_modules/@sveltejs/kit/src/exports/node/polyfills.js"

// https://github.com/oven-sh/bun/issues/621#issuecomment-1396462734
// class File extends Blob {
//   constructor(bytes, filename, options = {}) {
//     super(bytes, options);
//     Object.defineProperties(this, {
//       name: { value: filename },
//       lastModified: { value: options.lastModified || null },
//       lastModifiedDate: { value: options.lastModified ? new Date(options.lastModified) : null },
//       [Symbol.toStringTag]: { value: "File" },
//     });
//   }
// }

/** @type {Record<string, any>} */
const globals = {
  // File,
};
export default function installPolyfills() {
  for (const name in globals) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    if (descriptor && !descriptor.configurable) {
      continue;
    }
    Object.defineProperty(globalThis, name, {
      enumerable: true,
      configurable: true,
      writable: true,
      value: globals[name],
    });
  }
}
