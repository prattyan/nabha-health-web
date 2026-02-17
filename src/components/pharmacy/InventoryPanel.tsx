import React, { useState, useEffect } from 'react';
import { Package, RefreshCw, AlertTriangle, Plus, Search, Edit2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { InventoryService } from '../../services/inventoryService';
import { InventoryItem } from '../../types/inventory';
import { useAuth } from '../../contexts/AuthContext';
import BarcodeInput from './BarcodeInput';
import BulkUpload from './BulkUpload';

export default function InventoryPanel() {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const inventoryService = InventoryService.getInstance();

  const loadInventory = React.useCallback(() => {
    const data = inventoryService.getInventory();
    setItems(data);
  }, [inventoryService]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Periodic Auto-Sync Trigger
  useEffect(() => {
    // Initial sync check
    inventoryService.autoSync();

    const interval = setInterval(() => {
       // Check for auto-sync every 30 seconds (throttled internally by service)
       inventoryService.autoSync().then(() => {
         loadInventory();
       });
    }, 30000); 
    return () => clearInterval(interval);
  }, [loadInventory, inventoryService]);

  const handleSync = async () => {
      setIsLoading(true);
      try {
        await inventoryService.syncWithDistributor();
        loadInventory();
      } finally {
        setIsLoading(false);
      }
  };

  const handleScan = (code: string) => {
      const item = inventoryService.getItemBySku(code);
      if (item) {
          // If item exists, maybe prompt to quick add/remove or just highlight
          // For now, let's select it for edit
          setEditingItem(item);
      } else {
          // New Item prompt?
          alert(`Item with SKU ${code} not found. Add manually.`);
      }
  };

  const handleStockUpdate = (itemId: string, change: number, type: 'in' | 'out' | 'adjustment') => {
      if (!user) return;
      try {
        inventoryService.updateStock(itemId, change, type, user.id, "Manual Update");
        loadInventory();
        if (editingItem && editingItem.id === itemId) {
            setEditingItem(null); // Close edit mode
        }
      } catch (e) {
          alert(e instanceof Error ? e.message : "An error occurred");
      }
  };

  const filteredItems = items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.sku.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex-1 max-w-md">
              <BarcodeInput onScan={handleScan} isLoading={isLoading} />
          </div>
          <div className="flex space-x-3">
              <button 
                onClick={() => setShowBulkUpload(true)}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                  <Plus className="h-4 w-4 mr-2" />
                  Bulk Upload
              </button>
              <button 
                onClick={handleSync}
                disabled={isLoading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Sync Stock
              </button>
          </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                  <div>
                      <p className="text-sm font-medium text-gray-500">Total Products</p>
                      <p className="text-2xl font-bold text-gray-900">{items.length}</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-500" />
              </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                  <div>
                      <p className="text-sm font-medium text-gray-500">Low Stock Alerts</p>
                      <p className="text-2xl font-bold text-red-600">
                          {items.filter(i => i.quantity <= i.minStockLevel).length}
                      </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                  <div>
                      <p className="text-sm font-medium text-gray-500">Last Sync</p>
                      <p className="text-sm font-bold text-gray-900">Just Now</p>
                  </div>
                  <RefreshCw className="h-8 w-8 text-green-500" />
              </div>
          </div>
      </div>

      {/* Edit Modal (Simple Inline Over) */}
      {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                  <h3 className="text-lg font-bold mb-4">Update Stock: {editingItem.name}</h3>
                  <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm text-gray-600">
                          <span>Current Stock:</span>
                          <span className="font-mono text-lg">{editingItem.quantity} {editingItem.unit}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <button 
                            onClick={() => handleStockUpdate(editingItem.id, 10, 'in')}
                            className="flex items-center justify-center py-2 bg-green-50 text-green-700 rounded hover:bg-green-100"
                          >
                              <ArrowUpCircle className="h-4 w-4 mr-2" /> Add 10
                          </button>
                           <button 
                            onClick={() => handleStockUpdate(editingItem.id, -10, 'out')}
                            className="flex items-center justify-center py-2 bg-red-50 text-red-700 rounded hover:bg-red-100"
                          >
                              <ArrowDownCircle className="h-4 w-4 mr-2" /> Remove 10
                          </button>
                      </div>
                       <input 
                         type="number" 
                         placeholder="Custom adjustment (+/-)"
                         className="w-full border rounded p-2"
                         onKeyDown={(e) => {
                             if(e.key === 'Enter') {
                                 const val = parseInt((e.target as HTMLInputElement).value);
                                 if (isNaN(val) || val === 0) return;
                                 handleStockUpdate(editingItem.id, val, val > 0 ? 'in' : 'out');
                             }
                         }}
                       />
                       <p className="text-xs text-gray-500">Press Enter for custom adjustment</p>
                  </div>
                   <button onClick={() => setEditingItem(null)} className="mt-4 w-full py-2 bg-gray-100 hover:bg-gray-200 rounded">Close</button>
              </div>
          </div>
      )}

      {/* Inventory Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
             <h3 className="font-medium text-gray-900">Stock Details</h3>
             <div className="relative">
                 <input 
                    type="text" 
                    placeholder="Search inventory..."
                    className="pl-8 pr-3 py-1 border rounded-md text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                 />
                 <Search className="h-4 w-4 absolute left-2 top-2 text-gray-400" />
             </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {filteredItems.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{item.sku}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.quantity} {item.unit}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {item.quantity <= item.minStockLevel ? (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                        Low Stock
                                    </span>
                                ) : (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                        In Stock
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <button 
                                    onClick={() => setEditingItem(item)}
                                    className="text-blue-600 hover:text-blue-900"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {filteredItems.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                No items found matching your search.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
          </div>
      </div>

      {showBulkUpload && (
          <BulkUpload 
            onClose={() => setShowBulkUpload(false)}
            onUpload={(newItems) => {
                inventoryService.addItems(newItems);
                loadInventory();
            }}
          />
      )}
    </div>
  );
}
