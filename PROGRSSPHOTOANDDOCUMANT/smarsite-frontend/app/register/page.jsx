"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { getApiBaseUrl } from '@/lib/api';

/** Registration dropdown order (names match DB / JWT). */
const REGISTER_ROLE_ORDER = [
  'Client',
  'Project Manager',
  'Site Engineer',
  'Financier',
  'Director',
];

/** Display labels in English (key = DB name). */
const ROLE_LABEL_EN = {
  Client: 'Client',
  'Project Manager': 'Project Manager',
  'Site Engineer': 'Site Engineer',
  Financier: 'Finance',
  Director: 'Director',
};

function normalizeRoleName(name) {
  return String(name ?? '').trim();
}

function sortRegisterRoles(list) {
  const orderIndex = (name) => {
    const i = REGISTER_ROLE_ORDER.indexOf(name);
    return i === -1 ? 1000 : i;
  };
  return [...list].sort(
    (a, b) =>
      orderIndex(normalizeRoleName(a.name)) -
        orderIndex(normalizeRoleName(b.name)) ||
      normalizeRoleName(a.name).localeCompare(normalizeRoleName(b.name), 'en'),
  );
}

function labelForRole(role) {
  const name = normalizeRoleName(role.name);
  return ROLE_LABEL_EN[name] ?? name;
}

/* Field outside Register to avoid input focus bugs on re-render */
const Field = ({ label, icon, children, errorKey, errors }) => (
  <div style={{ marginBottom: '4px' }}>
    <label style={styles.label}>{label}</label>
    <div style={styles.inputGroup}>
      <span style={styles.icon}>{icon}</span>
      {children}
    </div>
    {errors[errorKey] && <p style={styles.errorText}>{errors[errorKey]}</p>}
  </div>
);

const Register = () => {
  const router = useRouter();

  const [roles, setRoles] = useState([]);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    roleId: '',
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const base = getApiBaseUrl();
    axios
      .get(`${base}/roles`)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        /* Public signup: hide Admin; if nothing left, show any named roles (e.g. empty DB). */
        let registerRoles = list.filter(
          (r) => r?.name && normalizeRoleName(r.name) !== 'Admin',
        );
        if (registerRoles.length === 0) {
          registerRoles = list.filter((r) => r?.name);
        }
        setRoles(sortRegisterRoles(registerRoles));
      })
      .catch(() => setError('Unable to load roles'));
  }, []);

  const validate = () => {
    let newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';
    if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!/^[0-9]{8}$/.test(formData.phone)) newErrors.phone = 'Phone must be 8 digits';
    if (!formData.roleId) newErrors.roleId = 'Please select a role';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      const base = getApiBaseUrl();
      await axios.post(`${base}/users/register`, formData);
      router.push(
        '/login?successMessage=' +
          encodeURIComponent('Account created! Please sign in.'),
      );
    } catch (err) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        (Array.isArray(err?.response?.data?.message)
          ? err.response.data.message.join(' · ')
          : null);
      setError(
        msg
          ? String(msg)
          : 'Registration failed. Email already in use?',
      );
    }
  };

  return (
    
    <div style={styles.container}>
      <div style={styles.deco1}>🏗️</div>
      <div style={styles.deco2}>📐</div>
      <div style={styles.deco3}>🏢</div>

      <div style={styles.card}>

        {/* LEFT – Form */}
        <div style={styles.leftSection}>
          <div style={styles.logo}>Smartsite</div>
          <h2 style={styles.title}>Sign up</h2>
          <p style={styles.subtitle}>Create your account for free</p>

          {error && <div style={styles.errorBox}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={styles.row}>
              <div style={{ flex: 1 }}>
                <Field label="Full name" icon="👤" errorKey="fullName" errors={errors}>
                  <input
                    type="text"
                    placeholder="Jane Doe"
                    style={styles.input}
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Phone" icon="📱" errorKey="phone" errors={errors}>
                  <input
                    type="text"
                    placeholder="8 digits"
                    style={styles.input}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </Field>
              </div>
            </div>

            <Field label="Email" icon="📧" errorKey="email" errors={errors}>
              <input
                type="email"
                placeholder="you@example.com"
                style={styles.input}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Field>

            <Field label="Password" icon="🔒" errorKey="password" errors={errors}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 6 characters"
                style={styles.input}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <span style={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? '🙈' : '👁️'}
              </span>
            </Field>

            <Field label="Role" icon="🎭" errorKey="roleId" errors={errors}>
              <select
                style={{ ...styles.input, cursor: 'pointer' }}
                value={formData.roleId}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                aria-label="Choose your role"
              >
                <option value="">-- Select a role --</option>
                {roles.map((role) => {
                  const id = role._id != null ? String(role._id) : String(role.id ?? '');
                  return (
                    <option key={id} value={id}>
                      {labelForRole(role)}
                    </option>
                  );
                })}
              </select>
            </Field>

            <button type="submit" style={styles.button}>Create account</button>
          </form>

          <p style={styles.loginLink}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#5d5fef', fontWeight: '600' }}>Sign in</Link>
          </p>
        </div>

        {/* RIGHT – Hero panel */}
        <div style={styles.rightSection}>
          <div style={styles.overlay}>
            <div style={styles.shield}></div>
            <h2 style={styles.rightTitle}>SmartSite</h2>
            <p style={styles.rightText}>
              SmartSite brings your site data together and automates progress tracking
              with AI — visual detection, delay prediction, and real-time budget control.
            </p>
            <button onClick={() => router.push('/login')} style={styles.loginButton}>
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#132849',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    position: 'relative',
    overflow: 'hidden',
  },
  deco1: { position: 'absolute', top: '8%', left: '5%', fontSize: '80px', opacity: 0.07, color: 'white', userSelect: 'none' },
  deco2: { position: 'absolute', bottom: '10%', right: '4%', fontSize: '100px', opacity: 0.07, color: 'white', userSelect: 'none' },
  deco3: { position: 'absolute', top: '50%', left: '50%', fontSize: '200px', opacity: 0.03, color: 'white', transform: 'translate(-50%,-50%)', userSelect: 'none' },
  card: {
    display: 'flex',
    width: '940px',
    minHeight: '580px',
    backgroundColor: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
    zIndex: 1,
  },
  leftSection: {
    flex: 1.3,
    padding: '44px 50px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  logo: {
    fontSize: '12px',
    fontWeight: '800',
    letterSpacing: '3px',
    color: '#132849',
    textTransform: 'uppercase',
    marginBottom: '20px',
    borderLeft: '3px solid #FACC15',
    paddingLeft: '10px',
  },
  title: { fontSize: '26px', fontWeight: '700', color: '#1a1a2e', marginBottom: '4px' },
  subtitle: { color: '#888', marginBottom: '20px', fontSize: '13px' },
  row: { display: 'flex', gap: '16px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '5px', display: 'block' },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '0 10px',
    backgroundColor: '#fcfcfc',
    marginBottom: '2px',
  },
  icon: { marginRight: '8px', fontSize: '15px' },
  eyeBtn: { cursor: 'pointer', fontSize: '15px', padding: '4px', userSelect: 'none' },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    padding: '10px 4px',
    width: '100%',
    backgroundColor: 'transparent',
    fontSize: '13px',
      color: '#1a1a2e',
  WebkitTextFillColor: '#1a1a2e',
  },
  errorText: { color: '#ef4444', fontSize: '11px', marginBottom: '6px', marginTop: '2px' },
  errorBox: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fca5a5',
    color: '#dc2626',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    marginBottom: '16px',
  },
  button: {
    marginTop: '16px',
    width: '100%',
    backgroundColor: '#FACC15',
    color: '#000',
    border: 'none',
    padding: '13px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px',
    transition: '0.2s',
  },
  loginLink: {
    marginTop: '16px',
    fontSize: '13px',
    color: '#888',
    textAlign: 'center',
  },
  rightSection: {
    flex: 1,
    backgroundImage: 'url("/login.png")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(19, 40, 73, 0.82)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
    color: 'white',
    textAlign: 'center',
  },
  shield: { fontSize: '52px', marginBottom: '16px' },
  rightTitle: { fontSize: '26px', fontWeight: '700', marginBottom: '14px' },
  rightText: { fontSize: '13px', lineHeight: '1.7', opacity: 0.85, marginBottom: '24px' },
  loginButton: {
    backgroundColor: 'transparent',
    color: 'white',
    border: '2px solid white',
    padding: '10px 30px',
    borderRadius: '25px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: '0.3s',
  },
};

export default Register;