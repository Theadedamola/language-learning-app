export interface UsefulPhrase {
  id: string;
  phrase: string;
  translation: string;
  context: string;
  originalSaid?: string;
  explanation?: string;
  mastery: number; // 0 (New) -> 1 (Practiced) -> 2 (Familiar) -> 3 (Mastered)
  reviewCount: number;
  lastReviewedAt?: string;
  createdAt: string;
}

export const STARTER_PHRASES: UsefulPhrase[] = [
  {
    id: 'starter_1',
    phrase: 'Tengo mucha hambre, ¿vamos a comer algo?',
    translation: "I'm very hungry, shall we go eat something?",
    context: 'Daily Conversation',
    explanation: "Express hunger using 'tener hambre' (literally 'to have hunger') rather than 'ser/estar'.",
    mastery: 0,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'starter_2',
    phrase: '¿Me puedes poner un café con leche, por favor?',
    translation: 'Can I have a coffee with milk, please?',
    context: 'Cafe & Breakfast',
    explanation: "'¿Me puedes poner...?' is the natural everyday way native speakers order in Spanish cafes.",
    mastery: 0,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'starter_3',
    phrase: '¿A qué hora quedamos esta tarde?',
    translation: 'What time shall we meet this afternoon?',
    context: 'Social & Plans',
    explanation: "'Quedar' means to meet up or make plans with friends.",
    mastery: 0,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'starter_4',
    phrase: '¿Cuánto cuesta todo esto en total?',
    translation: 'How much is all of this in total?',
    context: 'Market & Shopping',
    explanation: "Use '¿Cuánto cuesta...?' or '¿Cuánto es?' when asking for prices at markets or stores.",
    mastery: 0,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'starter_5',
    phrase: 'No lo entiendo muy bien, ¿puedes hablar más despacio?',
    translation: "I don't understand very well, could you speak slower?",
    context: 'Learning & Communication',
    explanation: "A lifesaver conversational phrase for learners when talking with native speakers.",
    mastery: 0,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
  },
];

export function getPhraseMasteryLabel(mastery: number): string {
  switch (mastery) {
    case 0:
      return 'New';
    case 1:
      return 'Practicing';
    case 2:
      return 'Familiar';
    case 3:
      return 'Mastered';
    default:
      return 'New';
  }
}

/**
 * Splits a sentence into clean word tokens for interactive scrambling,
 * keeping punctuation attached or cleanly separated.
 */
export function tokenizePhraseForPuzzle(phrase: string): string[] {
  // Strip trailing punctuation like ¿ ? ¡ ! .
  const clean = phrase.trim().replace(/^[¿¡]+/, '');
  const tokens = clean.split(/\s+/).map((w) => w.replace(/[.,;:!?]/g, ''));
  return tokens.filter((t) => t.length > 0);
}

/**
 * Shuffles word tokens randomly using Fisher-Yates.
 */
export function shuffleTokens(tokens: string[]): string[] {
  const arr = [...tokens];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // Ensure shuffled is not accidentally identical to original if length > 1
  if (arr.length > 1 && arr.every((t, i) => t === tokens[i])) {
    [arr[0], arr[1]] = [arr[1], arr[0]];
  }
  return arr;
}
