export interface InventoryItem {
    id: string;
    name: string;
    sku: string;
    quantity: number;
    unit: string;
    minStockLevel: number;
    lastUpdated: string;
    batchNumber?: string;
    expiryDate?: string;
}

export interface InventoryTransaction {
    id: string;
    itemId: string;
    type: 'in' | 'out' | 'adjustment';
    quantity: number;
    reason?: string;
    timestamp: string;
    performedBy: string;
}

export type InventoryUpdate = Partial<Omit<InventoryItem, 'id' | 'sku'>>;
