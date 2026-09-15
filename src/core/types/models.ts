export type Speaker = 'user' | 'assistant';
export type EvidenceKind = 'exposure' | 'understanding' | 'assisted' | 'independent' | 'lapse';
export type Outcome = 'success' | 'partial' | 'breakdown' | 'uncertain';

export interface Fragment {
  id: string;
  revision: number;
  previousTexts: string[];
  speaker: Speaker;
  text: string;
  startMS: number;
  endMS: number;
  receivedAt: string;
  meaningVisible: boolean;
  typed: boolean;
}

export interface Passage {
  id: string;
  speaker: Speaker;
  fragments: Fragment[];
  text: string;
  revisionKey: string;
  startMS: number;
  endMS: number;
}

export interface WordProposal {
  lemma: string;
  meaning: string;
  form: string;
  kind: EvidenceKind;
  confidence: number;
  sourceIDs: string[];
  quote: string;
  language: string;
}

export interface Assessment {
  passageID: string;
  revisionKey: string;
  outcome: Outcome;
  suggestedLevel: number;
  nextGoal: string;
  capability: string;
  words: WordProposal[];
  createdAt: string;
  context: string;
}

export interface SourceLink {
  id: string;
  title: string;
  url: string;
}

export interface TopicBrief {
  id: string;
  languageID: string;
  query: string;
  text: string;
  sources: SourceLink[];
  retrievedAt: string;
}

export interface SessionRecord {
  id: string;
  languageID: string;
  providerID?: string;
  startedAt: string;
  endedAt?: string;
  themeID?: string;
  title: string;
  fragments: Fragment[];
  assessments: Assessment[];
  translations: Record<string, string>; // cacheKey -> translation
  topics: TopicBrief[];
  voiceSeconds: number;
  inputTokens: number;
  outputTokens: number;
  endReason?: string;
}

export interface Preferences {
  learningLanguageID: string;
  meaningVisible: boolean;
  meaningLanguage: string;
  sessionMinutes: number;
  interests: string;
  provider: 'free' | 'deepgram' | 'openai';
  openaiKey?: string;
  deepgramKey?: string;
  deepgramVoice?: string;
  groqKey?: string;
  geminiKey?: string;
  preferredVoice?: string;
}

/**
 * Groups raw fragments into passages according to temporal proximity and speaker.
 * Fragments from the same speaker within 2200ms are grouped together.
 */
export function groupIntoPassages(fragments: Fragment[]): Passage[] {
  const sorted = [...fragments].sort((a, b) => a.startMS - b.startMS);
  const passages: Passage[] = [];

  for (const fragment of sorted) {
    const last = passages[passages.length - 1];
    if (
      last &&
      last.speaker === fragment.speaker &&
      fragment.startMS - last.endMS <= 2200 &&
      !fragment.typed &&
      !last.fragments[last.fragments.length - 1]?.typed
    ) {
      last.fragments.push(fragment);
      last.text = last.fragments.map((f) => f.text.trim()).filter(Boolean).join(' ');
      last.revisionKey = last.fragments.map((f) => `${f.id}:${f.revision}`).join(',');
      last.endMS = Math.max(last.endMS, fragment.endMS);
    } else {
      passages.push({
        id: fragment.id,
        speaker: fragment.speaker,
        fragments: [fragment],
        text: fragment.text,
        revisionKey: `${fragment.id}:${fragment.revision}`,
        startMS: fragment.startMS,
        endMS: fragment.endMS,
      });
    }
  }

  return passages;
}
