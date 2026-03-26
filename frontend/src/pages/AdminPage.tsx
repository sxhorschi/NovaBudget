import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Shield,
  ShieldAlert,
  UserPlus,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  RefreshCw,
  X,
  ArrowLeft,
  Plus,
  Trash2,
  Key,
  Network,
  Settings,
  Pencil,
  Check,
  Download,
  Upload,
  Image,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import type { AppConfig, ConfigItem } from '../context/ConfigContext';
import { useFacility } from '../context/FacilityContext';
import { useToast } from '../components/common/ToastProvider';
import client from '../api/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string | null;
  job_title: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

interface Permission {
  id: string;
  user_id: string;
  facility_id: string | null;
  role: string;
  created_at: string;
}

interface GroupMapping {
  id: string;
  entra_group_name: string;
  app_role: string;
  facility_id: string | null;
  created_at: string;
}

type Tab = 'users' | 'permissions' | 'group-mapping' | 'configuration';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const ROLES = ['admin', 'editor', 'viewer'] as const;

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-indigo-50 text-indigo-600',
  editor: 'bg-emerald-100 text-emerald-700',
  viewer: 'bg-gray-100 text-gray-600',
  pending: 'bg-amber-100 text-amber-700',
};

const formatDate = (dateStr: string | null, includeTime = false) => {
  if (!dateStr) return '--';
  // Backend stores UTC but without timezone suffix — append Z so the browser converts to local time
  const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  const date = d.toLocaleDateString('de-DE', { year: 'numeric', month: 'short', day: 'numeric' });
  if (!includeTime) return date;
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return `${date}, ${time}`;
};

// ---------------------------------------------------------------------------
// Role dropdown (reused across tabs)
// ---------------------------------------------------------------------------

const RoleDropdown: React.FC<{
  currentRole: string;
  onChange: (role: string) => void;
}> = ({ currentRole, onChange }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${ROLE_BADGE[currentRole] ?? ROLE_BADGE.viewer}`}
      >
        {currentRole}
        <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 w-32 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => {
                  onChange(r);
                  setOpen(false);
                }}
                className={`flex w-full items-center px-3 py-1.5 text-xs hover:bg-gray-50 ${
                  r === currentRole ? 'font-semibold text-indigo-600' : 'text-gray-700'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Invite User Form (modal)
// ---------------------------------------------------------------------------

const InviteUserForm: React.FC<{
  onClose: () => void;
  onCreated: (user: ApiUser) => void;
}> = ({ onClose, onCreated }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('viewer');
  const [department, setDepartment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await client.post('/users', {
        email: email.trim(),
        name: name.trim() || null,
        role,
        department: department.trim() || null,
      });
      onCreated(res.data);
      toast.success(`Invitation sent to ${email.trim()}`);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Failed to create user';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Invite User</h3>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5 text-sm text-blue-700 mb-4">
          Enter the user's Microsoft email. They will be able to log in with this role once they sign in with their Azure account.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="user@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="viewer">Viewer -- read-only access</option>
              <option value="editor">Editor -- can create and edit items</option>
              <option value="admin">Admin -- full access including user management</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-gray-400 font-normal">(optional -- filled from Azure on first login)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Engineering"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !email.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Invite User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Delete Confirmation Dialog
// ---------------------------------------------------------------------------

const DeleteUserDialog: React.FC<{
  userName: string;
  onCancel: () => void;
  onConfirm: () => void;
  deleting: boolean;
}> = ({ userName, onCancel, onConfirm, deleting }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle size={20} className="text-red-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Delete User</h3>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        Are you sure you want to remove <span className="font-semibold text-gray-900">{userName}</span>? This action cannot be undone.
      </p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={deleting}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={deleting}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Tab 1: Users
// ---------------------------------------------------------------------------

const UsersTab: React.FC = () => {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.get('/users');
      setUsers(res.data);
    } catch {
      setError('Backend not reachable. Start the backend with "docker compose up" to manage users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleRoleUpdate = useCallback(async (userId: string, newRole: string) => {
    try {
      const res = await client.put(`/users/${userId}`, { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.data : u)));
      toast.success('Role updated');
    } catch {
      toast.error('Failed to update role');
    }
  }, [toast]);

  const handleToggleActive = useCallback(async (userId: string, currentlyActive: boolean) => {
    try {
      const res = await client.put(`/users/${userId}`, { is_active: !currentlyActive });
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.data : u)));
    } catch {
      // Revert is implicit
    }
  }, []);

  const handleUserCreated = useCallback((newUser: ApiUser) => {
    setUsers((prev) => [...prev, newUser]);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await client.delete(`/users/${deleteTarget.id}/permanent`);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      toast.success(`${deleteTarget.name || deleteTarget.email} has been removed`);
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Failed to delete user';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw size={20} className="animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading users...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
        {error}
        <button onClick={loadUsers} className="ml-3 font-medium underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {users.length} user{users.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
          <button
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
          >
            <UserPlus size={12} />
            Invite User
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Department</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Last Login</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {users.map((u) => {
              const isCurrentUser = currentUser?.id === u.id;
              const isInvited = !u.last_login;
              const isPending = u.role === 'pending';
              return (
                <tr key={u.id} className={!u.is_active ? 'opacity-50' : ''}>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-gray-900">
                        {u.name || <span className="text-gray-400 italic">No name yet</span>}
                      </div>
                      {isInvited && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600 border border-blue-200">
                          Invited
                        </span>
                      )}
                    </div>
                    {u.job_title && <div className="text-xs text-gray-400">{u.job_title}</div>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{u.email}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {isPending ? (
                      <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${ROLE_BADGE.pending}`}>
                        pending
                      </span>
                    ) : (
                      <RoleDropdown currentRole={u.role} onChange={(role) => handleRoleUpdate(u.id, role)} />
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{u.department || '--'}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(u.id, u.is_active)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        u.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {u.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      {u.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {u.last_login ? formatDate(u.last_login, true) : <span className="text-gray-300">Never</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {!isCurrentUser && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(u)}
                        className="inline-flex items-center gap-1 rounded-md p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title={`Delete ${u.name || u.email}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showInvite && (
        <InviteUserForm onClose={() => setShowInvite(false)} onCreated={handleUserCreated} />
      )}

      {deleteTarget && (
        <DeleteUserDialog
          userName={deleteTarget.name || deleteTarget.email}
          onCancel={() => { setDeleteTarget(null); setDeleting(false); }}
          onConfirm={handleDeleteConfirm}
          deleting={deleting}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Tab 2: Permissions
// ---------------------------------------------------------------------------

const PermissionsTab: React.FC = () => {
  const { facilities } = useFacility();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add form state
  const [newUserId, setNewUserId] = useState('');
  const [newFacilityId, setNewFacilityId] = useState('');
  const [newRole, setNewRole] = useState('viewer');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [permRes, userRes] = await Promise.all([
        client.get('/permissions'),
        client.get('/users'),
      ]);
      setPermissions(permRes.data);
      setUsers(userRes.data);
    } catch {
      setError('Backend not reachable. Start the backend with "docker compose up" to manage permissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const userMap = useMemo(() => {
    const m = new Map<string, ApiUser>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  const facilityMap = useMemo(() => {
    const m = new Map<string, string>();
    facilities.forEach((f) => m.set(f.id, f.name));
    return m;
  }, [facilities]);

  const handleAdd = useCallback(async () => {
    if (!newUserId) return;
    setSubmitting(true);
    try {
      const res = await client.post('/permissions', {
        user_id: newUserId,
        facility_id: newFacilityId || null,
        role: newRole,
      });
      setPermissions((prev) => [res.data, ...prev]);
      setNewUserId('');
      setNewFacilityId('');
      setNewRole('viewer');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Failed to add permission';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [newUserId, newFacilityId, newRole]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await client.delete(`/permissions/${id}`);
      setPermissions((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // silent fail
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw size={20} className="animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading permissions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
        {error}
        <button onClick={load} className="ml-3 font-medium underline">Retry</button>
      </div>
    );
  }

  return (
    <div>
      {/* Add form */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">User</label>
          <select
            value={newUserId}
            onChange={(e) => setNewUserId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Select user...</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Facility</label>
          <select
            value={newFacilityId}
            onChange={(e) => setNewFacilityId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Global (all facilities)</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div className="w-32">
          <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleAdd}
          disabled={!newUserId || submitting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Facility</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Created</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {permissions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                  No permissions assigned yet. Use the form above to add one.
                </td>
              </tr>
            ) : (
              permissions.map((p) => {
                const user = userMap.get(p.user_id);
                return (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{user?.name ?? p.user_id}</div>
                      {user && <div className="text-xs text-gray-400">{user.email}</div>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {p.facility_id ? facilityMap.get(p.facility_id) ?? p.facility_id : 'Global'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${ROLE_BADGE[p.role] ?? ROLE_BADGE.viewer}`}>
                        {p.role}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{formatDate(p.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={12} />
                        Revoke
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Tab 3: Group Mapping
// ---------------------------------------------------------------------------

const GroupMappingTab: React.FC = () => {
  const { facilities } = useFacility();
  const [mappings, setMappings] = useState<GroupMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add form
  const [groupName, setGroupName] = useState('');
  const [appRole, setAppRole] = useState('viewer');
  const [facilityId, setFacilityId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.get('/permissions/group-mappings');
      setMappings(res.data);
    } catch {
      setError('Backend not reachable. Start the backend with "docker compose up" to manage group mappings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const facilityMap = useMemo(() => {
    const m = new Map<string, string>();
    facilities.forEach((f) => m.set(f.id, f.name));
    return m;
  }, [facilities]);

  const handleAdd = useCallback(async () => {
    if (!groupName.trim()) return;
    setSubmitting(true);
    try {
      const res = await client.post('/permissions/group-mappings', {
        entra_group_name: groupName.trim(),
        app_role: appRole,
        facility_id: facilityId || null,
      });
      setMappings((prev) => [res.data, ...prev]);
      setGroupName('');
      setAppRole('viewer');
      setFacilityId('');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Failed to create mapping';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [groupName, appRole, facilityId]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await client.delete(`/permissions/group-mappings/${id}`);
      setMappings((prev) => prev.filter((m) => m.id !== id));
    } catch {
      // silent fail
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw size={20} className="animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading group mappings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
        {error}
        <button onClick={load} className="ml-3 font-medium underline">Retry</button>
      </div>
    );
  }

  return (
    <div>
      {/* Add form */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Entra Group Name</label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Group name"
          />
        </div>
        <div className="w-32">
          <label className="block text-xs font-medium text-gray-500 mb-1">App Role</label>
          <select
            value={appRole}
            onChange={(e) => setAppRole(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Facility</label>
          <select
            value={facilityId}
            onChange={(e) => setFacilityId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Global (all facilities)</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleAdd}
          disabled={!groupName.trim() || submitting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Entra Group</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">App Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Facility</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Created</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {mappings.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                  No group mappings yet. Use the form above to add one.
                </td>
              </tr>
            ) : (
              mappings.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{m.entra_group_name}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${ROLE_BADGE[m.app_role] ?? ROLE_BADGE.viewer}`}>
                      {m.app_role}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {m.facility_id ? facilityMap.get(m.facility_id) ?? m.facility_id : 'Global'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{formatDate(m.created_at)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Tab 4: Configuration
// ---------------------------------------------------------------------------

/** A single editable config section (Products, Phases, etc.) */
const ConfigSection: React.FC<{
  title: string;
  items: ConfigItem[];
  onUpdate: (items: ConfigItem[]) => void;
}> = ({ title, items, onUpdate }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [addLabel, setAddLabel] = useState('');

  /** Auto-generate an ID from a label: lowercase, spaces to underscores, strip special chars. */
  const generateId = (label: string): string =>
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

  const startEdit = (item: ConfigItem) => {
    setEditingId(item.id);
    setEditLabel(item.label);
  };

  const saveEdit = () => {
    if (!editingId || !editLabel.trim()) return;
    onUpdate(items.map((it) => (it.id === editingId ? { ...it, label: editLabel.trim() } : it)));
    setEditingId(null);
    setEditLabel('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel('');
  };

  const handleAdd = () => {
    const label = addLabel.trim();
    if (!label) return;
    const id = generateId(label);
    if (!id) return;
    if (items.some((it) => it.id === id)) return;
    onUpdate([...items, { id, label }]);
    setAddLabel('');
  };

  const handleDelete = (id: string) => {
    onUpdate(items.filter((it) => it.id !== id));
  };

  return (
    <div className="rounded-lg border border-gray-200">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
      </div>
      <div className="p-4 space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <span className="text-xs text-gray-400 font-mono w-40 truncate" title={item.id}>{item.id}</span>
            {editingId === item.id ? (
              <>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                  className="flex-1 rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
                <button onClick={saveEdit} className="p-1 text-green-600 hover:text-green-800"><Check size={14} /></button>
                <button onClick={cancelEdit} className="p-1 text-gray-400 hover:text-gray-600"><X size={14} /></button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-gray-700">{item.label}</span>
                <button
                  onClick={() => startEdit(item)}
                  className="p-1 text-gray-300 hover:text-black opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1 text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </>
            )}
          </div>
        ))}

        {/* Add row */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <input
            type="text"
            value={addLabel}
            onChange={(e) => setAddLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Enter name (ID generated automatically)"
          />
          <button
            onClick={handleAdd}
            disabled={!addLabel.trim()}
            className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus size={12} />
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Branding section — logo upload
// ---------------------------------------------------------------------------

const LOGO_API_PATH = '/config/logo';

const BrandingSection: React.FC = () => {
  const [logoUrl, setLogoUrl] = useState<string>(`${client.defaults.baseURL}${LOGO_API_PATH}`);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [logoKey, setLogoKey] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'File too large. Max 2 MB.' });
      return;
    }

    setUploading(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      await client.post(LOGO_API_PATH, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLogoUrl(`${client.defaults.baseURL}${LOGO_API_PATH}?t=${Date.now()}`);
      setLogoKey((k) => k + 1);
      setFeedback({ type: 'success', message: 'Logo updated for all users.' });
      window.dispatchEvent(new Event('budget-tool:logo-changed'));
    } catch {
      setFeedback({ type: 'error', message: 'Failed to upload logo.' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 mb-6">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Image size={16} className="text-gray-500" />
          <h4 className="text-sm font-semibold text-gray-800">Branding</h4>
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-500 mb-4">
          Upload a custom logo to replace the default logo in the top bar. Accepted formats: PNG, JPG, SVG.
        </p>

        {/* Current logo preview */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-2">Current Logo</label>
          <div className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-4 min-h-[64px]">
            <img
              key={logoKey}
              src={logoUrl}
              alt="Current logo"
              className="h-10 w-auto"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.dataset.fallback) {
                  img.dataset.fallback = '1';
                  img.src = '/logo-placeholder.svg';
                }
              }}
            />
          </div>
        </div>

        {/* Upload control */}
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            onChange={handleFileSelect}
            className="hidden"
            id="logo-upload"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Upload size={14} />
            {uploading ? 'Uploading...' : 'Upload New Logo'}
          </button>
          <span className="text-xs text-gray-400">PNG, JPG, or SVG, recommended height 32-64px</span>
        </div>

        {/* Feedback message */}
        {feedback && (
          <div
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              feedback.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {feedback.message}
          </div>
        )}
      </div>
    </div>
  );
};

const ConfigurationTab: React.FC = () => {
  const { config, updateConfig, isLoading } = useConfig();
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync from context when it reloads
  useEffect(() => {
    setLocalConfig(config);
    setDirty(false);
  }, [config]);

  const handleSectionUpdate = (section: keyof AppConfig) => (items: ConfigItem[]) => {
    setLocalConfig((prev) => ({ ...prev, [section]: items }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    await updateConfig(localConfig);
    setDirty(false);
    setSaving(false);
  };

  const handleExportCSV = () => {
    const rows: string[] = ['section,id,label'];
    const sections: (keyof AppConfig)[] = ['products', 'phases', 'cost_bases', 'cost_drivers'];
    for (const section of sections) {
      for (const item of localConfig[section]) {
        rows.push(`${section},"${item.id}","${item.label}"`);
      }
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const lines = text.trim().split('\n').slice(1); // skip header
      const parsed: AppConfig = { products: [], phases: [], cost_bases: [], cost_drivers: [] };
      for (const line of lines) {
        const match = line.match(/^(\w+),"?([^",]+)"?,"?([^"]+)"?$/);
        if (!match) continue;
        const [, section, id, label] = match;
        if (section in parsed) {
          (parsed as unknown as Record<string, ConfigItem[]>)[section].push({ id: id.trim(), label: label.trim() });
        }
      }
      // Only apply sections that have items
      const merged = { ...localConfig };
      if (parsed.products.length > 0) merged.products = parsed.products;
      if (parsed.phases.length > 0) merged.phases = parsed.phases;
      if (parsed.cost_bases.length > 0) merged.cost_bases = parsed.cost_bases;
      if (parsed.cost_drivers.length > 0) merged.cost_drivers = parsed.cost_drivers;
      setLocalConfig(merged);
      setDirty(true);
    };
    input.click();
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          Edit products, phases, cost bases, and cost drivers used across the application.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleImportCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <Upload size={12} />
            Import CSV
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <Download size={12} />
            Export CSV
          </button>
          {dirty && (
            <button
              onClick={handleSave}
              disabled={saving || isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      {/* Branding */}
      <BrandingSection />

      {/* Config sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ConfigSection title="Products" items={localConfig.products} onUpdate={handleSectionUpdate('products')} />
        <ConfigSection title="Phases" items={localConfig.phases} onUpdate={handleSectionUpdate('phases')} />
        <ConfigSection title="Cost Bases" items={localConfig.cost_bases} onUpdate={handleSectionUpdate('cost_bases')} />
        <ConfigSection title="Cost Drivers" items={localConfig.cost_drivers} onUpdate={handleSectionUpdate('cost_drivers')} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Admin Page (main)
// ---------------------------------------------------------------------------

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'users', label: 'Users', icon: Users },
  { key: 'permissions', label: 'Permissions', icon: Key },
  { key: 'group-mapping', label: 'Group Mapping', icon: Network },
  { key: 'configuration', label: 'Configuration', icon: Settings },
];

const AdminPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('users');

  // Access Denied guard
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <ShieldAlert size={48} className="text-red-400 mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-sm text-gray-500 mb-6 text-center max-w-md">
          You need administrator privileges to access this page.
          Your current role is <span className="font-medium">{user?.role ?? 'unknown'}</span>.
          Contact an admin if you believe this is an error.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={20} className="text-black" />
          <h1 className="text-xl font-semibold text-gray-900">Administration</h1>
        </div>
        <p className="text-sm text-gray-500">
          Manage users, permissions, Entra group mappings, and application configuration.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 pb-3 pt-2 text-sm font-medium transition-colors border-b-2 ${
                isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'permissions' && <PermissionsTab />}
      {activeTab === 'group-mapping' && <GroupMappingTab />}
      {activeTab === 'configuration' && <ConfigurationTab />}
    </div>
  );
};

export default AdminPage;
