import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Building2,
  ClipboardList,
  Shield,
  ShieldAlert,
  UserPlus,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  RefreshCw,
  X,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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

interface AuditEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  user_id: string | null;
  created_at: string;
}

type Tab = 'users' | 'facilities' | 'audit';

// ---------------------------------------------------------------------------
// Role dropdown
// ---------------------------------------------------------------------------

const ROLES = ['admin', 'editor', 'viewer'] as const;

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-indigo-100 text-indigo-700',
  editor: 'bg-emerald-100 text-emerald-700',
  viewer: 'bg-gray-100 text-gray-600',
};

const RoleDropdown: React.FC<{
  currentRole: string;
  userId: string;
  onUpdate: (userId: string, role: string) => void;
}> = ({ currentRole, userId, onUpdate }) => {
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
                  onUpdate(userId, r);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await client.post('/users', {
        email: email.trim(),
        name: name.trim(),
        role,
        department: department.trim() || null,
      });
      onCreated(res.data);
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
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
              disabled={submitting || !email.trim() || !name.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Users Tab
// ---------------------------------------------------------------------------

const UsersTab: React.FC = () => {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.get('/users');
      setUsers(res.data);
    } catch {
      setError('Failed to load users. Make sure the backend is running.');
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
    } catch {
      // Revert is implicit — we only update on success
    }
  }, []);

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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
        {error}
        <button onClick={loadUsers} className="ml-3 font-medium underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
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

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Department
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Last Login
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {users.map((u) => (
              <tr key={u.id} className={!u.is_active ? 'opacity-50' : ''}>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">{u.name}</div>
                  {u.job_title && (
                    <div className="text-xs text-gray-400">{u.job_title}</div>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                  {u.email}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <RoleDropdown currentRole={u.role} userId={u.id} onUpdate={handleRoleUpdate} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                  {u.department || '--'}
                </td>
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
                  {formatDate(u.last_login)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showInvite && (
        <InviteUserForm onClose={() => setShowInvite(false)} onCreated={handleUserCreated} />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Facilities Tab — link to /facilities
// ---------------------------------------------------------------------------

const FacilitiesTab: React.FC = () => (
  <div className="text-center py-16">
    <Building2 size={40} className="mx-auto text-gray-300 mb-4" />
    <h3 className="text-base font-semibold text-gray-900 mb-2">Facility Management</h3>
    <p className="text-sm text-gray-500 mb-6">
      Manage facilities, clone projects, and track status from the dedicated page.
    </p>
    <Link
      to="/facilities"
      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
    >
      <Building2 size={16} />
      Go to Facilities
    </Link>
  </div>
);

// ---------------------------------------------------------------------------
// Audit Log Tab
// ---------------------------------------------------------------------------

const AuditTab: React.FC = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.get('/audit', { params: { limit: 100 } });
      setEntries(res.data);
    } catch {
      setError('Failed to load audit log. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const actionColor = useMemo(
    () =>
      (action: string): string => {
        switch (action.toLowerCase()) {
          case 'create':
            return 'bg-green-100 text-green-700';
          case 'delete':
            return 'bg-red-100 text-red-700';
          case 'update':
            return 'bg-blue-100 text-blue-700';
          default:
            return 'bg-gray-100 text-gray-600';
        }
      },
    [],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw size={20} className="animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading audit log...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
        {error}
        <button onClick={loadAudit} className="ml-3 font-medium underline">
          Retry
        </button>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-16">
        <ClipboardList size={40} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-base font-semibold text-gray-900 mb-1">No audit entries yet</h3>
        <p className="text-sm text-gray-500">Changes to cost items, facilities, and budgets will appear here.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{entries.length} recent entries</p>
        <button
          onClick={loadAudit}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Timestamp
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Action
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Entity
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Field
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Change
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500 tabular-nums">
                  {formatTimestamp(entry.created_at)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                  {entry.user_id || '--'}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${actionColor(entry.action)}`}
                  >
                    {entry.action}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                  {entry.entity_type}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                  {entry.field_name || '--'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                  {entry.old_value || entry.new_value ? (
                    <span>
                      {entry.old_value && (
                        <span className="line-through text-red-400 mr-1">{entry.old_value}</span>
                      )}
                      {entry.new_value && <span className="text-green-600">{entry.new_value}</span>}
                    </span>
                  ) : (
                    '--'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Admin Page
// ---------------------------------------------------------------------------

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'users', label: 'Users', icon: Users },
  { key: 'facilities', label: 'Facilities', icon: Building2 },
  { key: 'audit', label: 'Audit Log', icon: ClipboardList },
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
          <Shield size={20} className="text-indigo-600" />
          <h1 className="text-xl font-semibold text-gray-900">Administration</h1>
        </div>
        <p className="text-sm text-gray-500">
          Manage users, facilities, and review system activity.
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
      {activeTab === 'facilities' && <FacilitiesTab />}
      {activeTab === 'audit' && <AuditTab />}
    </div>
  );
};

export default AdminPage;
