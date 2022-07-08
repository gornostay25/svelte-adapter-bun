# svelte-adapter-bun

[Adapter](https://kit.svelte.dev/docs/adapters) for SvelteKit apps that generates a standalone [Bun](https://github.com/Jarred-Sumner/bun) server.

## Usage

Install with `npm i -D svelte-adapter-bun`, then add the adapter to your `svelte.config.js`:

```js
// svelte.config.js
import adapter from 'svelte-adapter-bun';

export default {
  kit: {
    adapter: adapter({
      // options
    })
  }
};
```

After building the server (`npm run build`), use the following command to start:

## Options


## Advanced Configuration


## License

[MIT](LICENSE)