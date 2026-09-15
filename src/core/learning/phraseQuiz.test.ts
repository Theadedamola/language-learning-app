import test from 'node:test';
import assert from 'node:assert/strict';
import {
  tokenizePhraseForPuzzle,
  shuffleTokens,
  getPhraseMasteryLabel,
  STARTER_PHRASES,
  UsefulPhrase,
} from '../types/phrase';

test('Phrase Quiz & Useful Phrases Engine', async (t) => {
  await t.test('tokenizes Spanish sentences cleanly for the puzzle', () => {
    const tokens = tokenizePhraseForPuzzle('¿Me puedes poner un café con leche, por favor?');
    assert.deepEqual(tokens, [
      'Me',
      'puedes',
      'poner',
      'un',
      'café',
      'con',
      'leche',
      'por',
      'favor',
    ]);
  });

  await t.test('shuffles tokens and maintains all word elements', () => {
    const original = ['Tengo', 'mucha', 'hambre', 'ahora'];
    const shuffled = shuffleTokens(original);
    assert.equal(shuffled.length, original.length);
    assert.deepEqual(shuffled.slice().sort(), original.slice().sort());
  });

  await t.test('provides progressive mastery labels from 0 to 3', () => {
    assert.equal(getPhraseMasteryLabel(0), 'New');
    assert.equal(getPhraseMasteryLabel(1), 'Practicing');
    assert.equal(getPhraseMasteryLabel(2), 'Familiar');
    assert.equal(getPhraseMasteryLabel(3), 'Mastered');
  });

  await t.test('starter phrases have valid structures and complete sentences', () => {
    assert.ok(STARTER_PHRASES.length >= 5);
    for (const phrase of STARTER_PHRASES) {
      assert.ok(phrase.id);
      assert.ok(phrase.phrase.length > 5);
      assert.ok(phrase.translation.length > 5);
      assert.ok(phrase.context.length > 2);
      assert.equal(phrase.mastery, 0);
    }
  });

  await t.test('correctly simulates mastery increment and decrement', () => {
    let phrase: UsefulPhrase = {
      id: 'test_1',
      phrase: 'Tengo mucha hambre',
      translation: "I'm very hungry",
      context: 'Daily',
      mastery: 0,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
    };

    // Correct answer -> mastery 0 to 1
    phrase = {
      ...phrase,
      mastery: Math.min(3, phrase.mastery + 1),
      reviewCount: phrase.reviewCount + 1,
    };
    assert.equal(phrase.mastery, 1);
    assert.equal(phrase.reviewCount, 1);

    // Another correct answer -> mastery 1 to 2
    phrase = {
      ...phrase,
      mastery: Math.min(3, phrase.mastery + 1),
      reviewCount: phrase.reviewCount + 1,
    };
    assert.equal(phrase.mastery, 2);

    // Incorrect answer -> drops down
    phrase = {
      ...phrase,
      mastery: Math.max(0, phrase.mastery - 1),
      reviewCount: phrase.reviewCount + 1,
    };
    assert.equal(phrase.mastery, 1);
  });
});
