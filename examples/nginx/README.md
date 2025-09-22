# Nginx Example

Production deployment setup with Nginx reverse proxy for `svelte-adapter-bun`.

## Features

- Nginx reverse proxy
- Static asset serving
- Docker containerization
- SSL/HTTPS support
- Maintenance page fallback
- Asset compression (gzip)
- Proper caching headers

## Quick Start

```bash
bun install
bun run build
docker-compose -f docker/docker-compose.yml up
```

Visit `http://localhost`

## Configuration

The example uses:

- `serveAssets: false` - Nginx serves static assets
- Custom build script for Docker deployment
- Nginx configuration optimized for SvelteKit

## Docker Setup

```bash
# Build and run
docker-compose -f docker/docker-compose.yml up --build

# Stop
docker-compose -f docker/docker-compose.yml down
```

## Production Notes

- Configure SSL certificates in `docker/nginx.conf`
- Update `server_name` for your domain
- Set proper `ORIGIN` environment variable
- Consider load balancing for high traffic
