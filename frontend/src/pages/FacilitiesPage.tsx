import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Plus, ExternalLink, Copy, Trash2, Pencil, X, Check } from 'lucide-react';
import type { Facility } from '../types/budget';
import { useFacility } from '../context/FacilityContext';
import { useAuth } from '../context/AuthContext';

// ---------------------------------------------------------------------------
// Edit/Create Modal
// ---------------------------------------------------------------------------

interface FacilityFormData {
  name: string;
  location: string;
  description: string;
}

function FacilityModal({
  title,
  initial,
  onSave,
  onClose,
  showDelete = false,
  onDelete,
}: {
  title: string;
  initial: FacilityFormData;
  onSave: (data: FacilityFormData) => void;
  onClose: () => void;
  showDelete?: boolean;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState<FacilityFormData>(initial);

  const set = (field: keyof FacilityFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Name *</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Facility name"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Location</label>
            <input
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="City, Country"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              placeholder="Optional description..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none"
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            {showDelete && onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
              >
                Delete Facility
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={!form.name.trim()}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <Check size={14} className="inline mr-1" />
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FacilitiesPage
// ---------------------------------------------------------------------------

const FacilitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const { facilities, setCurrentFacility, createFacility, updateFacility, deleteFacility } = useFacility();
  const { canEdit } = useAuth();

  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleOpen = useCallback((f: Facility) => {
    setCurrentFacility(f.id);
    navigate(`/f/${f.id}/costbook`);
  }, [navigate, setCurrentFacility]);

  const handleClone = useCallback(async (f: Facility) => {
    const cloned = await createFacility(`${f.name} (Clone)`, f.location);
    if (cloned) await updateFacility(cloned.id, { description: `Cloned from ${f.name}` });
  }, [createFacility, updateFacility]);

  const handleCreate = useCallback(async (data: FacilityFormData) => {
    const f = await createFacility(data.name, data.location);
    if (!f) return;
    if (data.description) await updateFacility(f.id, { description: data.description });
    setShowCreateModal(false);
    navigate(`/f/${f.id}/costbook`);
  }, [createFacility, updateFacility, navigate]);

  const handleEdit = useCallback(async (data: FacilityFormData) => {
    if (!editingFacility) return;
    await updateFacility(editingFacility.id, {
      name: data.name,
      location: data.location,
      description: data.description,
    });
    setEditingFacility(null);
  }, [editingFacility, updateFacility]);

  const handleDelete = useCallback(async () => {
    if (!editingFacility) return;
    if (!window.confirm(`Delete "${editingFacility.name}"? This cannot be undone.`)) return;
    await deleteFacility(editingFacility.id);
    setEditingFacility(null);
  }, [editingFacility, deleteFacility]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Facilities</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your factory projects.</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {facilities.map((f) => {
          return (
            <div key={f.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-gray-900 truncate">{f.name}</h3>
                  {f.location && (
                    <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                      <MapPin size={14} className="shrink-0" />
                      <span className="truncate">{f.location}</span>
                    </div>
                  )}
                </div>
                {canEdit && (
                  <button
                    onClick={() => setEditingFacility(f)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    title="Edit facility"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>

              {f.description && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{f.description}</p>}

              <p className="text-xs text-slate-500 mb-3">Switch to view details</p>

              {/* Actions */}
              <div className="mt-auto flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleOpen(f)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  <ExternalLink size={12} /> Open
                </button>
                {canEdit && (
                  <>
                    <button
                      onClick={() => handleClone(f)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-slate-50 transition-colors"
                    >
                      <Copy size={12} /> Clone
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete "${f.name}"?`)) deleteFacility(f.id);
                      }}
                      className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {canEdit && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-xl border-2 border-dashed border-slate-300 bg-white/50 p-6 flex flex-col items-center justify-center gap-3 min-h-[200px] hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
              <Plus size={24} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </div>
            <span className="text-sm font-medium text-slate-500 group-hover:text-indigo-600 transition-colors">
              Create New Facility
            </span>
          </button>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <FacilityModal
          title="Create New Facility"
          initial={{ name: '', location: '', description: '' }}
          onSave={handleCreate}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Edit Modal */}
      {editingFacility && (
        <FacilityModal
          title={`Edit: ${editingFacility.name}`}
          initial={{
            name: editingFacility.name,
            location: editingFacility.location,
            description: editingFacility.description || '',
          }}
          onSave={handleEdit}
          onClose={() => setEditingFacility(null)}
          showDelete={canEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};

export default FacilitiesPage;
