import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmDialogProps {
  itemDescription: string;
  onConfirm: () => void;
  onClose: () => void;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({ itemDescription, onConfirm, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in on mount
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 150);
  };

  const handleConfirm = () => {
    setVisible(false);
    setTimeout(onConfirm, 150);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: visible ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0)',
        transition: 'background-color 150ms ease-out',
      }}
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-sm mx-4 p-6"
        style={{
          boxShadow: 'var(--shadow-modal)',
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(8px)',
          opacity: visible ? 1 : 0,
          transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1), opacity 150ms ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Position löschen?</h3>
            <p className="mt-2 text-sm text-gray-600">
              Kostenposition <span className="font-medium">&ldquo;{itemDescription}&rdquo;</span> wirklich löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-150"
          >
            Abbrechen
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all duration-150 shadow-sm hover:shadow"
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmDialog;
