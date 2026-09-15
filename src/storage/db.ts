import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { SessionRecord } from '../core/types/models';

interface SoroDB extends DBSchema {
  sessions: {
    key: string;
    value: SessionRecord;
    indexes: { 'by-language': string; 'by-started': string };
  };
}

const DB_NAME = 'soro_language_app';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SoroDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<SoroDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('sessions')) {
          const store = db.createObjectStore('sessions', { keyPath: 'id' });
          store.createIndex('by-language', 'languageID');
          store.createIndex('by-started', 'startedAt');
        }
      },
    });
  }
  return dbPromise;
}

export const StorageService = {
  async saveSession(session: SessionRecord): Promise<void> {
    if (typeof window === 'undefined') return;
    const db = await getDB();
    await db.put('sessions', session);
  },

  async getSession(id: string): Promise<SessionRecord | undefined> {
    if (typeof window === 'undefined') return undefined;
    const db = await getDB();
    return await db.get('sessions', id);
  },

  async getAllSessions(languageID: string = 'es'): Promise<SessionRecord[]> {
    if (typeof window === 'undefined') return [];
    const db = await getDB();
    const all = await db.getAllFromIndex('sessions', 'by-language', languageID);
    return all.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  },

  async deleteSession(id: string): Promise<void> {
    if (typeof window === 'undefined') return;
    const db = await getDB();
    await db.delete('sessions', id);
  },

  async clearAllSessions(): Promise<void> {
    if (typeof window === 'undefined') return;
    const db = await getDB();
    await db.clear('sessions');
  },
};
