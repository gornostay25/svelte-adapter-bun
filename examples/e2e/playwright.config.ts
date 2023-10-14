import type { PlaywrightTestConfig } from '@playwright/test';
import { devices } from '@playwright/test';

// const command = process.env.SERVER_COMMAND;
const command = "concurrently --kill-others \"bun run dev\" \"bun run dev-helper\"";

const config: PlaywrightTestConfig = {
	webServer: {
		command,
		port: 3000,
		stdout: 'ignore',
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
