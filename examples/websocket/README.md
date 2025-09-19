# WebSocket Example

This example demonstrates how to use WebSocket server with `svelte-adapter-bun`.

## How it works

`svelte-adapter-bun` supports WebSocket connections through Bun's built-in WebSocket API. To enable them, you need to:

1. **Create a WebSocket hook** in `src/hooks.server.ts`
2. **Handle WebSocket requests** in the handle function
3. **Connect to WebSocket** from the client side

## File structure

```
src/
├── hooks.server.ts    # WebSocket hook and request handling
└── routes/
    └── +page.svelte   # Client component with WebSocket connection
```

## Server setup

### 1. Creating WebSocket hook

In `src/hooks.server.ts`, you need to create two exports:

```ts
import type { Handle } from '@sveltejs/kit';

// Handle WebSocket requests
export const handle: Handle = async ({ event, resolve }) => {
  const { request } = event;
  const url = new URL(request.url);

  // Check if this is a WebSocket request
  if (
    request.headers.get('connection')?.toLowerCase().includes('upgrade') &&
    request.headers.get('upgrade')?.toLowerCase() === 'websocket' &&
    url.pathname.startsWith('/ws') // WebSocket endpoint
  ) {
    console.log('Upgrading to WebSocket...');
    // Upgrade connection to WebSocket
    await event.platform!.server.upgrade(event.platform!.request);
    return new Response(null, { status: 101 });
  }

  return resolve(event);
};

// WebSocket handler
export const websocket: Bun.WebSocketHandler<undefined> = {
  // When client connects
  async open(ws) {
    console.log('WebSocket opened');
    ws.send('Slava Ukraїni'); // Send greeting
  },

  // When receiving message from client
  message(ws, message) {
    console.log('WebSocket message received:', message);
    // Echo response: return the same message
    ws.send(message);
  },

  // When client disconnects
  close(ws) {
    console.log('WebSocket closed');
  },
};
```

### 2. TypeScript types

Add to `src/app.d.ts`:

```ts
declare global {
  namespace App {
    interface Platform {
      server: Bun.Server;
      request: Request;
    }
  }
}

export {};
```

## Client setup

### Connecting to WebSocket

In Svelte component (`src/routes/+page.svelte`):

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  onMount(() => {
    // Connect to WebSocket server
    const socket = new WebSocket('ws://localhost:3000/ws');

    // Handle connection open
    socket.onopen = () => {
      console.log('Connected to WebSocket server');
    };

    // Handle messages from server
    socket.onmessage = event => {
      console.log('Received:', event.data);
      // Update component state here
    };

    // Handle connection close
    socket.onclose = () => {
      console.log('Disconnected from server');
    };

    // Handle errors
    socket.onerror = event => {
      console.error('WebSocket error:', event);
    };

    // Function to send messages
    function sendMessage(message: string) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    }
  });
</script>

<!-- Your UI here -->
```

## Running the example

1. **Install dependencies:**

   ```bash
   bun install
   ```

2. **Start dev server:**

   ```bash
   bun run dev
   ```

3. **Open browser:**
   Go to `http://localhost:3000`

4. **Check WebSocket:**
   Open Developer Tools → Network → WS and look for the connection

## Production build

```bash
# Build
bun run build

# Run production server
cd build
bun run ./index.js
```

## Usage examples

### Chat application

```ts
const connectedClients = new Set<WebSocket>();

export const websocket: Bun.WebSocketHandler<undefined> = {
  async open(ws) {
    connectedClients.add(ws);
    ws.send(
      JSON.stringify({
        type: 'system',
        message: 'Welcome to chat!',
      })
    );
  },

  message(ws, message) {
    const data = JSON.parse(message.toString());

    // Broadcast message to all clients
    connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: 'chat',
            message: data.message,
            timestamp: new Date().toISOString(),
          })
        );
      }
    });
  },

  close(ws) {
    connectedClients.delete(ws);
  },
};
```

### Real-time notifications

```ts
const notificationSubscribers = new Map<string, Set<WebSocket>>();

export const websocket: Bun.WebSocketHandler<{ userId: string }> = {
  async open(ws, data) {
    const userId = data?.userId || 'anonymous';
    ws.data = { userId };

    // Add to notification subscribers
    if (!notificationSubscribers.has(userId)) {
      notificationSubscribers.set(userId, new Set());
    }
    notificationSubscribers.get(userId)!.add(ws);
  },

  close(ws) {
    const userId = ws.data?.userId;
    if (userId && notificationSubscribers.has(userId)) {
      notificationSubscribers.get(userId)!.delete(ws);
    }
  },
};

// Function to send notifications
function sendNotification(userId: string, message: string) {
  const subscribers = notificationSubscribers.get(userId);
  if (subscribers) {
    subscribers.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'notification',
            message,
            timestamp: Date.now(),
          })
        );
      }
    });
  }
}
```

## Limitations and recommendations

- **Message types**: WebSocket can only send strings, ArrayBuffer or Blob
- **Error handling**: Always add error handling for WebSocket connections
- **Reconnection**: Implement automatic reconnection logic on the client
- **Security**: Validate all incoming messages before processing
- **Scaling**: For large applications, consider using Redis or similar solutions for multi-server synchronization

## Additional resources

- [Bun WebSocket API](https://bun.sh/docs/api/websockets)
- [MDN WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [SvelteKit Hooks](https://kit.svelte.dev/docs/hooks)
