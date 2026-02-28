import { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingDown, Upload, Plus, Trash2, Download } from 'lucide-react';
import { StorageService } from '../../services/storageService';

interface Medicine {
  id: string;
  name: string;
  stock: number;
  reorderLevel: number;
  category: string;
  pharmacy: string;
}

interface PharmacyStockCardProps {
  isLoading?: boolean;
}

const STORAGE_KEY = 'pharmacy_stock_data';
const CATEGORIES = ['Analgesic', 'Antibiotic', 'NSAID', 'Supplement', 'Antidiabetic', 'Cough Relief', 'Cardiovascular', 'Dermatology', 'General'];

export default function PharmacyStockCard({ isLoading = false }: PharmacyStockCardProps) {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [activeTab, setActiveTab] = useState<'view' | 'add-manual' | 'upload-csv'>('view');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    stock: '',
    reorderLevel: '',
    category: 'Analgesic',
    pharmacy: '',
  });

  // Load data from localStorage on mount
  useEffect(() => {
    const loadData = () => {
      const storage = StorageService.getInstance();
      const stored = storage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setMedicines(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
          console.error('Failed to parse pharmacy data:', e);
          setMedicines([]);
        }
      }
    };
    loadData();
  }, []);

  // Save data to localStorage
  const saveData = (data: Medicine[]) => {
    try {
      const storage = StorageService.getInstance();
      storage.setItem(STORAGE_KEY, JSON.stringify(data));
      setMedicines(data);
    } catch (e) {
      setError('Failed to save data');
      console.error(e);
    }
  };

  // Add medicine manually
  const handleAddMedicine = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name || !formData.stock || !formData.reorderLevel || !formData.pharmacy) {
      setError('All fields are required');
      return;
    }

    const stock = parseInt(formData.stock);
    const reorderLevel = parseInt(formData.reorderLevel);

    if (isNaN(stock) || isNaN(reorderLevel) || stock < 0 || reorderLevel < 0) {
      setError('Stock and reorder level must be valid numbers');
      return;
    }

    const newMedicine: Medicine = {
      id: `MED${Date.now()}`,
      name: formData.name,
      stock,
      reorderLevel,
      category: formData.category,
      pharmacy: formData.pharmacy,
    };

    const updated = [...medicines, newMedicine];
    saveData(updated);
    setFormData({ name: '', stock: '', reorderLevel: '', category: 'Analgesic', pharmacy: '' });
    setSuccess('Medicine added successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Delete medicine
  const handleDeleteMedicine = (id: string) => {
    const updated = medicines.filter(m => m.id !== id);
    saveData(updated);
    setSuccess('Medicine deleted successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Handle CSV upload
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setSuccess('');
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const lines = csv.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          setError('CSV must contain at least a header and one data row');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const requiredHeaders = ['name', 'stock', 'reorderlevel', 'category', 'pharmacy'];
        
        const hasAllHeaders = requiredHeaders.every(req => 
          headers.some(h => h.includes(req.replace('reorderlevel', 'reorder')))
        );

        if (!hasAllHeaders) {
          setError(`CSV must have headers: ${requiredHeaders.join(', ')}`);
          return;
        }

        const newMedicines: Medicine[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length < requiredHeaders.length || !values[0]) continue;

          const stock = parseInt(values[1]);
          const reorderLevel = parseInt(values[2]);

          if (isNaN(stock) || isNaN(reorderLevel)) {
            setError(`Row ${i + 1}: Stock and reorder level must be numbers`);
            return;
          }

          newMedicines.push({
            id: `MED${Date.now()}_${i}`,
            name: values[0],
            stock,
            reorderLevel,
            category: values[3],
            pharmacy: values[4],
          });
        }

        const updated = [...medicines, ...newMedicines];
        saveData(updated);
        setSuccess(`Successfully imported ${newMedicines.length} medicines!`);
        setActiveTab('view');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError('Failed to parse CSV file');
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Download CSV template
  const handleDownloadTemplate = () => {
    const template = 'name,stock,reorderLevel,category,pharmacy\nParacetamol 500mg,150,50,Analgesic,Main Pharmacy\nAspirin 100mg,20,40,Analgesic,Main Pharmacy';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pharmacy_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download current data as CSV
  const handleDownloadData = () => {
    if (medicines.length === 0) {
      setError('No data to download');
      return;
    }

    const csv = [
      'name,stock,reorderLevel,category,pharmacy',
      ...medicines.map(m => `${m.name},${m.stock},${m.reorderLevel},${m.category},${m.pharmacy}`)
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmacy_data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-12 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const outOfStockCount = medicines.filter(m => m.stock === 0).length;
  const lowStockCount = medicines.filter(m => m.stock > 0 && m.stock <= m.reorderLevel).length;
  const inStockCount = medicines.filter(m => m.stock > m.reorderLevel).length;

  // Get low stock alerts
  const lowStockAlerts = medicines
    .filter(med => med.stock < med.reorderLevel)
    .sort((a, b) => a.stock - b.stock);

  // Get most stocked medicines
  const mostStocked = [...medicines]
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 3);

  // Get unique pharmacies
  const pharmacies = [...new Set(medicines.map(m => m.pharmacy))];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Pharmacy Stock Management</h3>
        <div className="bg-yellow-100 p-3 rounded-lg">
          <Package className="h-6 w-6 text-yellow-600" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b">
        <button
          onClick={() => setActiveTab('view')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'view'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          View Stock ({medicines.length})
        </button>
        <button
          onClick={() => setActiveTab('add-manual')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
            activeTab === 'add-manual'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Plus className="w-4 h-4" /> Add Manually
        </button>
        <button
          onClick={() => setActiveTab('upload-csv')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
            activeTab === 'upload-csv'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Upload className="w-4 h-4" /> Upload CSV
        </button>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* View Tab */}
      {activeTab === 'view' && (
        <div className="space-y-4">
          {/* Stock Summary */}
          <div className="border-b pb-4">
            <p className="text-sm text-gray-600 mb-2">Stock Status</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-green-50 p-3 rounded">
                <p className="text-2xl font-bold text-green-600">{inStockCount}</p>
                <p className="text-xs text-gray-600">In Stock</p>
              </div>
              <div className="bg-yellow-50 p-3 rounded">
                <p className="text-2xl font-bold text-yellow-600">{lowStockCount}</p>
                <p className="text-xs text-gray-600">Low Stock</p>
              </div>
              <div className="bg-red-50 p-3 rounded">
                <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
                <p className="text-xs text-gray-600">Out of Stock</p>
              </div>
            </div>
          </div>

          {/* Low Stock Alerts */}
          {lowStockAlerts.length > 0 && (
            <div className="border-b pb-4">
              <p className="text-sm text-gray-600 flex items-center mb-2">
                <AlertTriangle className="w-4 h-4 mr-2 text-red-600" />
                Low Stock Alerts
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {lowStockAlerts.map((med) => (
                  <div key={med.id} className="flex justify-between items-start bg-red-50 p-2 rounded border border-red-200">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{med.name}</p>
                      <p className="text-xs text-gray-500">{med.pharmacy}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-600">{med.stock} units</p>
                      <p className="text-xs text-gray-500">Min: {med.reorderLevel}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Most Stocked Medicines */}
          {mostStocked.length > 0 && (
            <div className="border-b pb-4">
              <p className="text-sm text-gray-600 flex items-center mb-2">
                <TrendingDown className="w-4 h-4 mr-2" />
                Well Stocked Medicines
              </p>
              <div className="space-y-2">
                {mostStocked.map((med) => (
                  <div key={med.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{med.name}</p>
                      <p className="text-xs text-gray-500">{med.category}</p>
                    </div>
                    <p className="text-sm font-semibold text-green-600">{med.stock} units</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pharmacies Count */}
          {pharmacies.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Active Pharmacies</p>
              <div className="grid grid-cols-1 gap-2">
                {pharmacies.map(pharmacy => {
                  const pharmMeds = medicines.filter(m => m.pharmacy === pharmacy);
                  return (
                    <div key={pharmacy} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                      <p className="text-sm font-medium text-gray-900">{pharmacy}</p>
                      <p className="text-sm font-semibold text-blue-600">{pharmMeds.length} items</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {medicines.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No medicines yet. Add medicines manually or upload a CSV file.</p>
            </div>
          )}

          {medicines.length > 0 && (
            <button
              onClick={handleDownloadData}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              <Download className="w-4 h-4" /> Download Data as CSV
            </button>
          )}
        </div>
      )}

      {/* Add Manually Tab */}
      {activeTab === 'add-manual' && (
        <form onSubmit={handleAddMedicine} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Medicine Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Paracetamol 500mg"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock *</label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level *</label>
              <input
                type="number"
                value={formData.reorderLevel}
                onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pharmacy Name *</label>
            <input
              type="text"
              value={formData.pharmacy}
              onChange={(e) => setFormData({ ...formData, pharmacy: e.target.value })}
              placeholder="e.g., Main Pharmacy"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Add Medicine
          </button>
        </form>
      )}

      {/* Upload CSV Tab */}
      {activeTab === 'upload-csv' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-blue-900">CSV Format Required:</p>
            <p className="text-xs text-blue-800 font-mono bg-white p-2 rounded">
              name,stock,reorderLevel,category,pharmacy
            </p>
            <p className="text-xs text-blue-800">Each row should contain medicine data in the order above.</p>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center space-y-2">
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
              id="csv-input"
            />
            <label
              htmlFor="csv-input"
              className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer font-medium text-sm"
            >
              Choose CSV File
            </label>
            <p className="text-xs text-gray-500">or drag and drop</p>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
          >
            <Download className="w-4 h-4" /> Download CSV Template
          </button>
        </div>
      )}

      {/* All Medicines List */}
      {activeTab === 'view' && medicines.length > 0 && (
        <div className="mt-6 border-t pt-6">
          <p className="text-sm font-medium text-gray-900 mb-3">All Medicines</p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {medicines.map((med) => (
              <div key={med.id} className="flex justify-between items-start bg-gray-50 p-3 rounded border border-gray-200">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{med.name}</p>
                  <div className="flex gap-4 mt-1 text-xs text-gray-600">
                    <span>{med.pharmacy}</span>
                    <span>{med.category}</span>
                    <span>Stock: {med.stock} | Min: {med.reorderLevel}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteMedicine(med.id)}
                  className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
