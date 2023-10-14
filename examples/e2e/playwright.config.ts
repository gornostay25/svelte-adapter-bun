import type { PlaywrightTestConfig } from '@playwright/test';
import { devices } from '@playwright/test';

let command = '';

switch (process.env.TEST_SERVER) {
	case 'dev':
		command = 'bun run dev';
		break;
	case 'prod':
		command = 'bun run build && bun ./build/index.js';
		break;
	case 'dev-working':
		command = 'bun run dev2 & bun run dev';
		break;

	default:
		throw new Error(`unknown command ${process.env.TEST_SERVER}`);
}

const config: PlaywrightTestConfig = {
	webServer: {
		command,
		port: 3000,
		stdout: 'pipe',
		stderr: 'pipe'
	},
	use: {
		baseURL: 'http://localhost:3000',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure'
	},
	testDir: 'tests',
	testMatch: /(.+\.)?(test|spec)\.[jt]s/,

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	]
};

export default config;
