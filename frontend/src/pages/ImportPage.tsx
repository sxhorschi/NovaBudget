import React, { useCallback, useRef, useState } from 'react';
import { Upload, CheckCircle, AlertCircle, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useToast } from '../components/common/ToastProvider';
import { USE_MOCKS } from '../mocks/data';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

// ---------------------------------------------------------------------------
// ImportPage
// ---------------------------------------------------------------------------

const ImportPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [message, setMessage] = useState('');
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setStatus('uploading');
    setMessage('Datei wird hochgeladen...');
    setProgress(0);

    try {
      if (USE_MOCKS) {
        // Mock-Modus: Upload simulieren
        await new Promise<void>((resolve) => {
          let pct = 0;
          const interval = setInterval(() => {
            pct += 20;
            setProgress(Math.min(pct, 100));
            if (pct >= 100) {
              clearInterval(interval);
              resolve();
            }
          }, 150);
        });
      } else {
        const formData = new FormData();
        formData.append('file', file);
        // TODO: facility_id should come from app context / route params
        const facilityId = '00000000-0000-0000-0000-000000000001';

        await client.post(`/import/excel?facility_id=${facilityId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const pct = Math.round(
                (progressEvent.loaded / progressEvent.total) * 100,
              );
              setProgress(pct);
            }
          },
        });
      }

      setStatus('success');
      setProgress(100);
      setMessage(`"${file.name}" wurde erfolgreich importiert.`);
      toast.success('Import erfolgreich abgeschlossen');
    } catch (err: unknown) {
      setStatus('error');
      setProgress(0);
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setMessage(
        axiosError?.response?.data?.detail ||
          'Upload fehlgeschlagen. Bitte erneut versuchen.',
      );
    }
  }, [toast]);

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

  const reset = useCallback(() => {
    setStatus('idle');
    setMessage('');
    setFileName('');
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return (
    <div className="flex-1 flex items-start justify-center pt-16 px-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Daten importieren</h2>
          <p className="text-sm text-gray-500 mt-1">
            Laden Sie eine Excel- oder CSV-Datei hoch, um Budget-Daten zu importieren.
          </p>
        </div>

        {/* Drop Zone / Status */}
        {status === 'idle' && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed
              p-16 cursor-pointer transition-all duration-200
              ${
                dragging
                  ? 'border-indigo-400 bg-indigo-50 scale-[1.01]'
                  : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
              }
            `}
          >
            <div
              className={`
                rounded-full p-4 transition-colors
                ${dragging ? 'bg-indigo-100' : 'bg-gray-100'}
              `}
            >
              <Upload
                size={32}
                className={dragging ? 'text-indigo-600' : 'text-gray-400'}
              />
            </div>
            <div className="text-center">
              <p className="text-gray-700 font-medium">
                Excel-Datei hierher ziehen
              </p>
              <p className="text-sm text-gray-400 mt-1">
                oder klicken zum Auswählen
              </p>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-xs text-gray-500">
                <FileSpreadsheet size={12} />
                .xlsx
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-xs text-gray-500">
                <FileSpreadsheet size={12} />
                .csv
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={onFileSelect}
            />
          </div>
        )}

        {/* Uploading */}
        {status === 'uploading' && (
          <div className="rounded-xl border border-gray-200 bg-white p-8">
            <div className="flex items-center gap-4">
              <Loader2 size={24} className="text-indigo-600 animate-spin" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {fileName}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{message}</p>
              </div>
              <span className="text-sm font-mono text-indigo-600 tabular-nums">
                {progress}%
              </span>
            </div>
            <div className="mt-4 h-1.5 w-full rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle size={28} className="text-green-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-green-900">
              Import erfolgreich!
            </h3>
            <p className="text-sm text-green-700 mt-1">{message}</p>
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={reset}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Weitere Datei importieren
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                Im Costbook ansehen
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-red-100 p-3">
                <AlertCircle size={28} className="text-red-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-red-900">
              Import fehlgeschlagen
            </h3>
            <p className="text-sm text-red-700 mt-1">{message}</p>
            <button
              onClick={reset}
              className="mt-6 px-4 py-2 text-sm font-medium rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Erneut versuchen
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportPage;
