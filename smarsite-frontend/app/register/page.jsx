"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import MainLayout from '@/components/MainLayout';


// ✅ Field DEHORS du composant Register pour éviter le bug de curseur
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
    axios.get('http://localhost:3200/roles')
      .then(res => setRoles(res.data))
      .catch(() => setError("Impossible de charger les rôles"));
  }, []);

  const validate = () => {
    let newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Nom complet obligatoire";
    if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email invalide";
    if (formData.password.length < 6) newErrors.password = "Mot de passe min 6 caractères";
    if (!/^[0-9]{8}$/.test(formData.phone)) newErrors.phone = "Téléphone doit contenir 8 chiffres";
    if (!formData.roleId) newErrors.roleId = "Veuillez choisir un rôle";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await axios.post('http://localhost:3200/users/register', formData);
      router.push('/login?successMessage=Compte créé ! Connectez-vous.');
    } catch (err) {
      setError("Erreur lors de l'inscription. Email déjà utilisé ?");
    }
  };

  return (
    
    <div style={styles.container}>
      <div style={styles.deco1}>🏗️</div>
      <div style={styles.deco2}>📐</div>
      <div style={styles.deco3}>🏢</div>

      <div style={styles.card}>

        {/* LEFT – Formulaire */}
        <div style={styles.leftSection}>
          <div style={styles.logo}>Smartsite</div>
          <h2 style={styles.title}>S'inscrire</h2>
          <p style={styles.subtitle}>Créez votre compte gratuitement</p>

          {error && <div style={styles.errorBox}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={styles.row}>
              <div style={{ flex: 1 }}>
                <Field label="Nom complet" icon="👤" errorKey="fullName" errors={errors}>
                  <input
                    type="text"
                    placeholder="Mohmed Salah"
                    style={styles.input}
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Téléphone" icon="📱" errorKey="phone" errors={errors}>
                  <input
                    type="text"
                    placeholder="8 chiffres"
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
                placeholder="exemple@esprit.tn"
                style={styles.input}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Field>

            <Field label="Mot de passe" icon="🔒" errorKey="password" errors={errors}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 6 caractères"
                style={styles.input}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <span style={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? '🙈' : '👁️'}
              </span>
            </Field>

            <Field label="Rôle" icon="" errorKey="roleId" errors={errors}>
              <select
                style={{ ...styles.input, cursor: 'pointer' }}
                value={formData.roleId}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
              >
                <option value="">-- Choisir un rôle --</option>
                {roles.map(role => (
                  <option key={role._id} value={role._id}>{role.name}</option>
                ))}
              </select>
            </Field>

            <button type="submit" style={styles.button}>Créer mon compte</button>
          </form>

          <p style={styles.loginLink}>
            Déjà un compte ?{' '}
            <Link href="/login" style={{ color: '#5d5fef', fontWeight: '600' }}>Se connecter</Link>
          </p>
        </div>

        {/* RIGHT – Panneau décoratif */}
        <div style={styles.rightSection}>
          <div style={styles.overlay}>
            <div style={styles.shield}></div>
            <h2 style={styles.rightTitle}>SmartSite</h2>
            <p style={styles.rightText}>
              SmartSite centralise vos données de chantier et automatise
              le suivi d'avancement grâce à l'IA — détection visuelle,
              prédiction de retards et contrôle budgétaire en temps réel.
            </p>
            <button onClick={() => router.push('/login')} style={styles.loginButton}>
              Se connecter
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
      color: '#1a1a2e',                          // ✅ ajoute ça
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