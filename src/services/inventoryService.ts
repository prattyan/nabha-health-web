import { InventoryItem, InventoryTransaction } from '../types/inventory';
import { StorageService } from './storageService';

const STORAGE_KEY_INVENTORY = 'nabha_inventory';
const STORAGE_KEY_TRANSACTIONS = 'nabha_inventory_transactions';

export class InventoryService {
  private static instance: InventoryService;
  private storage: StorageService;

  private constructor() {
    this.storage = StorageService.getInstance();
    this.initializeInventory();
  }

  public static getInstance(): InventoryService {
    if (!InventoryService.instance) {
      InventoryService.instance = new InventoryService();
    }
    return InventoryService.instance;
  }

  private initializeInventory() {
    const existing = this.storage.getItem<InventoryItem[]>(STORAGE_KEY_INVENTORY);
    if (!existing) {
      const initialStock: InventoryItem[] = [
        { id: '1', name: 'Paracetamol 500mg', sku: '8901234567890', quantity: 500, unit: 'tablets', minStockLevel: 100, lastUpdated: new Date().toISOString() },
        { id: '2', name: 'Amoxicillin 250mg', sku: '8909876543210', quantity: 200, unit: 'capsules', minStockLevel: 50, lastUpdated: new Date().toISOString() },
        { id: '3', name: 'Ibuprofen 400mg', sku: '8901122334455', quantity: 300, unit: 'tablets', minStockLevel: 80, lastUpdated: new Date().toISOString() }
      ];
      this.storage.setItem(STORAGE_KEY_INVENTORY, initialStock);
    }
  }

  public getInventory(): InventoryItem[] {
    return this.storage.getItem<InventoryItem[]>(STORAGE_KEY_INVENTORY) || [];
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
    
    // Prevent negative stock for 'out' operations unless it's an adjustment
    if (newQuantity < 0 && type === 'out') {
       throw new Error("Insufficient stock");
    }

    const updatedItem = {
      ...item,
      quantity: Math.max(0, newQuantity),
      lastUpdated: new Date().toISOString()
    };

    items[index] = updatedItem;
    this.storage.setItem(STORAGE_KEY_INVENTORY, items);

    // Record Transaction
    this.recordTransaction({
        id: crypto.randomUUID(),
        itemId,
        type,
        quantity: Math.abs(quantityChange),
        reason,
        timestamp: new Date().toISOString(),
        performedBy: userId
    });

    return updatedItem;
  }
  
  public updateItemDetails(itemId: string, updates: Partial<InventoryItem>): InventoryItem | null {
      const items = this.getInventory();
      const index = items.findIndex(i => i.id === itemId);
      if (index === -1) return null;
      
      const updatedItem = { ...items[index], ...updates, lastUpdated: new Date().toISOString() };
      items[index] = updatedItem;
      this.storage.setItem(STORAGE_KEY_INVENTORY, items);
      return updatedItem;
  }

  public addItems(newItems: InventoryItem[]): void {
      const items = this.getInventory();
      newItems.forEach(newItem => {
          const existingIndex = items.findIndex(i => i.sku === newItem.sku);
          if (existingIndex > -1) {
              items[existingIndex].quantity += newItem.quantity;
              items[existingIndex].lastUpdated = new Date().toISOString();
          } else {
              items.push(newItem);
          }
      });
      this.storage.setItem(STORAGE_KEY_INVENTORY, items);
  }

  private recordTransaction(transaction: InventoryTransaction) {
      const transactions = this.storage.getItem<InventoryTransaction[]>(STORAGE_KEY_TRANSACTIONS) || [];
      transactions.push(transaction);
      this.storage.setItem(STORAGE_KEY_TRANSACTIONS, transactions);
  }
  
  public getTransactions(): InventoryTransaction[] {
       return this.storage.getItem<InventoryTransaction[]>(STORAGE_KEY_TRANSACTIONS) || [];
  }

  public async syncWithDistributor(): Promise<{ synced: number, errors: string[] }> {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      return { synced: 0, errors: [] }; // Mock response
  }

  // Auto-sync mechanism with throttling
  private lastSyncTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  public async autoSync(): Promise<void> {
    const now = Date.now();
    if (now - this.lastSyncTime > this.CACHE_DURATION) {
      console.log('Auto-syncing inventory...');
      try {
        await this.syncWithDistributor();
        this.lastSyncTime = now;
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    } else {
      console.log('Inventory sync skipped (cached)');
    }
  }
}
