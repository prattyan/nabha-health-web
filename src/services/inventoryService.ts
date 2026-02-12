import { InventoryItem, InventoryTransaction } from '../types/inventory';
import { StorageService } from './storageService';
import { ApiClient } from './apiClient';
import { SyncService } from './syncService';

const STORAGE_KEY_INVENTORY = 'nabha_inventory';

export class InventoryService {
  private static instance: InventoryService;
  private storage: StorageService;
  private api: ApiClient;
  private sync: SyncService;

  private constructor() {
    this.storage = StorageService.getInstance();
    this.api = ApiClient.getInstance();
    this.sync = SyncService.getInstance();
    this.refreshInventory();
  }

  public static getInstance(): InventoryService {
    if (!InventoryService.instance) {
      InventoryService.instance = new InventoryService();
    }
    return InventoryService.instance;
  }

  public async refreshInventory(): Promise<void> {
    if (!navigator.onLine) return;
    try {
      const response = await this.api.get<{ items: InventoryItem[] }>('/pharmacy/inventory');
      if (response && Array.isArray(response.items)) {
        this.storage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(response.items));
      }
    } catch (e) {
      console.error('Failed to refresh inventory:', e);
    }
  }

  // Aliases for UI compatibility
  public async autoSync() {
      return this.refreshInventory();
  }
  
  public async syncWithDistributor() {
      return this.refreshInventory();
  }

  public getInventory(): InventoryItem[] {
    const raw = this.storage.getItem(STORAGE_KEY_INVENTORY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as InventoryItem[]) : [];
    } catch {
      return [];
    }
  }

  public getItemBySku(sku: string): InventoryItem | undefined {
    return this.getInventory().find(i => i.sku === sku);
  }

  public updateStock(itemId: string, quantityChange: number, type: 'in' | 'out' | 'adjustment', userId: string, reason?: string): InventoryItem | null {
    const items = this.getInventory();
    const index = items.findIndex(i => i.id === itemId);
    if (index === -1) return null;

    const item = items[index];
    const newQuantity = item.quantity + quantityChange;
    
    // Optimistic Update
    const updatedItem = { ...item, quantity: newQuantity, lastUpdated: new Date().toISOString() };
    items[index] = updatedItem;
    this.storage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(items));

    // Sync to backend
    this.sync.enqueue({
        entity: 'PharmacyInventoryItem',
        action: 'upsert',
        entityId: itemId,
        data: {
             id: itemId,
             sku: item.sku,
             name: item.name,
             quantity: newQuantity,
             unit: item.unit,
             minStockLevel: item.minStockLevel,
             batchNumber: item.batchNumber,
             expiryDate: item.expiryDate
        },
    });

    return updatedItem;
  }

  public addItems(newItems: Omit<InventoryItem, 'id' | 'lastUpdated'>[]): void {
      const items = this.getInventory();
      for (const newItem of newItems) {
          const id = crypto.randomUUID();
          const item: InventoryItem = {
              ...newItem,
              id,
              lastUpdated: new Date().toISOString()
          };
          items.push(item);

          this.sync.enqueue({
              entity: 'PharmacyInventoryItem',
              action: 'upsert',
              entityId: id,
              data: item
          });
      }
      this.storage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(items));
  }

  // Aliases for UI compatibility
  public async autoSync() {
      return this.refreshInventory();
  }
  
  public async syncWithDistributor() {
      return this.refreshInventory();
  }
}
