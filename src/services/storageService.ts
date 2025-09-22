// Enhanced storage service with better persistence and data integrity
export class StorageService {
  private static instance: StorageService;
  private memoryStorage: Map<string, string> = new Map();
  private readonly APP_PREFIX = 'nabhacare_';

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private isLocalStorageAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private isIndexedDBAvailable(): boolean {
    try {
      return typeof window !== 'undefined' && 'indexedDB' in window && indexedDB !== null;
    } catch {
      return false;
    }
  }

  // Enhanced setItem with data integrity checks
  setItem(key: string, value: string): void {
    const prefixedKey = this.APP_PREFIX + key;
    const dataWithTimestamp = {
      data: value,
      timestamp: Date.now(),
      version: '1.0'
    };
    const serializedData = JSON.stringify(dataWithTimestamp);

    try {
      // Primary storage: localStorage
      if (this.isLocalStorageAvailable()) {
        localStorage.setItem(prefixedKey, serializedData);
        // Verify the write was successful
        const verification = localStorage.getItem(prefixedKey);
        if (verification !== serializedData) {
          throw new Error('localStorage write verification failed');
        }
      } else {
        // Fallback to memory storage
        this.memoryStorage.set(prefixedKey, serializedData);
      }

      // Additional backup: Try to use IndexedDB for critical data
      if (key.includes('users') || key.includes('current_user')) {
        this.backupToIndexedDB(prefixedKey, serializedData);
      }

    } catch (error) {
      console.warn('Primary storage failed, using memory storage:', error);
      this.memoryStorage.set(prefixedKey, serializedData);
    }
  }

  // Enhanced getItem with data integrity checks
  getItem(key: string): string | null {
    const prefixedKey = this.APP_PREFIX + key;

    try {
      let rawData: string | null = null;

      // Try localStorage first
      if (this.isLocalStorageAvailable()) {
        rawData = localStorage.getItem(prefixedKey);
      }

      // Fallback to memory storage
      if (!rawData) {
        rawData = this.memoryStorage.get(prefixedKey) || null;
      }

      // Try IndexedDB backup for critical data
      if (!rawData && (key.includes('users') || key.includes('current_user'))) {
        rawData = this.getFromIndexedDBBackup(prefixedKey);
      }

      if (!rawData) return null;

      // Parse and validate data structure
      const parsedData = JSON.parse(rawData);
      if (parsedData && typeof parsedData === 'object' && 'data' in parsedData) {
        return parsedData.data;
      }

      // Fallback for old format data (backward compatibility)
      return rawData;

    } catch (error) {
      console.warn('Storage retrieval failed:', error);
      return this.memoryStorage.get(prefixedKey) || null;
    }
  }

  removeItem(key: string): void {
    const prefixedKey = this.APP_PREFIX + key;
    
    try {
      if (this.isLocalStorageAvailable()) {
        localStorage.removeItem(prefixedKey);
      }
      this.memoryStorage.delete(prefixedKey);
      
      // Remove from IndexedDB backup as well
      this.removeFromIndexedDBBackup(prefixedKey);
    } catch (error) {
      console.warn('Storage removal failed:', error);
      this.memoryStorage.delete(prefixedKey);
    }
  }

  clear(): void {
    try {
      if (this.isLocalStorageAvailable()) {
        // Only clear our app's data, not all localStorage
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(this.APP_PREFIX)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }
      this.memoryStorage.clear();
    } catch (error) {
      console.warn('Storage clear failed:', error);
      this.memoryStorage.clear();
    }
  }

  // Get storage info for debugging
  getStorageInfo(): { type: string; size: number; available: boolean } {
    if (this.isLocalStorageAvailable()) {
      try {
        const used = JSON.stringify(localStorage).length;
        return { type: 'localStorage', size: used, available: true };
      } catch {
        return { type: 'localStorage', size: 0, available: false };
      }
    }
    return { 
      type: 'memory', 
      size: Array.from(this.memoryStorage.values()).join('').length, 
      available: true 
    };
  }

  // Backup critical data to IndexedDB (non-blocking)
  private async backupToIndexedDB(key: string, data: string): Promise<void> {
    if (!this.isIndexedDBAvailable()) return;

    try {
      const request = indexedDB.open('NabhaCareDB', 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups');
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['backups'], 'readwrite');
        const store = transaction.objectStore('backups');
        store.put(data, key);
      };
    } catch (error) {
      console.warn('IndexedDB backup failed:', error);
    }
  }

  // Get data from IndexedDB backup (synchronous fallback)
  private getFromIndexedDBBackup(key: string): string | null {
    // This is a simplified synchronous version
    // In a real implementation, you'd want to make this async
    return null;
  }

  // Remove from IndexedDB backup
  private removeFromIndexedDBBackup(key: string): void {
    if (!this.isIndexedDBAvailable()) return;

    try {
      const request = indexedDB.open('NabhaCareDB', 1);
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['backups'], 'readwrite');
        const store = transaction.objectStore('backups');
        store.delete(key);
      };
    } catch (error) {
      console.warn('IndexedDB backup removal failed:', error);
    }
  }
}