import React, { useCallback, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import client from '../../api/client';
import { USE_MOCKS } from '../../mocks/data';
import { useBudgetData } from '../../context/BudgetDataContext';

const ExcelImport: React.FC = () => {
  const { facility } = useBudgetData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleFile = useCallback(async (file: File) => {
    setStatus('uploading');
    setMessage('Uploading...');
    try {
      if (USE_MOCKS) {
        // Mock mode: simulate upload
        await new Promise((resolve) => setTimeout(resolve, 600));
      } else {
        const formData = new FormData();
        formData.append('file', file);
        await client.post(`/import/excel?facility_id=${facility.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setStatus('success');
      setMessage(`"${file.name}" was imported successfully.`);
    } catch (err: unknown) {
      setStatus('error');
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setMessage(axiosError?.response?.data?.detail || 'Upload failed. Please try again.');
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-12 cursor-pointer transition-colors ${
          dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
      >
        <Upload size={40} className="text-gray-400" />
        <p className="text-gray-600 font-medium">Drop Excel file here</p>
        <p className="text-sm text-gray-400">or click to select</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={onFileSelect}
        />
      </div>

      {status !== 'idle' && (
        <div
          className={`mt-4 rounded-lg p-3 text-sm ${
            status === 'uploading'
              ? 'bg-blue-50 text-blue-700'
              : status === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
};

export default ExcelImport;
