"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import MainLayout from '@/components/MainLayout';
import { Trash2, Pencil, Plus, X, Eye, EyeOff, Users } from 'lucide-react';
import Image from 'next/image';

const API = 'http://localhost:3200';

// ══════════════════════════════════════════════════════════════════
//  FIELD COMPONENT
// ══════════════════════════════════════════════════════════════════
const Field = ({ label, icon, children, errorKey, errors }) => (
  <div style={{ marginBottom: '4px' }}>
    <label style={s.label}>{label}</label>
    <div style={s.inputGroup}>
      <span style={s.icon}>{icon}</span>
      {children}
    </div>
    {errors?.[errorKey] && <p style={s.errorText}>{errors[errorKey]}</p>}
  </div>
);

// ══════════════════════════════════════════════════════════════════
//  MODAL CREATE / EDIT USER
// ══════════════════════════════════════════════════════════════════
const UserModal = ({ user, roles, onClose, onSave }) => {
  const isEdit = !!user;
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    email:    user?.email    || '',
    password: '',
    phone:    user?.phone    || '',
    roleId:   user?.roleId?._id || user?.roleId || '',
  });
  const [errors,       setErrors]       = useState({});
  const [saving,       setSaving]       = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState('');

  const validate = () => {
    const e = {};
    if (!form.fullName.trim())               e.fullName = "Full name is required";
    if (!/\S+@\S+\.\S+/.test(form.email))   e.email    = "Invalid email";
    if (!isEdit && form.password.length < 6) e.password = "Password must be at least 6 characters";
    if (!/^[0-9]{8}$/.test(form.phone))     e.phone    = "Phone must be 8 digits";
    if (!form.roleId)                        e.roleId   = "Please select a role";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const data  = { fullName: form.fullName, email: form.email, phone: form.phone, roleId: form.roleId };
      if (form.password) data.password = form.password;
      if (isEdit) {
        await axios.put(`${API}/users/${user._id}`, data, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${API}/users/register`, data);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={s.modalOverlay}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <div style={s.modalLogo}>Smartsite</div>
          <button onClick={onClose} style={s.closeBtn}><X size={16} /></button>
        </div>
        <h3 style={s.modalTitle}>{isEdit ? 'Edit User' : 'Create User'}</h3>
        <p style={s.modalSubtitle}>
          {isEdit ? 'Update the information below.' : 'Fill in the details for the new user.'}
        </p>

        {error && <div style={s.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <Field label="Full Name" icon="👤" errorKey="fullName" errors={errors}>
                <input type="text" placeholder="John Doe" style={s.input}
                  value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Phone" icon="📱" errorKey="phone" errors={errors}>
                <input type="text" placeholder="8 digits" style={s.input}
                  value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </Field>
            </div>
          </div>

          <Field label="Email" icon="📧" errorKey="email" errors={errors}>
            <input type="email" placeholder="example@email.com" style={s.input}
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              disabled={isEdit} />
          </Field>

          <Field label={isEdit ? "New Password (optional)" : "Password"} icon="🔒" errorKey="password" errors={errors}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={isEdit ? "Leave blank to keep current" : "Minimum 6 characters"}
              style={s.input} value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} />
            <span style={s.eyeBtn} onClick={() => setShowPassword(v => !v)}>
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </span>
          </Field>

          <Field label="Role" icon="🎭" errorKey="roleId" errors={errors}>
            <select style={{ ...s.input, cursor: 'pointer' }}
              value={form.roleId} onChange={e => setForm({ ...form, roleId: e.target.value })}>
              <option value="">-- Select a role --</option>
              {roles.map(role => (
                <option key={role._id} value={role._id}>{role.name}</option>
              ))}
            </select>
          </Field>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="submit" disabled={saving} style={s.primaryBtn}>
              {saving ? 'Saving...' : isEdit ? '💾 Save Changes' : '✅ Create User'}
            </button>
            <button type="button" onClick={onClose} style={s.secondaryBtn}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
//  PAGE USERS
// ══════════════════════════════════════════════════════════════════
export default function UsersPage() {
  const router = useRouter();
  const [users,      setUsers]      = useState([]);
  const [roles,      setRoles]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showModal,  setShowModal]  = useState(false);
  const [editUser,   setEditUser]   = useState(null);
  const [deleteId,   setDeleteId]   = useState(null);

  const getToken = () => localStorage.getItem('token');

  // ✅ Admin only
  useEffect(() => {
    try {
      const token = getToken();
      if (!token) { router.push('/login'); return; }
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.roleName !== 'Admin') router.push('/');
    } catch { router.push('/login'); }
  }, []);

  const fetchUsers = async () => {
    try {
      const token = getToken();
      const res = await axios.get(`${API}/users`, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch { setError('Failed to load users.'); }
    finally  { setLoading(false); }
  };

  const fetchRoles = async () => {
    try {
      const res = await axios.get(`${API}/roles`);
      setRoles(res.data);
    } catch {}
  };

  useEffect(() => { fetchUsers(); fetchRoles(); }, []);

  const handleDelete = async (id) => {
    try {
      const token = getToken();
      await axios.delete(`${API}/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(prev => prev.filter(u => u._id !== id));
      setDeleteId(null);
    } catch { setError('Failed to delete user.'); }
  };

  const handleSave = () => {
    setShowModal(false);
    setEditUser(null);
    fetchUsers();
  };

  const getRoleName = (user) => {
    if (typeof user.roleId === 'object' && user.roleId?.name) return user.roleId.name;
    const role = roles.find(r => r._id === user.roleId);
    return role?.name || '—';
  };

  const getRoleBadgeColor = (roleName) => {
    const colors = {
      'Admin':         { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
      'Director':      { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
      'Site Engineer': { bg: '#d1fae5', color: '#065f46', border: '#a7f3d0' },
      'Accountant':    { bg: '#ede9fe', color: '#4c1d95', border: '#ddd6fe' },
      'Client':        { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' },
    };
    return colors[roleName] || colors['Client'];
  };

  const initials = (name) => name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const avatarColor = (name) => {
    const colors = ['#132849', '#1e40af', '#065f46', '#4c1d95', '#92400e', '#0f766e'];
    return colors[(name?.charCodeAt(0) || 0) % colors.length];
  };

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = !filterRole || getRoleName(u) === filterRole;
    return matchSearch && matchRole;
  });

  if (loading) return (
    <MainLayout>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #e0e0e0',
          borderTopColor: '#132849', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <style>{`
        @keyframes slideIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .user-row:hover   { background-color: #f8faff !important; }
        .action-btn:hover { filter: brightness(0.9); }
      `}</style>

      {/* Header */}
      <div style={s.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={s.headerIcon}>
            <Users size={24} color="#132849" />
          </div>
          <div>
            <h1 style={s.pageTitle}>User Management</h1>
            <p style={s.pageSubtitle}>{filtered.length} of {users.length} user{users.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={() => { setEditUser(null); setShowModal(true); }} style={s.createBtn}>
          <Plus size={18} />
          New User
        </button>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {/* Filters */}
      <div style={s.filters}>
        <div style={s.searchWrap}>
          <span style={{ fontSize: '16px' }}>🔍</span>
          <input type="text" placeholder="Search by name or email..."
            value={search} onChange={e => setSearch(e.target.value)} style={s.searchInput} />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
              <X size={14} />
            </button>
          )}
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={s.filterSelect}>
          <option value="">All Roles</option>
          {roles.map(r => <option key={r._id} value={r.name}>{r.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={s.tableCard}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              <th style={s.th}>User</th>
              <th style={s.th}>Email</th>
              <th style={s.th}>Phone</th>
              <th style={s.th}>Role</th>
              <th style={{ ...s.th, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: '#aaa', fontSize: '14px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
                  No users found
                </td>
              </tr>
            ) : filtered.map((user, idx) => {
              const roleName   = getRoleName(user);
              const roleColors = getRoleBadgeColor(roleName);
              return (
                <tr key={user._id} className="user-row" style={{
                  ...s.tr, animation: `slideIn 0.3s ease ${idx * 0.04}s both`,
                }}>
                  {/* User */}
                  <td style={s.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        backgroundColor: avatarColor(user.fullName),
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        fontSize: '14px', fontWeight: '800', color: '#f28c28', flexShrink: 0,
                        overflow: 'hidden',
                      }}>
                        {user.profileImage
                          ? <Image src={user.profileImage} alt="" width={40} height={40} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : initials(user.fullName)
                        }
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a2e' }}>
                        {user.fullName}
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td style={s.td}>
                    <span style={{ fontSize: '13px', color: '#555' }}>{user.email}</span>
                  </td>

                  {/* Phone */}
                  <td style={s.td}>
                    <span style={{ fontSize: '13px', color: '#555' }}>{user.phone || '—'}</span>
                  </td>

                  {/* Role */}
                  <td style={s.td}>
                    <span style={{
                      padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                      backgroundColor: roleColors.bg, color: roleColors.color,
                      border: `1px solid ${roleColors.border}`,
                    }}>
                      {roleName}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ ...s.td, textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
                      <button className="action-btn"
                        onClick={() => { setEditUser(user); setShowModal(true); }}
                        style={{ ...s.iconBtn, backgroundColor: '#132849', color: 'white' }}
                        title="Edit">
                        <Pencil size={15} />
                      </button>

                      {deleteId === user._id ? (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>Confirm?</span>
                          <button onClick={() => handleDelete(user._id)}
                            style={{ ...s.iconBtn, backgroundColor: '#ef4444', color: 'white' }}>
                            <Trash2 size={15} />
                          </button>
                          <button onClick={() => setDeleteId(null)}
                            style={{ ...s.iconBtn, backgroundColor: '#f4f4f5', color: '#555' }}>
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <button className="action-btn"
                          onClick={() => setDeleteId(user._id)}
                          style={{ ...s.iconBtn, backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5' }}
                          title="Delete">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <UserModal
          user={editUser}
          roles={roles}
          onClose={() => { setShowModal(false); setEditUser(null); }}
          onSave={handleSave}
        />
      )}
    </MainLayout>
  );
}

// ══════════════════════════════════════════════════════════════════
//  STYLES
// ══════════════════════════════════════════════════════════════════
const s = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  headerIcon: {
    width: '48px', height: '48px', borderRadius: '12px',
    backgroundColor: '#f0f4ff', display: 'flex',
    justifyContent: 'center', alignItems: 'center',
  },
  pageTitle:   { fontSize: '22px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  pageSubtitle:{ fontSize: '13px', color: '#888', marginTop: '2px' },
  createBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    backgroundColor: '#f28c28', color: '#000', border: 'none',
    padding: '10px 20px', borderRadius: '10px', cursor: 'pointer',
    fontWeight: '700', fontSize: '14px', transition: '0.2s',
  },
  filters: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: '8px', flex: 1,
    border: '1px solid #e0e0e0', borderRadius: '10px', padding: '0 14px',
    backgroundColor: 'white', minWidth: '200px',
  },
  searchInput: { flex: 1, border: 'none', outline: 'none', padding: '10px 4px', fontSize: '13px', backgroundColor: 'transparent' },
  filterSelect: {
    padding: '10px 14px', borderRadius: '10px', border: '1px solid #e0e0e0',
    backgroundColor: 'white', fontSize: '13px', cursor: 'pointer', outline: 'none',
  },
  tableCard: { backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', overflow: 'hidden' },
  table:  { width: '100%', borderCollapse: 'collapse' },
  thead:  { backgroundColor: '#f8faff' },
  th: {
    padding: '14px 16px', textAlign: 'left', fontSize: '12px',
    fontWeight: '700', color: '#132849', textTransform: 'uppercase',
    letterSpacing: '0.5px', borderBottom: '1px solid #e8edf5',
  },
  tr: { borderBottom: '1px solid #f0f4f8', transition: 'background-color 0.15s' },
  td: { padding: '14px 16px', verticalAlign: 'middle' },
  iconBtn: {
    width: '32px', height: '32px', borderRadius: '8px', border: 'none',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  },
  errorBox: {
    backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626',
    borderRadius: '10px', padding: '12px 16px', fontSize: '13px', marginBottom: '16px',
  },
  modalOverlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 200, backdropFilter: 'blur(4px)',
  },
  modal: {
    backgroundColor: 'white', borderRadius: '20px', padding: '36px',
    width: '540px', maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)', animation: 'slideIn 0.3s ease',
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  modalLogo: {
    fontSize: '11px', fontWeight: '800', letterSpacing: '3px', color: '#132849',
    textTransform: 'uppercase', borderLeft: '3px solid #f28c28', paddingLeft: '10px',
  },
  closeBtn: {
    background: '#f4f4f5', border: 'none', borderRadius: '50%', width: '30px', height: '30px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555',
  },
  modalTitle:    { fontSize: '20px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 4px' },
  modalSubtitle: { fontSize: '13px', color: '#888', marginBottom: '20px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '5px', display: 'block' },
  inputGroup: {
    display: 'flex', alignItems: 'center', border: '1px solid #e0e0e0',
    borderRadius: '8px', padding: '0 10px', backgroundColor: '#fcfcfc', marginBottom: '2px',
  },
  icon:    { marginRight: '8px', fontSize: '15px' },
  eyeBtn:  { cursor: 'pointer', padding: '4px', color: '#888', display: 'flex', alignItems: 'center' },
  input: {
    flex: 1, border: 'none', outline: 'none', padding: '10px 4px',
    width: '100%', backgroundColor: 'transparent', fontSize: '13px', color: '#1a1a2e',                 // ✅ ajoute
    WebkitTextFillColor: '#1a1a2e',
  },
  errorText: { color: '#ef4444', fontSize: '11px', marginBottom: '6px', marginTop: '2px' },
  primaryBtn: {
    flex: 1, backgroundColor: '#f28c28', color: '#000', border: 'none',
    padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px',
  },
  secondaryBtn: {
    flex: 1, backgroundColor: '#f4f4f5', color: '#555', border: '1px solid #e4e4e7',
    padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px',
  },
};