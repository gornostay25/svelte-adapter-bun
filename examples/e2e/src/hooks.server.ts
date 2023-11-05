// hooks.server.js
import type { WebSocketHandler } from 'svelte-adapter-bun';

import type { Handle } from '@sveltejs/kit';
export const handle: Handle = async ({ event, resolve }) => {
	// console.log('start request to', event.url.pathname);
	const response = await resolve(event);
	// console.log('end request to', event.url.pathname);

	return response;
};

export const handleWebsocket: WebSocketHandler = {
	open(ws) {
		console.log('client connected');
		ws.send('[init]: Hello from server!');
	},
	message(ws, message) {
		console.log('client sent message', message);
		ws.send(`[pong]: ${message}`);
	},
	close() {
		console.log('client disconnected');
	},
	upgrade(request, upgrade) {
		const url = new URL(request.url);
		// console.log('waiting to upgrade', url);
		console.log('client upgrade', url.pathname);

		if (url.pathname.startsWith('/ws')){
            return upgrade(request);
        }
        return false;
	}
};
