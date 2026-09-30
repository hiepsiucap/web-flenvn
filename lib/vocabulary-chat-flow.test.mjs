import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFirstFollowUpMessage, runVocabularySearch } from './vocabulary-chat-flow.ts';

test('creates a private vocabulary book before the first automatic card save', async () => {
  let created = 0;
  const requests = [];
  const response = { word: 'bank', save: { status: 'saved' } };
  const result = await runVocabularySearch(
    { word: ' bank ', language: 'en', context: ' She went to the bank. ' },
    [],
    async () => { created += 1; return { id: 'book-1' }; },
    async (input) => { requests.push(input); return response; },
  );
  assert.equal(created, 1);
  assert.deepEqual(requests, [{ word: 'bank', language: 'en', context: 'She went to the bank.', bookId: 'book-1' }]);
  assert.equal(result, response);
});

test('uses the selected book without creating another one', async () => {
  const requests = [];
  await runVocabularySearch(
    { word: 'xin chào', language: 'vi', bookId: 'book-2' },
    [{ id: 'book-1' }, { id: 'book-2' }],
    async () => { throw new Error('unexpected book creation'); },
    async (input) => { requests.push(input); return {}; },
  );
  assert.equal(requests[0].bookId, 'book-2');
});

test('the first follow-up carries the searched term and context without a new search', () => {
  const message = buildFirstFollowUpMessage(
    { word: 'bank', context: 'She went to the bank.', answer: 'A financial institution.' },
    'Can I use it as a verb?',
  );
  assert.match(message, /bank/);
  assert.match(message, /She went to the bank/);
  assert.match(message, /Can I use it as a verb/);
});
