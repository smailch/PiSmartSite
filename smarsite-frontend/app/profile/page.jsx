"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import MainLayout from '@/components/MainLayout';
import { getApiBaseUrl } from '@/lib/api';

const MODELS_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

// ══════════════════════════════════════════════════════════════════
//  FACE ID REGISTRATION POPUP
// ══════════════════════════════════════════════════════════════════
const FaceRegisterPopup = ({ onClose, onSuccess }) => {
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const streamRef   = useRef(null);
  const intervalRef = useRef(null);

  const [status,    setStatus]    = useState('loading');
  const [statusMsg, setStatusMsg] = useState('Loading AI models...');
  const [progress,  setProgress]  = useState(0);
  const [captured,  setCaptured]  = useState(false);

  const stopCamera = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => { stopCamera(); onClose(); }, [stopCamera, onClose]);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const faceapi = window.faceapi;
        if (!faceapi) { setStatus('error'); setStatusMsg("face-api.js not loaded in layout.tsx."); return; }

        setProgress(20); setStatusMsg('Loading AI models...');
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
        ]);
        if (cancelled) return;

        setProgress(70); setStatusMsg('Accessing camera...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setProgress(100); setStatus('ready'); setStatusMsg('Ready — click "Capture my face"');

      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setStatusMsg(err.name === 'NotAllowedError' ? 'Camera access denied.' : 'Error: ' + err.message);
      }
    };
    init();
    return () => { cancelled = true; stopCamera(); };
  }, [stopCamera]);

  const handleCapture = async () => {
    const faceapi = window.faceapi;
    setStatus('scanning'); setStatusMsg('Analyzing face...');

    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      setStatus('ready'); setStatusMsg('No face detected. Please try again.');
      return;
    }

    const descriptor = Array.from(detection.descriptor);
    const canvas = canvasRef.current;
    const dims = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
    faceapi.matchDimensions(canvas, dims);
    faceapi.draw.drawDetections(canvas, faceapi.resizeResults(detection, dims));
    faceapi.draw.drawFaceLandmarks(canvas, faceapi.resizeResults(detection, dims));

    setStatus('success'); setStatusMsg('Face captured successfully!');
    setCaptured(true);
    stopCamera();
    onSuccess(descriptor);
  };

  const colors = { loading: '#FACC15', ready: '#132849', scanning: '#FACC15', success: '#22c55e', error: '#ef4444' };
  const c = colors[status];

  return (
    <div style={fS.overlay}>
      <style>{`
        @keyframes fRSpin  { to{transform:rotate(360deg)} }
        @keyframes fRIn    { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fRScan  { 0%{top:10%} 50%{top:85%} 100%{top:10%} }
        @keyframes fRPulse { 0%,100%{box-shadow:0 0 0 0 ${c}55} 50%{box-shadow:0 0 0 12px ${c}00} }
      `}</style>

      <div style={fS.popup}>
        <div style={fS.header}>
          <div style={fS.logo}>Smartsite</div>
          <button onClick={handleClose} style={fS.closeBtn}>✕</button>
        </div>
        <h3 style={fS.title}>Register Face ID</h3>
        <p style={fS.subtitle}>Position your face clearly in front of the camera.</p>

        <div style={{ ...fS.frame, borderColor: c, animation: status === 'ready' ? 'fRPulse 2s ease-in-out infinite' : 'none' }}>
          <video ref={videoRef} style={fS.video} playsInline muted />
          <canvas ref={canvasRef} style={fS.canvas} />

          {status === 'scanning' && (
            <div style={{ position: 'absolute', left: 0, right: 0, height: '2px',
              background: 'linear-gradient(90deg,transparent,#FACC15,transparent)',
              animation: 'fRScan 1.8s ease-in-out infinite' }} />
          )}

          {[
            { top: '10px',    left: '10px',  borderTop: `3px solid ${c}`,    borderLeft: `3px solid ${c}`,  borderRight: 'none', borderBottom: 'none', borderRadius: '6px 0 0 0' },
            { top: '10px',    right: '10px', borderTop: `3px solid ${c}`,    borderRight: `3px solid ${c}`, borderLeft: 'none',  borderBottom: 'none', borderRadius: '0 6px 0 0' },
            { bottom: '10px', left: '10px',  borderBottom: `3px solid ${c}`, borderLeft: `3px solid ${c}`,  borderRight: 'none', borderTop: 'none',    borderRadius: '0 0 0 6px' },
            { bottom: '10px', right: '10px', borderBottom: `3px solid ${c}`, borderRight: `3px solid ${c}`, borderLeft: 'none',  borderTop: 'none',    borderRadius: '0 0 6px 0' },
          ].map((corner, i) => (
            <div key={i} style={{ position: 'absolute', width: '22px', height: '22px', ...corner }} />
          ))}

          {status === 'success' && (
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(34,197,94,0.2)',
              display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <span style={{ fontSize: '60px', color: '#22c55e' }}>✓</span>
            </div>
          )}

          {(status === 'loading' || status === 'scanning') && (
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '38px', height: '38px', border: '3px solid rgba(250,204,21,0.3)',
                borderTopColor: '#FACC15', borderRadius: '50%', animation: 'fRSpin 0.9s linear infinite' }} />
              {status === 'loading' && (
                <div style={{ width: '140px', height: '4px', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '2px' }}>
                  <div style={{ height: '100%', width: `${progress}%`, backgroundColor: '#FACC15', borderRadius: '2px', transition: 'width 0.5s' }} />
                </div>
              )}
            </div>
          )}

          {status === 'error' && (
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
              display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <span style={{ fontSize: '44px' }}>⚠️</span>
            </div>
          )}
        </div>

        <div style={{ borderRadius: '10px', padding: '10px 14px', fontSize: '13px', fontWeight: '600',
          textAlign: 'center', marginBottom: '16px', backgroundColor: c + '18', border: `1px solid ${c}44`, color: c }}>
          {status === 'success' ? '✓ ' : status === 'error' ? '✗ ' : status === 'scanning' ? '🔍 ' : '📷 '}
          {statusMsg}
        </div>

        {(status === 'ready' || status === 'scanning') && !captured && (
          <button onClick={handleCapture} disabled={status === 'scanning'} style={{
            width: '100%', padding: '13px', borderRadius: '10px', border: 'none',
            backgroundColor: status === 'scanning' ? '#e5e7eb' : '#FACC15',
            color: status === 'scanning' ? '#999' : '#000',
            fontWeight: '700', fontSize: '14px', cursor: status === 'scanning' ? 'not-allowed' : 'pointer',
            transition: '0.2s',
          }}>
            {status === 'scanning' ? 'Analyzing...' : '📸 Capture my face'}
          </button>
        )}

        {status === 'success' && (
          <button onClick={handleClose} style={{
            width: '100%', padding: '13px', borderRadius: '10px', border: 'none',
            backgroundColor: '#22c55e', color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer',
          }}>
            Close ✓
          </button>
        )}

        <p style={{ fontSize: '11px', color: '#bbb', textAlign: 'center', margin: '12px 0 0' }}>
          🔒 100% local processing — no image is sent to the server
        </p>
      </div>
    </div>
  );
};

const fS = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex',
    justifyContent: 'center', alignItems: 'center', zIndex: 200, backdropFilter: 'blur(8px)' },
  popup: { background: 'white', borderRadius: '20px', padding: '32px', width: '420px',
    boxShadow: '0 30px 70px rgba(0,0,0,0.4)', animation: 'fRIn 0.3s ease' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' },
  logo: { fontSize: '11px', fontWeight: '800', letterSpacing: '3px', color: '#132849',
    textTransform: 'uppercase', borderLeft: '3px solid #FACC15', paddingLeft: '10px' },
  closeBtn: { background: '#f4f4f5', border: 'none', borderRadius: '50%', width: '30px',
    height: '30px', cursor: 'pointer', fontSize: '13px', color: '#555', fontWeight: '700' },
  title:    { fontSize: '20px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 4px' },
  subtitle: { fontSize: '13px', color: '#888', margin: '0 0 18px' },
  frame: { position: 'relative', width: '100%', height: '260px', borderRadius: '14px',
    overflow: 'hidden', borderStyle: 'solid', borderWidth: '2px',
    backgroundColor: '#080808', transition: 'all 0.4s', marginBottom: '14px' },
  video:  { width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' },
  canvas: { position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'scaleX(-1)' },
};

// ══════════════════════════════════════════════════════════════════
//  PROFILE PAGE
// ══════════════════════════════════════════════════════════════════
export default function ProfilePage() {
  const router  = useRouter();
  const fileRef = useRef(null);

  const [form, setForm] = useState({ fullName: '', email: '', phone: '', newPassword: '', confirmPassword: '' });
  const [avatar,        setAvatar]        = useState(null);
  const [avatarFile,    setAvatarFile]    = useState(null);
  const [faceStatus,    setFaceStatus]    = useState(null);
  const [showFacePopup, setShowFacePopup] = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [success,       setSuccess]       = useState('');
  const [error,         setError]         = useState('');
  const [activeTab,     setActiveTab]     = useState('info');

  const getTokenPayload = () => {
    try {
      const token = localStorage.getItem('token');
      return JSON.parse(atob(token.split('.')[1]));
    } catch { return null; }
  };

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem('token');
      if (!token) { router.push('/login'); return; }
      try {
        const payload = getTokenPayload();
        const res = await axios.get(`${getApiBaseUrl()}/users/${payload.sub}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const u = res.data;
        setForm(f => ({ ...f, fullName: u.fullName || '', email: u.email || '', phone: u.phone || '' }));
        if (u.profileImage) setAvatar(u.profileImage);
        setFaceStatus(u.faceDescriptor?.length > 0 ? 'registered' : 'none');
      } catch {
        setError('Unable to load profile.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatar(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      const token   = localStorage.getItem('token');
      const payload = getTokenPayload();
      const data    = { fullName: form.fullName, phone: form.phone };
      if (avatarFile) data.profileImage = avatar;
      await axios.put(`${getApiBaseUrl()}/users/${payload.sub}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Profile updated successfully!');
    } catch { setError('Failed to update profile.'); }
    finally  { setSaving(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('');
    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match.'); setSaving(false); return;
    }
    if (form.newPassword.length < 6) {
      setError('Minimum 6 characters.'); setSaving(false); return;
    }
    try {
      const token   = localStorage.getItem('token');
      const payload = getTokenPayload();
      await axios.put(`${getApiBaseUrl()}/users/${payload.sub}`, { password: form.newPassword }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Password changed successfully!');
      setForm(f => ({ ...f, newPassword: '', confirmPassword: '' }));
    } catch { setError('Failed to change password.'); }
    finally  { setSaving(false); }
  };

  const handleFaceSuccess = async (descriptor) => {
    setShowFacePopup(false); setError(''); setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${getApiBaseUrl()}/auth/face-register`,
        { descriptor },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data?.message === 'FACE_REGISTERED') {
        setFaceStatus('registered');
        setSuccess('Face ID registered successfully!');
      } else {
        setError('Unexpected response: ' + JSON.stringify(res.data));
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      if (err.response?.status === 401) setError('Session expired. Please log in again.');
      else if (err.response?.status === 404) setError('Route /auth/face-register not found.');
      else setError('Face registration error: ' + msg);
    }
  };

  const handleDeleteFace = async () => {
    if (!window.confirm('Delete your Face ID?')) return;
    try {
      const token   = localStorage.getItem('token');
      const payload = getTokenPayload();
      await axios.put(`${getApiBaseUrl()}/users/${payload.sub}`, { faceDescriptor: null }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFaceStatus('none');
      setSuccess('Face ID removed.');
    } catch { setError('Failed to delete Face ID.'); }
  };

  const initials = form.fullName
    ? form.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

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
        @keyframes slideIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .tab-btn:hover  { background-color: #f0f4ff !important; }
        .save-btn:hover { filter: brightness(0.92); }
        .face-btn:hover { border-color: #FACC15 !important; background-color: #fffbeb !important; }
        .avatar-wrap:hover .avatar-overlay { opacity: 1 !important; }
      `}</style>

      <button onClick={() => router.back()} style={s.backBtn}>← Back</button>

      <div style={s.body}>

        {/* Avatar card */}
        <div style={s.avatarCard}>
          <div className="avatar-wrap" style={s.avatarWrap} onClick={() => fileRef.current.click()}>
            {avatar
              ? <img src={avatar} alt="avatar" style={s.avatarImg} />
              : <div style={s.avatarInitials}>{initials}</div>
            }
            <div className="avatar-overlay" style={s.avatarOverlay}>📷</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          <div style={s.avatarName}>{form.fullName || 'Your name'}</div>
          <div style={s.avatarEmail}>{form.email}</div>
          <div style={{
            ...s.faceStatusBadge,
            backgroundColor: faceStatus === 'registered' ? '#f0fdf4' : '#fef9ec',
            border: `1px solid ${faceStatus === 'registered' ? '#86efac' : '#FDE68A'}`,
            color: faceStatus === 'registered' ? '#16a34a' : '#92400e',
          }}>
            {faceStatus === 'registered' ? '✓ Face ID enabled' : '○ Face ID not configured'}
          </div>
        </div>

        {/* Main card */}
        <div style={s.mainCard}>
          {success && <div style={s.successBox}>{success}</div>}
          {error   && <div style={s.errorBox}>{error}</div>}

          {/* Tabs */}
          <div style={s.tabs}>
            {[
              { key: 'info',     label: '👤 Information' },
              { key: 'security', label: '🔒 Security' },
              { key: 'faceid',   label: '🤖 Face ID' },
            ].map(tab => (
              <button key={tab.key} className="tab-btn"
                onClick={() => { setActiveTab(tab.key); setError(''); setSuccess(''); }}
                style={{ ...s.tabBtn, ...(activeTab === tab.key ? s.tabBtnActive : {}) }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB: INFORMATION */}
          {activeTab === 'info' && (
            <form onSubmit={handleSaveInfo} style={s.form}>
              <div style={s.row}>
                <div style={s.field}>
                  <label style={s.label}>Full Name</label>
                  <div style={s.inputWrap}>
                    <span style={s.inputIcon}>👤</span>
                    <input type="text" placeholder="John Doe" style={s.input}
                      value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
                  </div>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Phone</label>
                  <div style={s.inputWrap}>
                    <span style={s.inputIcon}>📱</span>
                    <input type="text" placeholder="8 digits" style={s.input}
                      value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label}>Email</label>
                <div style={{ ...s.inputWrap, backgroundColor: '#f9f9f9', opacity: 0.7 }}>
                  <span style={s.inputIcon}>📧</span>
                  <input type="email" value={form.email} style={s.input} disabled />
                </div>
                <p style={s.hint}>Email cannot be changed.</p>
              </div>
              <button type="submit" className="save-btn" disabled={saving} style={s.saveBtn}>
                {saving ? 'Saving...' : '💾 Save Changes'}
              </button>
            </form>
          )}

          {/* TAB: SECURITY */}
          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} style={s.form}>
              <div style={s.field}>
                <label style={s.label}>New Password</label>
                <div style={s.inputWrap}>
                  <span style={s.inputIcon}>🔒</span>
                  <input type="password" placeholder="Minimum 6 characters" style={s.input}
                    value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} />
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label}>Confirm Password</label>
                <div style={s.inputWrap}>
                  <span style={s.inputIcon}>🔑</span>
                  <input type="password" placeholder="Repeat your password" style={s.input}
                    value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} />
                </div>
                {form.confirmPassword && (
                  <p style={{ fontSize: '12px', marginTop: '4px',
                    color: form.newPassword === form.confirmPassword ? '#22c55e' : '#ef4444' }}>
                    {form.newPassword === form.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </p>
                )}
              </div>
              <button type="submit" className="save-btn" disabled={saving} style={s.saveBtn}>
                {saving ? 'Updating...' : '🔐 Change Password'}
              </button>
            </form>
          )}

          {/* TAB: FACE ID */}
          {activeTab === 'faceid' && (
            <div style={s.form}>
              <div style={s.faceCard}>
                <div style={s.faceCardIcon}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                    stroke={faceStatus === 'registered' ? '#22c55e' : '#132849'}
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 8V6a2 2 0 0 1 2-2h2"/><path d="M2 16v2a2 2 0 0 0 2 2h2"/>
                    <path d="M22 8V6a2 2 0 0 0-2-2h-2"/><path d="M22 16v2a2 2 0 0 1-2 2h-2"/>
                    <circle cx="9" cy="10" r="1.2" fill="currentColor" stroke="none"/>
                    <circle cx="15" cy="10" r="1.2" fill="currentColor" stroke="none"/>
                    <path d="M8.5 15s1 1.5 3.5 1.5 3.5-1.5 3.5-1.5"/>
                    <path d="M9 6.5C9 6.5 10.2 6 12 6s3 .5 3 .5"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={s.faceCardTitle}>
                    {faceStatus === 'registered' ? 'Face ID configured ✓' : 'Face ID not configured'}
                  </div>
                  <div style={s.faceCardDesc}>
                    {faceStatus === 'registered'
                      ? 'Your face is registered. You can log in using facial recognition.'
                      : "Register your face to log in quickly without a password using AI."}
                  </div>
                </div>
              </div>

              <div style={s.howItWorks}>
                <div style={s.howTitle}>How does it work?</div>
                <div style={s.howSteps}>
                  {[
                    { icon: '📷', text: 'The camera captures your face' },
                    { icon: '🤖', text: 'AI analyzes and creates a unique 128-point descriptor' },
                    { icon: '🔒', text: 'The descriptor is stored encrypted in the database' },
                    { icon: '⚡', text: 'At login, your face is matched in under 1 second' },
                  ].map((step, i) => (
                    <div key={i} style={s.howStep}>
                      <span style={s.howStepIcon}>{step.icon}</span>
                      <span style={s.howStepText}>{step.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button className="face-btn"
                  onClick={() => { setError(''); setSuccess(''); setShowFacePopup(true); }}
                  style={s.faceRegisterBtn}>
                  <span>📸</span>
                  <span>{faceStatus === 'registered' ? 'Update my Face ID' : 'Register my Face ID'}</span>
                  <span style={s.aiBadge}>AI</span>
                </button>
                {faceStatus === 'registered' && (
                  <button onClick={handleDeleteFace} style={s.faceDeleteBtn}>
                    🗑️ Remove Face ID
                  </button>
                )}
              </div>
              <p style={s.faceNote}>🔒 100% local processing — no image is sent to the server.</p>
            </div>
          )}
        </div>
      </div>

      {showFacePopup && (
        <FaceRegisterPopup
          onClose={() => setShowFacePopup(false)}
          onSuccess={handleFaceSuccess}
        />
      )}
    </MainLayout>
  );
}

const s = {
  backBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'transparent',
    border: '1px solid #d0d8e8', color: '#132849', padding: '8px 16px', borderRadius: '8px',
    cursor: 'pointer', fontSize: '13px', fontWeight: '600', marginBottom: '20px', transition: '0.2s' },
  body: { display: 'flex', gap: '24px', maxWidth: '1060px', animation: 'slideIn 0.4s ease' },
  avatarCard: { width: '240px', flexShrink: 0, backgroundColor: 'white', borderRadius: '16px',
    padding: '32px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', textAlign: 'center',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', alignSelf: 'flex-start' },
  avatarWrap: { width: '100px', height: '100px', borderRadius: '50%', cursor: 'pointer',
    position: 'relative', overflow: 'hidden', border: '3px solid #FACC15', flexShrink: 0 },
  avatarImg:      { width: '100%', height: '100%', objectFit: 'cover' },
  avatarInitials: { width: '100%', height: '100%', backgroundColor: '#132849', color: '#FACC15',
    display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '32px', fontWeight: '800' },
  avatarOverlay:  { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px', opacity: 0, transition: 'opacity 0.2s' },
  avatarName:      { fontSize: '16px', fontWeight: '700', color: '#1a1a2e' },
  avatarEmail:     { fontSize: '12px', color: '#888' },
  faceStatusBadge: { padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', marginTop: '4px' },
  mainCard: { flex: 1, backgroundColor: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)' },
  successBox: { backgroundColor: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a',
    borderRadius: '10px', padding: '12px 16px', fontSize: '13px', marginBottom: '20px', fontWeight: '500' },
  errorBox: { backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626',
    borderRadius: '10px', padding: '12px 16px', fontSize: '13px', marginBottom: '20px', fontWeight: '500' },
  tabs: { display: 'flex', gap: '4px', marginBottom: '28px', backgroundColor: '#f4f6fb', padding: '4px', borderRadius: '12px' },
  tabBtn: { flex: 1, padding: '10px 16px', border: 'none', borderRadius: '9px', cursor: 'pointer',
    fontSize: '13px', fontWeight: '600', backgroundColor: 'transparent', color: '#666', transition: 'all 0.2s' },
  tabBtnActive: { backgroundColor: 'white', color: '#132849', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  form:  { display: 'flex', flexDirection: 'column', gap: '20px' },
  row:   { display: 'flex', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', flex: 1 },
  label: { fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '7px' },
  inputWrap: { display: 'flex', alignItems: 'center', border: '1px solid #e0e0e0', borderRadius: '10px',
    padding: '0 14px', backgroundColor: '#fcfcfc', transition: 'border-color 0.2s' },
  inputIcon: { marginRight: '8px', fontSize: '16px', flexShrink: 0 },
  input: { flex: 1, border: 'none', outline: 'none', padding: '12px 4px', backgroundColor: 'transparent', fontSize: '14px', width: '100%', color: '#1a1a2e', WebkitTextFillColor: '#1a1a2e',   },
  hint:    { fontSize: '11px', color: '#aaa', marginTop: '5px', fontStyle: 'italic' },
  saveBtn: { padding: '13px 28px', borderRadius: '10px', border: 'none', backgroundColor: '#f28c28',
    color: '#000', fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: '0.2s', alignSelf: 'flex-start' },
  faceCard: { display: 'flex', gap: '16px', alignItems: 'flex-start', backgroundColor: '#f8faff',
    border: '1px solid #e0e8ff', borderRadius: '12px', padding: '20px', marginBottom: '4px' },
  faceCardIcon: { flexShrink: 0, width: '56px', height: '56px', backgroundColor: 'white', borderRadius: '12px',
    display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  faceCardTitle: { fontSize: '15px', fontWeight: '700', color: '#1a1a2e', marginBottom: '6px' },
  faceCardDesc:  { fontSize: '13px', color: '#666', lineHeight: '1.6' },
  howItWorks: { backgroundColor: '#fffbeb', border: '1px solid #FDE68A', borderRadius: '12px', padding: '20px' },
  howTitle:   { fontSize: '13px', fontWeight: '700', color: '#92400e', marginBottom: '14px' },
  howSteps:   { display: 'flex', flexDirection: 'column', gap: '10px' },
  howStep:    { display: 'flex', alignItems: 'center', gap: '12px' },
  howStepIcon: { fontSize: '18px', flexShrink: 0 },
  howStepText: { fontSize: '13px', color: '#555' },
  faceRegisterBtn: { display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 24px',
    borderRadius: '10px', border: '2px solid #132849', backgroundColor: 'white', color: '#132849',
    cursor: 'pointer', fontWeight: '700', fontSize: '14px', transition: 'all 0.2s' },
  faceDeleteBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '13px 20px',
    borderRadius: '10px', border: '1px solid #fca5a5', backgroundColor: '#fef2f2', color: '#dc2626',
    cursor: 'pointer', fontWeight: '600', fontSize: '13px', transition: '0.2s' },
  aiBadge: { backgroundColor: '#FACC15', color: '#000', fontSize: '10px', fontWeight: '800',
    padding: '2px 7px', borderRadius: '20px', marginLeft: '4px' },
  faceNote: { fontSize: '11px', color: '#aaa', fontStyle: 'italic', marginTop: '4px' },
};