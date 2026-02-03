import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRBAC, PermissionGate } from '../../contexts/RBACContext';
import { 
  Package, 
  Pill, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  FileText,
  Settings
} from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  expiryDate: string;
  supplier: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'expired';
}

interface PrescriptionOrder {
  id: string;
  patientName: string;
  doctorName: string;
  medications: string[];
  status: 'pending' | 'processing' | 'ready' | 'dispensed';
  orderDate: string;
  totalAmount: number;
}

const PharmacyDashboard: React.FC = () => {
  const { user } = useAuth();
  const { checkPermission } = useRBAC();
  const [activeTab, setActiveTab] = useState('overview');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [prescriptionOrders, setPrescriptionOrders] = useState<PrescriptionOrder[]>([]);

  useEffect(() => {
    // Load sample data
    setInventory([
      {
        id: 'INV001',
        name: 'Paracetamol 500mg',
        category: 'Pain Relief',
        stock: 150,
        minStock: 50,
        price: 2.50,
        expiryDate: '2025-12-31',
        supplier: 'MedSupply Co.',
        status: 'in-stock'
      },
      {
        id: 'INV002',
        name: 'Amoxicillin 250mg',
        category: 'Antibiotics',
        stock: 25,
        minStock: 30,
        price: 8.75,
        expiryDate: '2025-06-15',
        supplier: 'PharmaCorp',
        status: 'low-stock'
      },
      {
        id: 'INV003',
        name: 'Insulin Pen',
        category: 'Diabetes',
        stock: 0,
        minStock: 10,
        price: 45.00,
        expiryDate: '2025-03-20',
        supplier: 'DiabetesCare Ltd.',
        status: 'out-of-stock'
      }
    ]);

    setPrescriptionOrders([
      {
        id: 'ORD001',
        patientName: 'Rajesh Kumar',
        doctorName: 'Dr. Priya Sharma',
        medications: ['Paracetamol 500mg', 'Vitamin D3'],
        status: 'pending',
        orderDate: '2024-02-03',
        totalAmount: 15.50
      },
      {
        id: 'ORD002',
        patientName: 'Sunita Devi',
        doctorName: 'Dr. Manpreet Singh',
        medications: ['Amoxicillin 250mg', 'Cough Syrup'],
        status: 'ready',
        orderDate: '2024-02-02',
        totalAmount: 22.75
      }
    ]);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-stock': return 'text-green-600 bg-green-100';
      case 'low-stock': return 'text-yellow-600 bg-yellow-100';
      case 'out-of-stock': return 'text-red-600 bg-red-100';
      case 'expired': return 'text-gray-600 bg-gray-100';
      case 'pending': return 'text-blue-600 bg-blue-100';
      case 'processing': return 'text-yellow-600 bg-yellow-100';
      case 'ready': return 'text-green-600 bg-green-100';
      case 'dispensed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleDispenseMedication = (orderId: string) => {
    if (!checkPermission('pharmacy:dispense_medication')) {
      alert('You do not have permission to dispense medication');
      return;
    }

    setPrescriptionOrders(orders =>
      orders.map(order =>
        order.id === orderId
          ? { ...order, status: 'dispensed' as const }
          : order
      )
    );
  };

  const handleUpdateStock = (itemId: string, newStock: number) => {
    if (!checkPermission('pharmacy:update_stock')) {
      alert('You do not have permission to update stock');
      return;
    }

    setInventory(items =>
      items.map(item => {
        if (item.id === itemId) {
          let status: InventoryItem['status'] = 'in-stock';
          if (newStock === 0) status = 'out-of-stock';
          else if (newStock <= item.minStock) status = 'low-stock';
          
          return { ...item, stock: newStock, status };
        }
        return item;
      })
    );
  };

  const stats = {
    totalItems: inventory.length,
    lowStockItems: inventory.filter(item => item.status === 'low-stock').length,
    outOfStockItems: inventory.filter(item => item.status === 'out-of-stock').length,
    pendingOrders: prescriptionOrders.filter(order => order.status === 'pending').length,
    readyOrders: prescriptionOrders.filter(order => order.status === 'ready').length,
    totalRevenue: prescriptionOrders
      .filter(order => order.status === 'dispensed')
      .reduce((sum, order) => sum + order.totalAmount, 0)
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Pharmacy Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {user?.firstName} {user?.lastName}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-gray-900">{stats.lowStockItems}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ShoppingCart className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: Package },
              { id: 'inventory', name: 'Inventory', icon: Pill },
              { id: 'orders', name: 'Prescription Orders', icon: FileText },
              { id: 'settings', name: 'Settings', icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PermissionGate permission="pharmacy:view_prescriptions">
                  <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                    <FileText className="h-6 w-6 text-blue-600 mb-2" />
                    <h4 className="font-medium">View Prescriptions</h4>
                    <p className="text-sm text-gray-600">Check new prescription orders</p>
                  </button>
                </PermissionGate>

                <PermissionGate permission="pharmacy:manage_inventory">
                  <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                    <Package className="h-6 w-6 text-green-600 mb-2" />
                    <h4 className="font-medium">Manage Inventory</h4>
                    <p className="text-sm text-gray-600">Update stock levels</p>
                  </button>
                </PermissionGate>

                <PermissionGate permission="pharmacy:process_orders">
                  <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                    <ShoppingCart className="h-6 w-6 text-purple-600 mb-2" />
                    <h4 className="font-medium">Process Orders</h4>
                    <p className="text-sm text-gray-600">Handle prescription orders</p>
                  </button>
                </PermissionGate>
              </div>
            </div>

            {/* Alerts */}
            {(stats.lowStockItems > 0 || stats.outOfStockItems > 0) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Inventory Alerts
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <ul className="list-disc pl-5 space-y-1">
                        {stats.lowStockItems > 0 && (
                          <li>{stats.lowStockItems} items are running low on stock</li>
                        )}
                        {stats.outOfStockItems > 0 && (
                          <li>{stats.outOfStockItems} items are out of stock</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'inventory' && (
          <PermissionGate permission="pharmacy:manage_inventory">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Inventory Management</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Medicine
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inventory.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-500">Expires: {item.expiryDate}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.stock} / {item.minStock} min
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{item.price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                            {item.status.replace('-', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <PermissionGate permission="pharmacy:update_stock">
                            <button
                              onClick={() => {
                                const newStock = prompt(`Update stock for ${item.name}:`, item.stock.toString());
                                if (newStock !== null) {
                                  handleUpdateStock(item.id, parseInt(newStock) || 0);
                                }
                              }}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              Update Stock
                            </button>
                          </PermissionGate>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </PermissionGate>
        )}

        {activeTab === 'orders' && (
          <PermissionGate permission="pharmacy:view_prescriptions">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Prescription Orders</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Patient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Doctor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Medications
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {prescriptionOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.patientName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.doctorName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {order.medications.join(', ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{order.totalAmount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {order.status === 'ready' && (
                            <PermissionGate permission="pharmacy:dispense_medication">
                              <button
                                onClick={() => handleDispenseMedication(order.id)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Dispense
                              </button>
                            </PermissionGate>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </PermissionGate>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Pharmacy Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Pharmacy Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                  defaultValue="NabhaCare Pharmacy"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Operating Hours</label>
                <div className="grid grid-cols-2 gap-4 mt-1">
                  <input
                    type="time"
                    className="block w-full border-gray-300 rounded-md shadow-sm"
                    defaultValue="09:00"
                  />
                  <input
                    type="time"
                    className="block w-full border-gray-300 rounded-md shadow-sm"
                    defaultValue="21:00"
                  />
                </div>
              </div>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PharmacyDashboard;