import { Package, AlertTriangle, TrendingDown } from 'lucide-react';

interface Medicine {
  id: string;
  name: string;
  stock: number;
  reorderLevel: number;
  category: string;
}

interface Pharmacy {
  id: string;
  name: string;
  medicines: Medicine[];
}

// Mock pharmacy data
const MOCK_PHARMACY_DATA: Pharmacy[] = [
  {
    id: 'PHR001',
    name: 'Nabha Main Pharmacy',
    medicines: [
      { id: 'MED001', name: 'Paracetamol 500mg', stock: 150, reorderLevel: 50, category: 'Analgesic' },
      { id: 'MED002', name: 'Amoxicillin 250mg', stock: 20, reorderLevel: 40, category: 'Antibiotic' },
      { id: 'MED003', name: 'Aspirin 100mg', stock: 0, reorderLevel: 30, category: 'Analgesic' },
      { id: 'MED004', name: 'Vitamin D 1000IU', stock: 200, reorderLevel: 100, category: 'Supplement' },
    ]
  },
  {
    id: 'PHR002',
    name: 'Village Health Center Pharmacy',
    medicines: [
      { id: 'MED005', name: 'Metformin 500mg', stock: 80, reorderLevel: 50, category: 'Antidiabetic' },
      { id: 'MED006', name: 'Ibuprofen 400mg', stock: 15, reorderLevel: 40, category: 'NSAID' },
      { id: 'MED007', name: 'Cough Syrup', stock: 120, reorderLevel: 60, category: 'Cough Relief' },
    ]
  }
];

interface PharmacyStockCardProps {
  isLoading?: boolean;
}

export default function PharmacyStockCard({ isLoading = false }: PharmacyStockCardProps) {
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
  const allMedicines = MOCK_PHARMACY_DATA.flatMap(p => p.medicines);
  const outOfStockCount = allMedicines.filter(m => m.stock === 0).length;
  const lowStockCount = allMedicines.filter(m => m.stock > 0 && m.stock <= m.reorderLevel).length;
  const inStockCount = allMedicines.filter(m => m.stock > m.reorderLevel).length;

  // Get low stock alerts
  const lowStockAlerts = MOCK_PHARMACY_DATA.flatMap(pharmacy =>
    pharmacy.medicines
      .filter(med => med.stock < med.reorderLevel)
      .map(med => ({ ...med, pharmacy: pharmacy.name }))
  ).sort((a, b) => a.stock - b.stock);

  // Get most stocked medicines
  const mostStocked = [...allMedicines]
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 3);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Pharmacy Stock</h3>
        <div className="bg-yellow-100 p-3 rounded-lg">
          <Package className="h-6 w-6 text-yellow-600" />
        </div>
      </div>

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
              {lowStockAlerts.map((med: any) => (
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

        {/* Pharmacies Count */}
        <div>
          <p className="text-sm text-gray-600 mb-2">Active Pharmacies</p>
          <div className="grid grid-cols-1 gap-2">
            {MOCK_PHARMACY_DATA.map(pharmacy => (
              <div key={pharmacy.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                <p className="text-sm font-medium text-gray-900">{pharmacy.name}</p>
                <p className="text-sm font-semibold text-blue-600">{pharmacy.medicines.length} items</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800">
          <span className="font-semibold">Note:</span> This displays mock pharmacy data. Real pharmacy integration coming soon.
        </p>
      </div>
    </div>
  );
}
