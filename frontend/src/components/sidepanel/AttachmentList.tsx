import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Image,
  File,
  Download,
  Trash2,
  Upload,
  Paperclip,
} from 'lucide-react';
import type { Attachment, AttachmentType } from '../../types/budget';
import { ATTACHMENT_TYPE_LABELS } from '../../types/budget';
import {
  uploadAttachment,
  getAttachments,
  downloadAttachment,
  deleteAttachment,
} from '../../api/attachments';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

interface FileIconProps {
  contentType: string;
  size?: number;
}

const FileIcon: React.FC<FileIconProps> = ({ contentType, size = 18 }) => {
  if (contentType === 'application/pdf') {
    return <FileText size={size} className="text-red-500 flex-shrink-0" />;
  }
  if (
    contentType ===
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return <FileSpreadsheet size={size} className="text-green-600 flex-shrink-0" />;
  }
  if (contentType.startsWith('image/')) {
    return <Image size={size} className="text-blue-500 flex-shrink-0" />;
  }
  return <File size={size} className="text-gray-400 flex-shrink-0" />;
};

const TYPE_BADGE_COLORS: Record<AttachmentType, string> = {
  OFFER: 'bg-amber-100 text-amber-700',
  INVOICE: 'bg-emerald-100 text-emerald-700',
  SPECIFICATION: 'bg-violet-100 text-violet-700',
  PHOTO: 'bg-blue-100 text-blue-700',
  OTHER: 'bg-gray-100 text-gray-600',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AttachmentListProps {
  costItemId: string;
  /** Callback to report current attachment count (for parent badge display) */
  onCountChange?: (count: number) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AttachmentList: React.FC<AttachmentListProps> = ({ costItemId, onCountChange }) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch attachments
  const fetchAttachments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAttachments({ costItemId });
      setAttachments(result.items);
    } catch {
      setError('Attachments could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [costItemId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  // Report count to parent
  useEffect(() => {
    onCountChange?.(attachments.length);
  }, [attachments.length, onCountChange]);

  // Upload handler
  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      setUploading(true);
      setError(null);
      try {
        for (const file of Array.from(files)) {
          await uploadAttachment({
            costItemId,
            file,
            attachmentType: 'OTHER',
          });
        }
        await fetchAttachments();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Upload failed.';
        setError(message);
      } finally {
        setUploading(false);
      }
    },
    [costItemId, fetchAttachments],
  );

  // Delete handler
  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('Really delete this attachment?')) return;
      try {
        await deleteAttachment(id);
        setAttachments((prev) => prev.filter((a) => a.id !== id));
      } catch {
        setError('Delete failed.');
      }
    },
    [],
  );

  // Drag & Drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleUpload(e.dataTransfer.files);
      }
    },
    [handleUpload],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleUpload(e.target.files);
        // Reset so same file can be uploaded again
        e.target.value = '';
      }
    },
    [handleUpload],
  );

  return (
    <div>
      {/* Upload button */}
      <div className="flex items-center justify-end mb-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors disabled:opacity-50"
        >
          <Upload size={12} />
          Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.xlsx,.docx,.png,.jpg,.jpeg,.zip"
          onChange={handleFileInputChange}
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-2 px-2 py-1.5 text-xs text-red-700 bg-red-50 rounded">
          {error}
        </div>
      )}

      {/* Drag & Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          rounded-lg transition-all duration-150
          ${
            isDragOver
              ? 'border-2 border-dashed border-indigo-600 bg-indigo-50 p-4'
              : 'border border-transparent'
          }
        `}
      >
        {isDragOver && (
          <p className="text-center text-sm text-indigo-600 font-medium py-2">
            Drop file here
          </p>
        )}

        {/* Loading */}
        {loading && !isDragOver && (
          <p className="text-xs text-gray-400 py-2">Loading...</p>
        )}

        {/* Uploading indicator */}
        {uploading && (
          <div className="flex items-center gap-2 py-2 px-2 text-xs text-indigo-600 bg-indigo-50 rounded mb-2">
            <div className="animate-spin h-3 w-3 border-2 border-indigo-600 border-t-transparent rounded-full" />
            Uploading...
          </div>
        )}

        {/* Empty state */}
        {!loading && attachments.length === 0 && !isDragOver && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="
              border border-dashed border-gray-200 rounded-lg
              py-4 px-3 text-center cursor-pointer
              hover:border-gray-300 hover:bg-gray-50 transition-colors
            "
          >
            <Paperclip size={16} className="mx-auto text-gray-300 mb-1" />
            <p className="text-xs text-gray-400">
              Click or drop file here
            </p>
            <p className="text-[10px] text-gray-300 mt-0.5">
              PDF, Excel, Word, Images, ZIP (max. 50 MB)
            </p>
          </div>
        )}

        {/* Attachment items */}
        {!isDragOver && attachments.length > 0 && (
          <ul className="space-y-1.5">
            {attachments.map((att) => (
              <li
                key={att.id}
                className="group flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
              >
                <FileIcon contentType={att.content_type} />

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 truncate leading-tight">
                    {att.original_filename}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-400">
                      {formatFileSize(att.file_size)}
                    </span>
                    <span className="text-[10px] text-gray-300">&middot;</span>
                    <span className="text-[10px] text-gray-400">
                      {formatDate(att.created_at)}
                    </span>
                    <span
                      className={`
                        inline-block px-1.5 py-0 text-[10px] font-medium rounded-full leading-relaxed
                        ${TYPE_BADGE_COLORS[att.attachment_type]}
                      `}
                    >
                      {ATTACHMENT_TYPE_LABELS[att.attachment_type]}
                    </span>
                  </div>
                </div>

                {/* Actions - visible on hover */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => downloadAttachment(att.id)}
                    className="p-1 rounded text-gray-400 hover:text-black hover:bg-gray-50 transition-colors"
                    title="Download"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(att.id)}
                    className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AttachmentList;
