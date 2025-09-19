<script lang="ts">
  import { onMount } from 'svelte';

  onMount(() => {
    const socket = new WebSocket('ws://localhost:3000/ws');
    socket.onmessage = event => {
      document.querySelector('pre')!.textContent += event.data + '\n';
    };
    socket.onopen = () => {
      document.querySelector('pre')!.textContent += 'Connected to server\n';
    };
    socket.onclose = () => {
      document.querySelector('pre')!.textContent +=
        'Disconnected from server\n';
    };
    socket.onerror = event => {
      document.querySelector('pre')!.textContent += `Error: ${event.message}\n`;
    };
  });
</script>

<h1>Welcome to SvelteKit</h1>
<p>
  Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the
  documentation
</p>

<pre></pre>
