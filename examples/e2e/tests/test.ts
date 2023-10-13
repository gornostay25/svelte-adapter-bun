import { expect, test } from '@playwright/test';

test('main test', async ({ page }) => {
	await page.goto('/');

	await expect(page.getByText("Demo page")).toBeVisible();

	const status = page.getByTestId("connected");
	const messages = page.getByTestId("messages");
	const sendInput = page.getByTestId("send");
	const sendBtn = page.getByTestId("submit")
	await expect(status).toHaveText("true");
	await expect(messages).toContainText(`[init]: Hello from server`);

	await sendInput.fill("message 1");
	await sendBtn.click();

	await expect(messages).toContainText(`[pong]: message 1`)

});
