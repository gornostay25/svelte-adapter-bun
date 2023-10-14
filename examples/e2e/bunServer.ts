/* eslint-disable @typescript-eslint/no-explicit-any */
import {handleWebsocket} from "./src/hooks.server"

// and start this server
const server = Bun.serve({
	port: 9998,
	fetch(req, server) {
		// upgrade the request to a WebSocket
        const ok =  handleWebsocket.upgrade(req, server.upgrade.bind(server))
        
        if (ok)
            return;
 
		return new Response('Upgrade failed :(', { status: 500 });
	},
    websocket: handleWebsocket as any
});

console.log(`Helper Bun server listening on ${server.hostname + ":" + server.port}`);