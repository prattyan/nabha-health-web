import React, { useState, useRef, useEffect } from 'react';
import { Scan } from 'lucide-react';

interface BarcodeInputProps {
  onScan: (barcode: string) => void;
  isLoading?: boolean;
}

export default function BarcodeInput({ onScan, isLoading = false }: BarcodeInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const lastKeyTime = useRef<number>(0);

  // Focus input automatically to capture scanner input
  useEffect(() => {
    if (inputRef.current) {
        inputRef.current.focus();
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Barcode scanners usually act like a keyboard, entering characters very fast and ending with Enter
      const now = Date.now();
      if (now - lastKeyTime.current > 50) {
          // If slow typing, it's likely manual entry, not scanner
      }
      lastKeyTime.current = now;

      if (e.key === 'Enter') {
          if (value.trim()) {
              onScan(value.trim());
              setValue('');
          }
      }
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Scan className="h-5 w-5 text-gray-400" />
      </div>
      <input
        ref={inputRef}
        type="text"
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        placeholder="Scan barcode or type SKU..."
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        autoFocus
      />
    </div>
  );
}
