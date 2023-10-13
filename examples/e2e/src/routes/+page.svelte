<script lang="ts">
	import { browser } from '$app/environment';

	let ws: WebSocket | null = null;


	let connecting = true;
	let connected = false;

	let messages: string[] = [];

	let sendValue: string = '';

	if (browser) {
		console.log('in browser');

		ws = new WebSocket(`ws://${location.host}/ws`);

		ws.addEventListener('open', (ev) => {
			connected = true;
			connecting = false;
		});
		ws.addEventListener('close', () => {
			connected = false;
			connecting = false;
		});

		ws.addEventListener('message', (ev) => {
			const msg = ev.data;

			messages = [...messages, msg];
		});
	} else {
		// console.log('not browser');
	}

	function sendMsg() {
		if (!ws || !ws.OPEN) throw new Error('connection not open');

		ws.send(sendValue);
		sendValue = '';
	}
</script>

<h1>Demo page</h1>

<div>
	<h3>Connection status</h3>
	<div>Connecting: <span data-testid="connecting">{connecting.toString()}</span></div>
	<div>Connected: <span data-testid="connected">{connected.toString()}</span></div>
</div>

<div>
	<h3>Messages</h3>

	<ul data-testid="messages">
		{#each messages as message, index}
			<li>{message}</li>
		{/each}
	</ul>
</div>

<div>
	<h3>Send</h3>
	<form on:submit|preventDefault={sendMsg}>
		<input data-testid="send" placeholder="playload" bind:value={sendValue} />
		<button data-testid="submit" type="submit" disabled={!connected || !sendValue}>Send</button>
	</form>
</div>
