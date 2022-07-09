# svelte-adapter-bun

[Adapter](https://kit.svelte.dev/docs/adapters) for SvelteKit apps that generates a standalone [Bun](https://github.com/Jarred-Sumner/bun) server.

## Usage

Install with `npm i -D svelte-adapter-bun`, then add the adapter to your `svelte.config.js`:

```js
// svelte.config.js
import adapter from 'svelte-adapter-bun';

export default {
  kit: {
    adapter: adapter()
  }
};
```

After building the server (`npm run build`), use the following command to start:

```
# go to build directory
cd build/

# run Bun
bun index.js
```

## Options

The adapter can be configured with various options:

```js
// svelte.config.js
import adapter from 'svelte-adapter-bun';
export default {
  kit: {
    adapter: adapter({
      out:"build",
      envPrefix:"MY_CUSTOM_",
      development:true,
      dynamic_origin:true,
      xff_depth:1
    })
  }
};
```

### **out**

The directory to build the server to. It defaults to `build` — i.e. `bun build` would start the server locally after it has been created.

<!-- ### precompress

Enables precompressing using gzip and brotli for assets and prerendered pages. It defaults to `false`. -->

### **envPrefix**

If you need to change the name of the environment variables used to configure the deployment (for example, to deconflict with environment variables you don't control), you can specify a prefix:

```js
envPrefix: 'MY_CUSTOM_';
```

```
MY_CUSTOM_HOST=127.0.0.1 \
MY_CUSTOM_PORT=4000 \
MY_CUSTOM_ORIGIN=https://my.site \
bun build/index.js
```

### **development**

This enables bun's error page. Default: `false`

### **dynamic_origin**

If enabled use `PROTOCOL_HEADER` `HOST_HEADER` like origin. Default: `false`

### **xff_depth**

The default value of XFF_DEPTH if environment is not set. Default: `1`

## Environment variables

### `PORT` and `HOST`

By default, the server will accept connections on `0.0.0.0` using port 3000. These can be customized with the `PORT` and `HOST` environment variables:

```
HOST=127.0.0.1 PORT=4000 bun build/index.js
```

### `ORIGIN`, `PROTOCOL_HEADER` and `HOST_HEADER`

HTTP doesn't give SvelteKit a reliable way to know the URL that is currently being requested. The simplest way to tell SvelteKit where the app is being served is to set the `ORIGIN` environment variable:

```
ORIGIN=https://my.site bun build/index.js
```

With this, a request for the `/stuff` pathname will correctly resolve to `https://my.site/stuff`. Alternatively, you can specify headers that tell SvelteKit about the request protocol and host, from which it can construct the origin URL:

```
PROTOCOL_HEADER=x-forwarded-proto HOST_HEADER=x-forwarded-host bun build/index.js
```

> [`x-forwarded-proto`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-Proto) and [`x-forwarded-host`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-Host) are de facto standard headers that forward the original protocol and host if you're using a reverse proxy (think load balancers and CDNs). You should only set these variables if your server is behind a trusted reverse proxy; otherwise, it'd be possible for clients to spoof these headers.
### `ADDRESS_HEADER` and `XFF_DEPTH`

The [RequestEvent](https://kit.svelte.dev/docs/types#additional-types-requestevent) object passed to hooks and endpoints includes an `event.clientAddress` property representing the client's IP address. [Bun.js haven't got functionality](https://github.com/Jarred-Sumner/bun/issues/518) to get client's IP address, so SvelteKit will receive `127.0.0.1` or if your server is behind one or more proxies (such as a load balancer), you can get an IP address from headers, so we need to specify an `ADDRESS_HEADER` to read the address from:

```
ADDRESS_HEADER=True-Client-IP bun build/index.js
```

> Headers can easily be spoofed. As with `PROTOCOL_HEADER` and `HOST_HEADER`, you should [know what you're doing](https://adam-p.ca/blog/2022/03/x-forwarded-for/) before setting these.
If the `ADDRESS_HEADER` is `X-Forwarded-For`, the header value will contain a comma-separated list of IP addresses. The `XFF_DEPTH` environment variable should specify how many trusted proxies sit in front of your server. E.g. if there are three trusted proxies, proxy 3 will forward the addresses of the original connection and the first two proxies:

```
<client address>, <proxy 1 address>, <proxy 2 address>
```

Some guides will tell you to read the left-most address, but this leaves you [vulnerable to spoofing](https://adam-p.ca/blog/2022/03/x-forwarded-for/):

```
<spoofed address>, <client address>, <proxy 1 address>, <proxy 2 address>
```

Instead, we read from the _right_, accounting for the number of trusted proxies. In this case, we would use `XFF_DEPTH=3`.

> If you need to read the left-most address instead (and don't care about spoofing) — for example, to offer a geolocation service, where it's more important for the IP address to be _real_ than _trusted_, you can do so by inspecting the `x-forwarded-for` header within your app.


## License

[MIT](LICENSE)