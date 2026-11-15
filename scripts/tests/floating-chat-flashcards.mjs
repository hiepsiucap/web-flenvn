import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch();
try {
  for (const width of [1280, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    let submitted = null;
    let discovered = 0;
    await page.addInitScript(() => localStorage.setItem('accessToken', 'test'));
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname.replace('/api/v1/', '/api/');
      let json = {};
      if (path === '/api/users/profile') json = { id: 'test', email: 'test@example.com', level: 1, exp: 0 };
      if (path === '/api/books') json = [{ id: 'book', title: 'My vocabulary', totalCards: 0 }];
      if (path === '/api/ai/conversations') json = { id: 'chat', title: 'Quick chat' };
      if (path === '/api/ai/conversations/chat/messages') json = {
        userMessage: { id: 'u1', role: 'user', content: 'Teach me fruit words', createdAt: new Date().toISOString() },
        assistantMessage: { id: 'a1', role: 'assistant', content: 'Apple and banana are fruit words.', createdAt: new Date().toISOString() },
      };
      if (path === '/api/ai/conversations/chat/vocabulary/discover') {
        discovered++;
        json = { candidates: ['apple', 'banana'].map(text => ({ text, type: 'word', translation: 'Fruit translation', definition: 'A fruit', imageUrl: '/images/states/empty-books.webp', example: 'I eat fruit every day.', source: 'conversation', alreadyExists: false, existingBookTitle: null })) };
      }
      if (path === '/api/ai/conversations/vocabulary/save') {
        submitted = route.request().postDataJSON();
        json = { saved: 1, duplicates: 0, failed: 0, results: [{ text: 'apple', status: 'saved' }] };
      }
      return route.fulfill({ status: path === '/api/streak' ? 503 : 200, json });
    });
    await page.goto('http://localhost:3000/books');
    await page.getByRole('button', { name: 'Open AI chat', exact: true }).click();
    const chat = page.getByRole('dialog', { name: 'AI chat', exact: true });
    const save = chat.getByRole('button', { name: 'Save flashcards', exact: true });
    await chat.getByRole('textbox', { name: 'Message AI assistant' }).waitFor();
    assert.equal(await save.count(), 0, 'Hide Save flashcards until a successful AI reply');
    await chat.getByRole('textbox', { name: 'Message AI assistant' }).fill('Teach me fruit words');
    await chat.getByRole('button', { name: 'Send message', exact: true }).click();
    await chat.getByText('Apple and banana are fruit words.', { exact: true }).waitFor();
    assert.equal(submitted, null);
    await save.click();
    const picker = page.getByRole('dialog', { name: 'Collect vocabulary', exact: true });
    await picker.getByRole('checkbox', { name: 'Save apple', exact: true }).waitFor();
    await page.waitForTimeout(300);
    assert.equal(await picker.isVisible(), true, 'Picker stays mounted above the floating chat');
    assert.equal(await picker.getByText('A fruit', { exact: true }).count(), 2, 'Cards show a short definition preview');
    await picker.getByRole('img', { name: 'Picture for apple', exact: true }).waitFor();
    await picker.getByText('Fruit translation', { exact: true }).first().waitFor();
    const card = picker.getByRole('button', { name: 'View details for apple', exact: true });
    const cardBox = await card.boundingBox();
    assert(cardBox.height >= 100 && cardBox.height < 200, 'Cards balance photo and information');
    if (width === 390) await page.screenshot({ path: '/private/tmp/flenvn-vocabulary-photo-cards.png' });
    await card.click();
    const details = page.getByRole('dialog', { name: 'Edit card', exact: true });
    await details.getByRole('textbox', { name: 'Definition', exact: true }).waitFor();
    assert.equal(await details.getByRole('textbox', { name: 'Definition', exact: true }).inputValue(), 'A fruit');
    const blur = await page.locator('[data-slot=dialog-overlay]').evaluateAll(els => els.filter(el => getComputedStyle(el).display !== 'none').map(el => getComputedStyle(el).backdropFilter));
    assert(blur.some(value => value.includes('blur(')), 'Detail modal blurs the previous layer');
    if (width === 390) await page.screenshot({ path: '/private/tmp/flenvn-vocabulary-detail-layer.png' });
    await details.getByRole('textbox', { name: 'Translation', exact: true }).fill('Edited translation');
    await details.getByRole('button', { name: 'Back to vocabulary', exact: true }).click();
    await picker.getByRole('checkbox', { name: 'Save apple', exact: true }).waitFor();
    assert.equal(await picker.getByRole('checkbox', { name: 'Save apple', exact: true }).isChecked(), true, 'Opening details does not toggle selection');
    const banana = picker.getByRole('button', { name: 'View details for banana', exact: true });
    await banana.focus();
    await banana.press('Enter');
    await details.waitFor();
    await details.getByRole('button', { name: 'Back to vocabulary', exact: true }).click();
    await picker.getByRole('button', { name: 'Clear selection', exact: true }).click();
    await picker.getByRole('checkbox', { name: 'Save apple', exact: true }).click();
    assert.equal(submitted, null, 'Selection must not save automatically');
    await picker.getByRole('button', { name: 'Save 1 card', exact: true }).click();
    await picker.getByRole('heading', { name: '1 word saved to My vocabulary', exact: true }).waitFor();
    assert.equal(submitted.bookId, 'book');
    assert.deepEqual(submitted.candidates.map(c => c.text), ['apple']);
    assert.equal(submitted.candidates[0].translation, 'Edited translation');
    assert.equal(discovered, 1);
    await picker.getByRole('button', { name: 'Back to chat', exact: true }).click();
    await picker.waitFor({ state: 'hidden' });
    await chat.waitFor();
    await chat.getByText('Apple and banana are fruit words.', { exact: true }).waitFor();
    console.log(`PASS ${width}px: AI reply → pick vocabulary → save only selected flashcards → return to chat`);
    await page.close();
  }
} finally { await browser.close(); }
