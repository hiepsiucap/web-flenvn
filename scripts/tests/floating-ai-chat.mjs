import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch();
try {
  for (const width of [1280, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const calls = [];
    let failNext = false;
    let conversations = 0;
    await page.addInitScript(() => localStorage.setItem('accessToken', 'test'));
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname.replace('/api/v1/', '/api/');
      let json = {};
      if (path === '/api/users/profile') json = { id: 'test', email: 'test@example.com', level: 1, exp: 0 };
      if (path === '/api/books') json = [{ id: 'book', title: 'Chat test book', totalCards: 0 }];
      if (path === '/api/ai/conversations') { conversations++; json = { id: 'chat', title: 'Quick chat' }; }
      if (path === '/api/ai/conversations/chat/messages') {
        const body = route.request().postDataJSON();
        calls.push(body);
        await new Promise(resolve => setTimeout(resolve, 150));
        if (failNext) { failNext = false; return route.fulfill({ status: 503, json: { message: 'Try again shortly.' } }); }
        json = { userMessage: { id: 'u'+calls.length, role: 'user', content: body.message, createdAt: new Date().toISOString() }, assistantMessage: { id: 'a'+calls.length, role: 'assistant', content: 'Here is an explanation.', createdAt: new Date().toISOString() } };
      }
      return route.fulfill({ status: path === '/api/streak' ? 503 : 200, json });
    });
    await page.goto('http://localhost:3000/books');
    const launcher = page.getByRole('button', { name: 'Open AI chat', exact: true });
    await launcher.waitFor({ timeout: 5000 });
    assert.equal(conversations, 0, 'Opening a page must not create an AI conversation');
    await launcher.click();
    const chat = page.getByRole('dialog', { name: 'AI chat', exact: true });
    await chat.waitFor();
    const box = await chat.boundingBox();
    assert(box.x >= 0 && box.x + box.width <= width && box.y >= 0 && box.y + box.height <= 900, 'Chat fits viewport');
    const input = chat.getByRole('textbox', { name: 'Message AI assistant' });
    await input.fill('Explain this word');
    await input.press('Enter');
    await chat.getByText('Here is an explanation.', { exact: true }).waitFor();
    assert.equal(await chat.evaluate(el => el.scrollWidth <= el.clientWidth), true, 'No horizontal overflow');
    if (width === 390) await page.screenshot({ path: '/private/tmp/flenvn-floating-chat-mobile.png' });
    assert.equal(conversations, 1);
    await chat.getByRole('button', { name: 'Close AI chat' }).click();
    await chat.waitFor({ state: 'hidden' });
    await launcher.click();
    await chat.getByText('Explain this word', { exact: true }).waitFor();
    failNext = true;
    await input.fill('Help me again');
    await chat.getByRole('button', { name: 'Send message', exact: true }).click();
    await chat.getByRole('alert').waitFor();
    await chat.getByRole('button', { name: 'Retry message', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[role="dialog"] [role="alert"]') === null);
    assert.equal(calls[1].clientMessageId, calls[2].clientMessageId, 'Retry reuses idempotency key');
    assert.equal(conversations, 1);
    await input.focus();
    await input.press('Escape');
    await chat.waitFor({ state: 'hidden' });
    await launcher.waitFor();
    console.log(`PASS ${width}px: open, viewport, send/reply, close/reopen history, failed send/retry, Escape`);
    await page.close();
  }
} finally { await browser.close(); }
