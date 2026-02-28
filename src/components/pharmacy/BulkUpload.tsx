import React, { useRef, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { InventoryItem } from '../../types/inventory';

interface BulkUploadProps {
  onUpload: (items: InventoryItem[]) => void;
  onClose: () => void;
}

export default function BulkUpload({ onUpload, onClose }: BulkUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<InventoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      parseCSV(e.target.files[0]);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        // Basic validation of headers
        if (!['sku', 'name', 'quantity'].every(h => headers.includes(h))) {
            throw new Error("Invalid CSV format. Required headers: sku, name, quantity");
        }

        const items: InventoryItem[] = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const values = lines[i].split(',').map(v => v.trim());
            const item: Record<string, string> = {};
            
            headers.forEach((header, index) => {
                if (values[index]) item[header] = values[index];
            });

            if (item.sku && item.name && item.quantity) {
                items.push({
                    id: crypto.randomUUID(),
                    sku: item.sku,
                    name: item.name,
                    quantity: parseInt(item.quantity),
                    unit: item.unit || 'units',
                    minStockLevel: parseInt(item.minstocklevel) || 10,
                    lastUpdated: new Date().toISOString()
                });
            }
        }
        setPreview(items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse CSV");
        setPreview([]);
      }
    };
    reader.readAsText(file);
  };

  const handleUpload = () => {
      onUpload(preview);
      onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Bulk Inventory Upload</h3>
          
          {!file ? (
             <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
             >
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">Click to upload CSV file</p>
                <p className="text-xs text-gray-500 mt-1">Headers: sku, name, quantity, unit, minStockLevel</p>
                <input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileChange}
                />
             </div>
          ) : (
            <div>
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="flex items-center">
                        <FileText className="h-6 w-6 text-blue-500 mr-3" />
                        <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                        </div>
                    </div>
                    <button onClick={() => { setFile(null); setPreview([]); }} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center mb-4">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        {error}
                    </div>
                )}

                {preview.length > 0 && (
                    <div className="mb-4">
                        <h4 className="font-medium mb-2 flex items-center text-green-700">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {preview.length} items ready to import
                        </h4>
                        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {preview.map((item, i) => (
                                        <tr key={i}>
                                            <td className="px-4 py-2 text-sm text-gray-900">{item.sku}</td>
                                            <td className="px-4 py-2 text-sm text-gray-900">{item.name}</td>
                                            <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!preview.length}
              className={`px-4 py-2 rounded-md text-white ${
                preview.length ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              Import {preview.length} Items
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
