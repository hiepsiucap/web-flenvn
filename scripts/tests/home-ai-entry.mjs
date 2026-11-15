import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
try {
  for (const [width, signedIn] of [[1280, true], [390, true], [390, false]]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
    const sent = [];
    if (signedIn) await page.addInitScript(() => { if (!localStorage.getItem('accessToken')) localStorage.setItem('accessToken', 'test'); });
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname.replace('/api/v1/', '/api/');
      const method = route.request().method();
      let json = {};
      if (path === '/api/users/profile') json = { id: 'test', email: 'test@example.com', level: 1, exp: 0 };
      if (path === '/api/books') json = [];
      if (path === '/api/auth/login') json = { success: true, data: { accessToken: 'test', refreshToken: 'refresh' } };
      if (path === '/api/ai/conversations') json = method === 'POST' ? { id: 'new-chat', title: 'New conversation' } : { conversations: [{ id: 'old-chat', title: 'Old conversation' }], nextCursor: null };
      if (path.endsWith('/messages') && method === 'GET') json = { messages: [], nextCursor: null };
      if (path === '/api/ai/conversations/new-chat/messages' && method === 'POST') {
        const body = route.request().postDataJSON(); sent.push(body);
        json = { userMessage: { id: 'u', role: 'user', content: body.message, createdAt: new Date().toISOString() }, assistantMessage: { id: 'a', role: 'assistant', content: 'Here is your home-page answer.', createdAt: new Date().toISOString() } };
      }
      return route.fulfill({ status: path === '/api/streak' ? 503 : 200, json });
    });
    await page.goto(signedIn ? 'http://localhost:3000/' : 'http://localhost:3000/?auth=login');
    if (!signedIn) {
      const auth = page.getByRole('dialog', { name: 'Welcome back', exact: true });
      await auth.getByRole('button', { name: 'Close', exact: true }).click();
      await auth.waitFor({ state: 'hidden' });
    }
    const input = page.getByRole('textbox', { name: 'Ask the AI assistant', exact: true });
    await input.waitFor({ timeout: 5000 });
    if (signedIn) {
      await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Ask the AI assistant');
      assert.equal(await input.evaluate(el => el === document.activeElement), true, 'Home input receives focus');
    }
    const box = await input.boundingBox();
    assert(box.y + box.height < 844, 'Input is above the fold');
    assert(signedIn ? box.height <= 56 : box.height >= 100, 'Dashboard input is compact; landing input stays large');
    if (width === 390) await page.screenshot({ path: signedIn ? '/private/tmp/flenvn-home-chat-input.png' : '/private/tmp/flenvn-landing-chat-input.png' });
    const submit = page.getByRole('button', { name: 'Start AI chat', exact: true });
    assert.equal(await submit.isDisabled(), true);
    await input.fill('Explain the difference between say and tell');
    await submit.click();
    if (!signedIn) {
      const auth = page.getByRole('dialog', { name: 'Welcome back', exact: true });
      await auth.waitFor({ timeout: 5000 });
      await auth.getByLabel('Email', { exact: true }).fill('test@example.com');
      await auth.getByLabel('Password', { exact: true }).fill('password123');
      await auth.getByRole('button', { name: 'Continue studying', exact: true }).click();
    }
    await page.waitForURL('**/vocabulary', { timeout: 5000 });
    await page.getByText('Here is your home-page answer.', { exact: true }).waitFor({timeout: 5000}).catch(async error => { console.log('Sent:', sent, 'Page:', (await page.locator('body').innerText()).slice(-1600)); throw error; });
    assert.equal(await page.getByRole('button', { name: 'Open AI chat', exact: true }).count(), 0, 'Floating chat is hidden on the AI chat page');
    assert.equal(sent.length, 1);
    assert.equal(sent[0].message, 'Explain the difference between say and tell');
    await page.reload();
    await page.getByRole('textbox', { name: 'Message Gemini', exact: true }).waitFor();
    assert.equal(sent.length, 1, 'Reload does not submit the home message twice');
    console.log(`PASS ${width}px ${signedIn ? "signed in" : "sign-in handoff"}: large home input → new AI chat → message sent once`);
    await page.close();
  }
} finally { await browser.close(); }
