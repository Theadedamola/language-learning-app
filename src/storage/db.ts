import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { SessionRecord } from '../core/types/models';
import { UsefulPhrase, STARTER_PHRASES } from '../core/types/phrase';

interface SoroDB extends DBSchema {
  sessions: {
    key: string;
    value: SessionRecord;
    indexes: { 'by-language': string; 'by-started': string };
  };
  phrases: {
    key: string;
    value: UsefulPhrase;
    indexes: { 'by-created': string; 'by-mastery': number };
  };
}

const DB_NAME = 'soro_language_app';
const DB_VERSION = 2;
const LOCAL_PHRASES_BACKUP_KEY = 'soro_cached_phrases';

let dbPromise: Promise<IDBPDatabase<SoroDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<SoroDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('sessions')) {
          const store = db.createObjectStore('sessions', { keyPath: 'id' });
          store.createIndex('by-language', 'languageID');
          store.createIndex('by-started', 'startedAt');
        }
        if (!db.objectStoreNames.contains('phrases')) {
          const phraseStore = db.createObjectStore('phrases', { keyPath: 'id' });
          phraseStore.createIndex('by-created', 'createdAt');
          phraseStore.createIndex('by-mastery', 'mastery');
        }
      },
    });
  }
  return dbPromise;
}

export const StorageService = {
  async saveSession(session: SessionRecord): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const db = await getDB();
      await db.put('sessions', session);
    } catch (e) {
      console.warn('Failed to save session to IndexedDB:', e);
    }
  },

  async getSession(id: string): Promise<SessionRecord | undefined> {
    if (typeof window === 'undefined') return undefined;
    try {
      const db = await getDB();
      return await db.get('sessions', id);
    } catch {
      return undefined;
    }
  },

  async getAllSessions(languageID: string = 'es'): Promise<SessionRecord[]> {
    if (typeof window === 'undefined') return [];
    try {
      const db = await getDB();
      const all = await db.getAllFromIndex('sessions', 'by-language', languageID);
      return all.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
    } catch {
      return [];
    }
  },

  async deleteSession(id: string): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const db = await getDB();
      await db.delete('sessions', id);
    } catch (e) {
      console.warn('Failed to delete session:', e);
    }
  },

  async clearAllSessions(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const db = await getDB();
      await db.clear('sessions');
    } catch (e) {
      console.warn('Failed to clear sessions:', e);
    }
  },

  // ===== Useful Phrases Methods =====

  async savePhrase(phrase: UsefulPhrase): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const db = await getDB();
      await db.put('phrases', phrase);
      // Backup to localStorage as secondary persistence
      const current = this.getLocalPhrases();
      const updated = [phrase, ...current.filter((p) => p.id !== phrase.id)];
      localStorage.setItem(LOCAL_PHRASES_BACKUP_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save phrase to IndexedDB, fallback to localStorage:', e);
      const current = this.getLocalPhrases();
      const updated = [phrase, ...current.filter((p) => p.id !== phrase.id)];
      localStorage.setItem(LOCAL_PHRASES_BACKUP_KEY, JSON.stringify(updated));
    }
  },

  async getAllPhrases(): Promise<UsefulPhrase[]> {
    if (typeof window === 'undefined') return STARTER_PHRASES;
    try {
      const db = await getDB();
      const all = await db.getAll('phrases');
      if (all && all.length > 0) {
        return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      // Check localStorage backup
      const local = this.getLocalPhrases();
      if (local.length > 0) return local;

      // Seed starter phrases for immediate delight
      for (const starter of STARTER_PHRASES) {
        await db.put('phrases', starter);
      }
      return STARTER_PHRASES;
    } catch {
      const local = this.getLocalPhrases();
      return local.length > 0 ? local : STARTER_PHRASES;
    }
  },

  async updatePhraseMastery(id: string, correct: boolean): Promise<UsefulPhrase | undefined> {
    if (typeof window === 'undefined') return undefined;
    try {
      const db = await getDB();
      const phrase = await db.get('phrases', id);
      if (!phrase) return undefined;

      const newMastery = correct
        ? Math.min(3, phrase.mastery + 1)
        : Math.max(0, phrase.mastery - 1);

      const updated: UsefulPhrase = {
        ...phrase,
        mastery: newMastery,
        reviewCount: (phrase.reviewCount || 0) + 1,
        lastReviewedAt: new Date().toISOString(),
      };

      await db.put('phrases', updated);
      // Update backup
      const local = this.getLocalPhrases().map((p) => (p.id === id ? updated : p));
      localStorage.setItem(LOCAL_PHRASES_BACKUP_KEY, JSON.stringify(local));
      return updated;
    } catch (e) {
      console.warn('Failed to update phrase mastery:', e);
      return undefined;
    }
  },

  async deletePhrase(id: string): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const db = await getDB();
      await db.delete('phrases', id);
      const local = this.getLocalPhrases().filter((p) => p.id !== id);
      localStorage.setItem(LOCAL_PHRASES_BACKUP_KEY, JSON.stringify(local));
    } catch (e) {
      console.warn('Failed to delete phrase:', e);
    }
  },

  async clearAllPhrases(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const db = await getDB();
      await db.clear('phrases');
      localStorage.removeItem(LOCAL_PHRASES_BACKUP_KEY);
    } catch (e) {
      console.warn('Failed to clear phrases:', e);
    }
  },

  getLocalPhrases(): UsefulPhrase[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(LOCAL_PHRASES_BACKUP_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
};
