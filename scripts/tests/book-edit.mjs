import { chromium } from 'playwright';
import assert from 'node:assert/strict';
(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const book = { id: 'book-edit-regression', title: 'Original book', totalCards: 0 };
      let saved;
      await page.addInitScript(() => localStorage.setItem('accessToken', 'test'));
      await page.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname.replace('/api/v1/', '/api/');
        let json = {};
        if (path === '/api/users/profile') json = { id: 'test', email: 'test@example.com', level: 1, exp: 0 };
        if (path === '/api/books') json = [book];
        if (path === '/api/books/book-edit-regression' && route.request().method() === 'PUT') {
          saved = route.request().postDataJSON();
          Object.assign(book, saved); json = book;
        }
        return route.fulfill({ status: path === '/api/streak' ? 503 : 200, json });
      });
      await page.goto('http://localhost:3000/books');
      await page.getByRole('button', { name: 'Actions for Original book', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Edit book', exact: true });
      await dialog.waitFor({ timeout: 5000 });
      await page.waitForTimeout(500);
      assert.equal(await dialog.isVisible(), true, "Edit dialog must stay open after the menu finishes closing");
      await dialog.getByLabel('Title', { exact: true }).fill('Updated book');
      await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(saved.title, 'Updated book');
      await page.getByRole('button', { name: 'Actions for Updated book', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
      await dialog.waitFor();
      assert.equal(await dialog.getByLabel('Title', { exact: true }).inputValue(), 'Updated book');
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      await page.getByRole('button', { name: 'List view', exact: true }).click();
      await page.getByRole('button', { name: 'Edit Updated book', exact: true }).click();
      await dialog.waitFor();
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      console.log(`PASS ${width}px: grid edit opens, saves, reopens and closes; list edit opens and closes`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
