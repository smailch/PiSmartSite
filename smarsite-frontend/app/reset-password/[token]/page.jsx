"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';

const API = 'http://localhost:3200';

const ResetPassword = () => {
  // ✅ Next.js : useParams remplace useParams de react-router
  const params = useParams();
  const token = params.token;

  // ✅ Next.js : useRouter remplace useNavigate
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const getStrength = (pwd) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = getStrength(password);
  const strengthLabel = ['', 'Faible', 'Moyen', 'Bon', 'Fort'][strength];
  const strengthColor = ['', '#ef4444', '#f97316', '#84cc16', '#22c55e'][strength];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/users/reset-password`, { token, password });
      setSuccess('Mot de passe mis à jour avec succès !');
      // ✅ Next.js : router.push remplace navigate
      setTimeout(() => router.push('/login?successMessage=Mot de passe réinitialisé. Connectez-vous !'), 2000);
    } catch (err) {
      setError('Lien invalide ou expiré. Veuillez refaire une demande.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.deco1}>🏗️</div>
      <div style={styles.deco2}>📐</div>
      <div style={styles.deco3}>🏢</div>

      <div style={styles.card}>
        {/* LEFT – Formulaire */}
        <div style={styles.left}>
          <div style={styles.logo}>Smartsite</div>
          <h2 style={styles.title}>Nouveau mot de passe</h2>
          <p style={styles.subtitle}>Choisissez un mot de passe sécurisé pour votre compte.</p>

          {error && <div style={styles.errorBox}>{error}</div>}
          {success && <div style={styles.successBox}>{success}</div>}

          <form onSubmit={handleSubmit}>
            <label style={styles.label}>Nouveau mot de passe</label>
            <div style={styles.inputGroup}>
              <span style={styles.icon}>🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 8 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                required
              />
              <span style={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? '🙈' : '👁️'}
              </span>
            </div>

            {/* Barre de force */}
            {password.length > 0 && (
              <div style={styles.strengthWrapper}>
                <div style={styles.strengthTrack}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} style={{
                      ...styles.strengthSegment,
                      backgroundColor: i <= strength ? strengthColor : '#e5e7eb',
                    }} />
                  ))}
                </div>
                <span style={{ ...styles.strengthText, color: strengthColor }}>
                  {strengthLabel}
                </span>
              </div>
            )}

            <label style={{ ...styles.label, marginTop: '18px' }}>Confirmer le mot de passe</label>
            <div style={styles.inputGroup}>
              <span style={styles.icon}>🔑</span>
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Répétez le mot de passe"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                style={styles.input}
                required
              />
              <span style={styles.eyeBtn} onClick={() => setShowConfirm(!showConfirm)}>
                {showConfirm ? '🙈' : '👁️'}
              </span>
            </div>

            {confirm.length > 0 && (
              <p style={{ fontSize: '12px', marginTop: '4px', color: password === confirm ? '#22c55e' : '#ef4444' }}>
                {password === confirm ? '✓ Les mots de passe correspondent' : '✗ Ne correspondent pas'}
              </p>
            )}

            <button type="submit" style={{ ...styles.button, opacity: loading ? 0.7 : 1 }} disabled={loading}>
              {loading ? 'Mise à jour…' : 'Confirmer le mot de passe'}
            </button>
          </form>

          {/* ✅ Next.js : router.push remplace navigate */}
          <p onClick={() => router.push('/login')} style={styles.backLink}>
            ← Retour à la connexion
          </p>
        </div>

        {/* RIGHT – Panneau décoratif */}
        <div style={styles.right}>
          <div style={styles.overlay}>
            <div style={styles.shield}>🛡️</div>
            <h2 style={styles.rightTitle}>Sécurisez votre compte</h2>
            <p style={styles.rightText}>
              Utilisez un mot de passe unique avec des lettres, chiffres et symboles pour protéger votre compte Smartsite.
            </p>
            <ul style={styles.tips}>
              <li>✓ Au moins 8 caractères</li>
              <li>✓ Une majuscule</li>
              <li>✓ Un chiffre</li>
              <li>✓ Un symbole (!, @, #…)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#132849', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    position: 'relative', overflow: 'hidden',
  },
  deco1: { position: 'absolute', top: '8%', left: '5%', fontSize: '80px', opacity: 0.07, color: 'white', userSelect: 'none' },
  deco2: { position: 'absolute', bottom: '10%', right: '4%', fontSize: '100px', opacity: 0.07, color: 'white', userSelect: 'none' },
  deco3: { position: 'absolute', top: '50%', left: '50%', fontSize: '200px', opacity: 0.03, color: 'white', transform: 'translate(-50%,-50%)', userSelect: 'none' },
  card: {
    display: 'flex', width: '900px', minHeight: '520px', backgroundColor: 'white',
    borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', zIndex: 1,
  },
  left: {
    flex: 1.2, padding: '50px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
  },
  logo: {
    fontSize: '13px', fontWeight: '800', letterSpacing: '3px', color: '#132849',
    textTransform: 'uppercase', marginBottom: '24px', borderLeft: '3px solid #FACC15', paddingLeft: '10px',
  },
  title: { fontSize: '28px', fontWeight: '700', color: '#1a1a2e', marginBottom: '6px' },
  subtitle: { color: '#888', fontSize: '14px', marginBottom: '24px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px', display: 'block' },
  inputGroup: {
    display: 'flex', alignItems: 'center', border: '1px solid #e0e0e0',
    borderRadius: '8px', padding: '0 12px', backgroundColor: '#fcfcfc', transition: 'border-color 0.2s',
  },
  icon: { marginRight: '8px', fontSize: '16px' },
  input: {
    flex: 1, border: 'none', outline: 'none', padding: '12px 4px', backgroundColor: 'transparent', fontSize: '14px', color: '#1a1a2e',                 // ✅ ajoute
    WebkitTextFillColor: '#1a1a2e',
  },
  eyeBtn: { cursor: 'pointer', fontSize: '16px', padding: '4px', userSelect: 'none' },
  strengthWrapper: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' },
  strengthTrack: { display: 'flex', gap: '4px', flex: 1 },
  strengthSegment: { flex: 1, height: '4px', borderRadius: '2px', transition: 'background-color 0.3s' },
  strengthText: { fontSize: '12px', fontWeight: '600', minWidth: '40px' },
  button: {
    marginTop: '28px', width: '100%', backgroundColor: '#FACC15', color: '#000',
    border: 'none', padding: '14px', borderRadius: '8px', cursor: 'pointer',
    fontWeight: '700', fontSize: '15px', transition: '0.2s',
  },
  backLink: { marginTop: '20px', fontSize: '13px', color: '#5d5fef', cursor: 'pointer', textAlign: 'center', fontWeight: '500' },
  errorBox: {
    backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626',
    borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px',
  },
  successBox: {
    backgroundColor: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a',
    borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px',
  },
  right: {
    flex: 1, backgroundImage: 'url("/login.png")',
    backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative',
  },
  overlay: {
    position: 'absolute', inset: 0, backgroundColor: 'rgba(19, 40, 73, 0.82)',
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
    alignItems: 'center', padding: '40px', color: 'white', textAlign: 'center',
  },
  shield: { fontSize: '52px', marginBottom: '20px' },
  rightTitle: { fontSize: '24px', fontWeight: '700', marginBottom: '16px' },
  rightText: { fontSize: '14px', lineHeight: '1.7', opacity: 0.85, marginBottom: '24px' },
  tips: {
    listStyle: 'none', padding: 0, margin: 0, textAlign: 'left',
    fontSize: '13px', lineHeight: '2', opacity: 0.9, color: '#FACC15', fontWeight: '600',
  },
};

export default ResetPassword;