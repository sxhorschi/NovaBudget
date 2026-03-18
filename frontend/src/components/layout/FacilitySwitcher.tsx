import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Plus, Building2 } from 'lucide-react';
import { useFacility } from '../../context/FacilityContext';

// ---------------------------------------------------------------------------
// Create Facility Inline Form
// ---------------------------------------------------------------------------

const CreateFacilityForm: React.FC<{
  onSubmit: (name: string, location: string) => void;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim(), location.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="px-3 py-2.5 border-t border-gray-100">
      <p className="text-xs font-medium text-gray-500 mb-2">New Facility</p>
      <input
        ref={nameRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Facility name"
        className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 mb-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
      />
      <input
        type="text"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Location"
        className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 mb-2 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!name.trim()}
          className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-md px-3 py-1.5 transition-colors"
        >
          Create
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-medium text-gray-500 hover:text-gray-700 rounded-md px-3 py-1.5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

// ---------------------------------------------------------------------------
// FacilitySwitcher
// ---------------------------------------------------------------------------

const FacilitySwitcher: React.FC = () => {
  const navigate = useNavigate();
  const { facilities, currentFacility, setCurrentFacility, createFacility } = useFacility();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!currentFacility) return null;

  const handleSelect = (id: string) => {
    setCurrentFacility(id);
    navigate(`/f/${id}/costbook`);
    setOpen(false);
    setShowCreate(false);
  };

  const handleCreate = (name: string, location: string) => {
    const newFacility = createFacility(name, location);
    navigate(`/f/${newFacility.id}/costbook`);
    setOpen(false);
    setShowCreate(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 group"
        aria-label={`Switch facility. Current: ${currentFacility.name}`}
        aria-expanded={open}
      >
        {/* Name */}
        <span className="text-sm font-semibold text-gray-700 truncate max-w-[180px]">
          {currentFacility.name}
        </span>
        {/* Chevron */}
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-72 rounded-xl bg-white shadow-xl border border-gray-100 py-1 z-[200] animate-in fade-in slide-in-from-top-1 duration-100">
          {/* Facility list */}
          {facilities.map((facility) => {
            const isActive = facility.id === currentFacility.id;
            return (
              <button
                key={facility.id}
                type="button"
                onClick={() => handleSelect(facility.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                  isActive
                    ? 'bg-indigo-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className={`text-sm truncate ${isActive ? 'font-semibold text-indigo-700' : 'font-medium text-gray-700'}`}>
                    {facility.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{facility.location}</p>
                </div>
                {isActive && (
                  <span className="text-[10px] font-medium text-indigo-500 flex-shrink-0">Current</span>
                )}
              </button>
            );
          })}

          {/* Divider + Create button / form */}
          {showCreate ? (
            <CreateFacilityForm
              onSubmit={handleCreate}
              onCancel={() => setShowCreate(false)}
            />
          ) : (
            <div className="border-t border-gray-100 mt-1 pt-1">
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-500 hover:text-indigo-600 hover:bg-gray-50 transition-colors"
              >
                <Plus size={14} />
                Create New Facility
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate('/facilities');
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-500 hover:text-indigo-600 hover:bg-gray-50 transition-colors"
              >
                <Building2 size={14} />
                Manage All Facilities
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FacilitySwitcher;
