export interface WordState {
  id: string; // key: language|lemma|meaning
  lemma: string;
  meaning: string;
  form: string;
  example: string;
  bars: number; // 0 to 3
  understandingCount: number;
  independentCount: number;
  lastSeen: string;
  dueAt: string;
}

export function getWordLabel(bars: number): string {
  const clamped = Math.min(3, Math.max(0, bars));
  return ['New', 'Fragile', 'Growing', 'Consolidated'][clamped];
}

export function getWordExplanation(word: WordState): string {
  if (word.independentCount === 0) {
    return 'Heard or used with subtitle support. Try using it in your own words.';
  }
  if (word.bars === 1) {
    return 'Used independently. We will bring it back into conversation soon.';
  }
  if (word.bars === 2) {
    return 'Recalled on different days. Still worth revisiting.';
  }
  return 'Recalled across multiple days and contexts. Mastered!';
}

export interface LearnerState {
  challenge: number; // 0 to 5
  observationCount: number;
  nextGoal: string;
  capabilities: string[];
  words: WordState[];
}
