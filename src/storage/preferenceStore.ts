import { Preferences } from '../core/types/models';

const STORAGE_KEY = 'soro_preferences';

export const defaultPreferences: Preferences = {
  learningLanguageID: 'es',
  meaningVisible: true,
  meaningLanguage: 'English',
  sessionMinutes: 15,
  interests: 'Viajes, gastronomía, música y vida cotidiana.',
  provider: 'free', // 'free' uses browser STT + free LLM + browser TTS; 'deepgram' uses Deepgram; 'openai' uses Realtime
};

export const PreferenceStore = {
  get(): Preferences {
    if (typeof window === 'undefined') return defaultPreferences;
    try {
      const item = localStorage.getItem(STORAGE_KEY);
      if (!item) return defaultPreferences;
      return { ...defaultPreferences, ...JSON.parse(item) };
    } catch {
      return defaultPreferences;
    }
  },

  set(prefs: Partial<Preferences>): Preferences {
    if (typeof window === 'undefined') return defaultPreferences;
    const current = this.get();
    const updated = { ...current, ...prefs };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  },
};
