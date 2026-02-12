import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface NabhaDB extends DBSchema {
  keyval: {
    key: string;
    value: any;
  };
}

export class StorageService {
  private static instance: StorageService;
  private memoryStorage: Map<string, string> = new Map();
  private dbPromise: Promise<IDBPDatabase<NabhaDB>>;
  private readonly APP_PREFIX = 'nabhacare_';
  private ready: Promise<void>;

  private constructor() {
     this.dbPromise = openDB<NabhaDB>('nabha-health-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('keyval')) {
          db.createObjectStore('keyval');
        }
      },
    });
    this.ready = this.loadFromDb();
  }

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // Called manually in main.tsx to ensure data is loaded before React renders
  async init(): Promise<void> {
    await this.ready;
  }

  private async loadFromDb() {
    try {
        const db = await this.dbPromise;
        const keys = await db.getAllKeys('keyval');
        for (const key of keys) {
            if (typeof key === 'string') {
                const val = await db.get('keyval', key);
                // Ensure value is string for compatibility with existing code which expects JSON strings
                // If it was stored as object (by my previous failed implementation attempts or other tools), stringify it.
                // Current code expects JSON strings.
                this.memoryStorage.set(key, typeof val === 'string' ? val : JSON.stringify(val));
            }
        }
    } catch (e) {
        console.error("Failed to load IDB", e);
    }
  }

  getItem(key: string): string | null {
    // Check with and without prefix for compatibility
    const prefixedKey = this.APP_PREFIX + key;
    if (this.memoryStorage.has(prefixedKey)) return this.memoryStorage.get(prefixedKey)!;
    if (this.memoryStorage.has(key)) return this.memoryStorage.get(key)!;
    
    // Fallback to localStorage if not in memory (migration path)
    // This helps if IDB is empty but LocalStorage has data
    if (localStorage.getItem(prefixedKey)) {
        return localStorage.getItem(prefixedKey);
    }
    return null;
  }

  setItem(key: string, value: string): void {
    const prefixedKey = this.APP_PREFIX + key;
    this.memoryStorage.set(prefixedKey, value);
    
    // Persist async
    this.dbPromise.then(db => {
        db.put('keyval', value, prefixedKey);
    });
    
    // Legacy support: also write to localStorage for critical keys (auth tokens) 
    // to ensure Auth persistence if IDB fails or for simple interoperability
    if (key.includes('token') || key.includes('user')) {
         localStorage.setItem(prefixedKey, value);
    }
  }

  removeItem(key: string): void {
    const prefixedKey = this.APP_PREFIX + key;
    this.memoryStorage.delete(prefixedKey);
    this.dbPromise.then(db => {
        db.delete('keyval', prefixedKey);
    });
    localStorage.removeItem(prefixedKey);
  }

  clear(): void {
      this.memoryStorage.clear();
      this.dbPromise.then(db => db.clear('keyval'));
      localStorage.clear();
  }
}
