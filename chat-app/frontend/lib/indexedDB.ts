import { openDB, IDBPDatabase } from 'idb';
import { PendingMessage } from '../types';

const DB_NAME = 'chatapp';
const DB_VERSION = 1;

let db: IDBPDatabase | null = null;

const getDB = async () => {
  if (db) return db;
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      // Pending messages queue (offline)
      if (!database.objectStoreNames.contains('pendingMessages')) {
        const store = database.createObjectStore('pendingMessages', { keyPath: 'clientId' });
        store.createIndex('conversationId', 'conversationId');
        store.createIndex('createdAt', 'createdAt');
      }
      // Message cache for faster reads
      if (!database.objectStoreNames.contains('messages')) {
        const msgStore = database.createObjectStore('messages', { keyPath: '_id' });
        msgStore.createIndex('conversationId', 'conversationId');
        msgStore.createIndex('createdAt', 'createdAt');
      }
    },
  });
  return db;
};

// ── PENDING MESSAGES (Offline Queue) ──

export const savePendingMessage = async (msg: PendingMessage): Promise<void> => {
  const database = await getDB();
  await database.put('pendingMessages', { ...msg, savedAt: new Date().toISOString() });
};

export const getPendingMessages = async (): Promise<PendingMessage[]> => {
  const database = await getDB();
  return database.getAll('pendingMessages');
};

export const removePendingMessage = async (clientId: string): Promise<void> => {
  const database = await getDB();
  await database.delete('pendingMessages', clientId);
};

export const clearPendingMessages = async (): Promise<void> => {
  const database = await getDB();
  await database.clear('pendingMessages');
};

// ── MESSAGE CACHE ──

export const cacheMessages = async (messages: any[]): Promise<void> => {
  const database = await getDB();
  const tx = database.transaction('messages', 'readwrite');
  await Promise.all(messages.map((m) => tx.store.put(m)));
  await tx.done;
};

export const getCachedMessages = async (conversationId: string, limit = 20): Promise<any[]> => {
  const database = await getDB();
  const all = await database.getAllFromIndex('messages', 'conversationId', conversationId);
  return all
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
    .reverse();
};
