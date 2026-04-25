"use client";

import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';


const MODELS_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

// ══════════════════════════════════════════════════════════════════════════════
//  COMPOSANT POPUP FACE ID
// ══════════════════════════════════════════════════════════════════════════════
const FaceIDPopup = ({ onClose, onSuccess }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  const [status, setStatus] = useState('loading');
  const [statusMsg, setStatusMsg] = useState('Chargement des modèles IA...');
  const [progress, setProgress] = useState(0);

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
        if (!faceapi) {
          setStatus('error');
          setStatusMsg("face-api.js non chargé. Ajoutez le script CDN dans layout.tsx.");
          return;
        }

        setStatusMsg('Chargement des modèles IA...'); setProgress(20);
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
        ]);
        if (cancelled) return;

        setProgress(70); setStatusMsg('Accès à la caméra...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setProgress(100);
        setStatus('scanning');
        setStatusMsg('Position your face in the frame');

        let hits = 0;
        let lastDescriptor = null;

        intervalRef.current = setInterval(async () => {
          if (!videoRef.current || !canvasRef.current || cancelled) return;

          const detection = await faceapi
            .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
            .withFaceLandmarks()
            .withFaceDescriptor();

          const canvas = canvasRef.current;
          const dims = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
          faceapi.matchDimensions(canvas, dims);
          canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

          if (detection) {
            faceapi.draw.drawDetections(canvas, faceapi.resizeResults(detection, dims));
            faceapi.draw.drawFaceLandmarks(canvas, faceapi.resizeResults(detection, dims));
            lastDescriptor = Array.from(detection.descriptor);
            hits++;
            setStatus('detected');
            setStatusMsg(`
Face detected — verification (${hits}/3)`);

            if (hits >= 3) {
              clearInterval(intervalRef.current);
              setStatus('success');
              setStatusMsg('Identity confirmed ✓');
              setTimeout(() => { stopCamera(); onSuccess(lastDescriptor); }, 1300);
            }
          } else {
            hits = 0;
            lastDescriptor = null;
            setStatus('scanning');
            setStatusMsg('Position your face in the frame');
          }
        }, 700);

      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setStatusMsg(err.name === 'NotAllowedError'
          ? 'Camera access denied. Allow the camera in your browser..'
          : 'Erreur : ' + err.message);
      }
    };

    init();
    return () => { cancelled = true; stopCamera(); };
  }, [stopCamera, onSuccess]);

  const colors = {
    loading: '#f28c28',
    scanning: '#f28c28',
    detected: '#22c55e',
    success: '#22c55e',
    error: '#ef4444',
  };
  const c = colors[status];
  const pulse = (status === 'scanning' || status === 'detected')
    ? 'faceIdPulse 1.8s ease-in-out infinite' : 'none';

  return (
    <div style={faceS.overlay}>
      <style>{`
        @keyframes faceIdPulse { 0%,100%{box-shadow:0 0 0 0 ${c}55} 50%{box-shadow:0 0 0 14px ${c}00} }
        @keyframes faceIdSpin  { to{transform:rotate(360deg)} }
        @keyframes faceIdIn    { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes faceIdScan  { 0%{top:10%} 50%{top:85%} 100%{top:10%} }
      `}</style>

      <div style={faceS.popup}>
        {/* Header */}
        <div style={faceS.header}>
          <div style={faceS.logo}>Smartsite</div>
          <button onClick={handleClose} style={faceS.closeBtn}>✕</button>
        </div>
        <h3 style={faceS.title}>Face ID login
        </h3>
        <p style={faceS.subtitle}>
          Facial recognition using artificial intelligence</p>

        {/* Caméra */}
        <div style={{ ...faceS.frame, borderColor: c, animation: pulse }}>
          <video ref={videoRef} style={faceS.video} playsInline muted />
          <canvas ref={canvasRef} style={faceS.canvas} />

          {/* Ligne de scan animée */}
          {status === 'scanning' && (
            <div style={{
              position: 'absolute', left: 0, right: 0, height: '2px',
              background: `linear-gradient(90deg,transparent,${c},transparent)`,
              animation: 'faceIdScan 2.4s ease-in-out infinite',
            }} />
          )}

          {/* Coins décoratifs */}
          {[
            { top: '10px', left: '10px', borderTop: `3px solid ${c}`, borderLeft: `3px solid ${c}`, borderRight: 'none', borderBottom: 'none', borderRadius: '6px 0 0 0' },
            { top: '10px', right: '10px', borderTop: `3px solid ${c}`, borderRight: `3px solid ${c}`, borderLeft: 'none', borderBottom: 'none', borderRadius: '0 6px 0 0' },
            { bottom: '10px', left: '10px', borderBottom: `3px solid ${c}`, borderLeft: `3px solid ${c}`, borderRight: 'none', borderTop: 'none', borderRadius: '0 0 0 6px' },
            { bottom: '10px', right: '10px', borderBottom: `3px solid ${c}`, borderRight: `3px solid ${c}`, borderLeft: 'none', borderTop: 'none', borderRadius: '0 0 6px 0' },
          ].map((corner, i) => (
            <div key={i} style={{ position: 'absolute', width: '22px', height: '22px', ...corner }} />
          ))}

          {/* Succès */}
          {status === 'success' && (
            <div style={{
              position: 'absolute', inset: 0, backgroundColor: 'rgba(34,197,94,0.18)',
              display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}>
              <span style={{ fontSize: '64px', color: '#22c55e', fontWeight: '900' }}>✓</span>
            </div>
          )}

          {/* Chargement / Erreur */}
          {(status === 'loading' || status === 'error') && (
            <div style={{
              position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)',
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px'
            }}>
              {status === 'loading' ? (
                <>
                  <div style={{
                    width: '40px', height: '40px', border: '3px solid rgba(250,204,21,0.3)',
                    borderTopColor: '#FACC15', borderRadius: '50%', animation: 'faceIdSpin 0.9s linear infinite'
                  }} />
                  <div style={{ width: '160px', height: '4px', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '2px' }}>
                    <div style={{
                      height: '100%', width: `${progress}%`, backgroundColor: '#FACC15',
                      borderRadius: '2px', transition: 'width 0.5s ease'
                    }} />
                  </div>
                </>
              ) : <span style={{ fontSize: '44px' }}>⚠️</span>}
            </div>
          )}
        </div>

        {/* Badge statut */}
        <div style={{
          borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: '600',
          textAlign: 'center', marginBottom: '14px', transition: 'all 0.3s',
          backgroundColor: c + '18', border: `1px solid ${c}44`, color: c,
        }}>
          {status === 'success' ? '✓ ' : status === 'error' ? '✗ ' : status === 'detected' ? '👤 ' : '🔍 '}
          {statusMsg}
        </div>

        <p style={{ fontSize: '11px', color: '#bbb', textAlign: 'center', margin: 0 }}>
          🔒
          100% local processing — no images sent to the server
        </p>
      </div>
    </div>
  );
};

const faceS = {
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.78)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 200, backdropFilter: 'blur(8px)',
  },
  popup: {
    background: 'white', borderRadius: '20px', padding: '32px', width: '430px',
    boxShadow: '0 30px 70px rgba(0,0,0,0.4)', animation: 'faceIdIn 0.3s ease',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' },
  logo: {
    fontSize: '11px', fontWeight: '800', letterSpacing: '3px', color: '#132849',
    textTransform: 'uppercase', borderLeft: '3px solid #FACC15', paddingLeft: '10px'
  },
  closeBtn: {
    background: '#f4f4f5', border: 'none', borderRadius: '50%', width: '30px',
    height: '30px', cursor: 'pointer', fontSize: '13px', color: '#555', fontWeight: '700'
  },
  title: { fontSize: '20px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 4px' },
  subtitle: { fontSize: '13px', color: '#888', margin: '0 0 18px' },
  frame: {
    position: 'relative', width: '100%', height: '270px', borderRadius: '14px',
    overflow: 'hidden', border: '2px solid', backgroundColor: '#080808',
    transition: 'border-color 0.4s, box-shadow 0.4s', marginBottom: '16px'
  },
  video: { width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' },
  canvas: { position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'scaleX(-1)' },
};

// ══════════════════════════════════════════════════════════════════════════════
//  COMPOSANT LOGIN PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
const Login = () => {
  // ✅ Next.js : useRouter remplace useNavigate
  const router = useRouter();

  // ✅ Next.js : useSearchParams remplace useLocation
  const searchParams = useSearchParams();
  const successMessage = searchParams.get('successMessage');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Forgot password
  const [showPopup, setShowPopup] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // Face ID
  const [showFaceID, setShowFaceID] = useState(false);
  const [faceLoading, setFaceLoading] = useState(false);

  // ── Forgot password ───────────────────────────────────────────
  const handleForgotPassword = async () => {
    if (!/\S+@\S+\.\S+/.test(resetEmail)) { setError('Email invalide'); return; }
    try {
      await axios.post('http://localhost:3200/users/forgot-password', { email: resetEmail });
      setMessage(`Please check your email inbox (${resetEmail}) to change your password.`);
      setError('');
    } catch {
      setError("This email address is not valid."); setMessage('');
    }
  };

  // ── Login classique ───────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    try {
      const res = await axios.post('http://localhost:3200/auth/login', { email, password });
      localStorage.setItem('token', res.data.access_token);
      // ✅ Next.js : router.push remplace navigate()
      router.push('/home');
    } catch {
      setError('Invalid email or password');
    }
  };

  // ── Face ID : reçoit le descripteur 128D ─────────────────────
  const handleFaceSuccess = async (descriptor) => {
    setShowFaceID(false);
    setFaceLoading(true);
    try {
      const res = await axios.post(
        'http://localhost:3200/auth/face-login-auto',
        { descriptor }
      );
      localStorage.setItem('token', res.data.access_token);
      // ✅ Next.js : router.push remplace navigate()
      router.push('/home');
    } catch (err) {
      setError('Unrecognized face.');
    } finally {
      setFaceLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Décorations SmartSite */}
      <div style={styles.deco1}>🏗️</div>
      <div style={styles.deco2}>📐</div>
      <div style={styles.deco3}>🏢</div>

      <div style={styles.card}>

        {/* ── SECTION GAUCHE : FORMULAIRE ── */}
        <div style={styles.leftSection}>
          <div style={styles.logo}>Smartsite</div>
          <h2 style={styles.title}>Login</h2>
          <p style={styles.subtitle}>
            Log in to your construction site space</p>

          {successMessage && <div style={styles.successBox}>{successMessage}</div>}
          {error && <div style={styles.errorBox}>{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <label style={styles.label}>Email</label>
            <div style={styles.inputGroup}>
              <span style={styles.icon}>👤</span>
              <input
                type="email"
                placeholder="exemple@esprit.tn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <label style={styles.label}>Password</label>
            <div style={styles.inputGroup}>
              <span style={styles.icon}>🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="........"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                required
              />
              <span style={styles.eyeBtn} onClick={() => setShowPassword(v => !v)}>
                {showPassword ? '🙈' : '👁️'}
              </span>
            </div>

            <div style={styles.footerRow}>
              <button type="submit" style={styles.button}>Se connecter</button>
              <p
                onClick={() => { setShowPopup(true); setError(''); setMessage(''); }}
                style={styles.forgotPass}
              >

                Forgot your password?
              </p>
            </div>
          </form>

          {/* Séparateur */}
          <div style={styles.divider}>
            <div style={styles.divLine} />
            <span style={styles.divText}>or</span>
            <div style={styles.divLine} />
          </div>

          {/* Bouton Face ID */}
          <button
            onClick={() => { setError(''); setShowFaceID(true); }}
            style={{ ...styles.faceIdBtn, opacity: faceLoading ? 0.7 : 1 }}
            disabled={faceLoading}
          >
            {faceLoading ? (
              <div style={styles.faceSpinner} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 8V6a2 2 0 0 1 2-2h2" />
                <path d="M2 16v2a2 2 0 0 0 2 2h2" />
                <path d="M22 8V6a2 2 0 0 0-2-2h-2" />
                <path d="M22 16v2a2 2 0 0 1-2 2h-2" />
                <circle cx="9" cy="10" r="1.2" fill="currentColor" stroke="none" />
                <circle cx="15" cy="10" r="1.2" fill="currentColor" stroke="none" />
                <path d="M8.5 15s1 1.5 3.5 1.5 3.5-1.5 3.5-1.5" />
                <path d="M9 6.5C9 6.5 10.2 6 12 6s3 .5 3 .5" />
              </svg>
            )}
            <span>{faceLoading ? 'Verification in progress...' : 'Sign in with Face ID'}</span>
            <span style={styles.aiBadge}>IA</span>
          </button>

          <p style={styles.signupHint}>
            Don&apos;t have an account?
          </p>
          <button
            type="button"
            onClick={() => router.push('/register')}
            style={styles.signupButton}
          >
            Sign up
          </button>

        </div>

        {/* ── SECTION DROITE : PANNEAU DÉCORATIF ── */}
        <div style={styles.rightSection}>
          <div style={styles.overlay}>
            <p style={styles.rightText}>
              SmartSite centralizes your construction site data and automates
              progress tracking using AI — visual detection,

              delay prediction and real-time budget control.
            </p>
            <button
              onClick={() => router.push('/dashboard/clients')}
              style={{
                marginTop: '12px',
                width: '90%',
                backgroundColor: 'transparent',
                color: '#f9fafb',
                border: '2px solid #7a91b5',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '14px',
                transition: '0.2s',
              }}
            >
              Espace Client
            </button>

          </div>
        </div>
      </div>

      {/* ── POPUP MOT DE PASSE OUBLIÉ ── */}
      {showPopup && (
        <div style={popupStyles.overlay}>
          <div style={popupStyles.popup}>
            <div style={popupStyles.logo}>Smartsite</div>
            <h3 style={popupStyles.title}>Forgot your password?</h3>
            <p style={popupStyles.subtitle}>Enter your email to receive a reset link.</p>

            <div style={popupStyles.inputGroup}>
              <span style={styles.icon}>📧</span>
              <input
                type="email"
                placeholder="Email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                style={styles.input}
              />
            </div>

            {error && <p style={styles.errorText}>{error}</p>}
            {message && <p style={styles.successText}>{message}</p>}

            <div style={styles.buttonContainer}>
              <button onClick={handleForgotPassword} style={styles.primaryButton}>Send mail</button>
              <button onClick={() => setShowPopup(false)} style={styles.secondaryButton}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── POPUP FACE ID ── */}
      {showFaceID && (
        <FaceIDPopup
          onClose={() => setShowFaceID(false)}
          onSuccess={handleFaceSuccess}
        />
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  STYLES
// ══════════════════════════════════════════════════════════════════════════════
const popupStyles = {
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 100, backdropFilter: 'blur(4px)',
  },
  popup: {
    background: 'white', padding: '40px', borderRadius: '16px',
    width: '380px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
  },
  logo: {
    fontSize: '12px', fontWeight: '800', letterSpacing: '3px', color: '#132849',
    textTransform: 'uppercase', marginBottom: '16px',
    borderLeft: '3px solid #FACC15', paddingLeft: '10px',
  },
  title: { fontSize: '22px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 6px' },
  subtitle: { color: '#888', fontSize: '13px', marginBottom: '20px' },
  inputGroup: {
    display: 'flex', alignItems: 'center', border: '1px solid #e0e0e0',
    borderRadius: '8px', padding: '0 12px', backgroundColor: '#fcfcfc', marginBottom: '4px',
  },
};

const styles = {
  container: {
    minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#132849', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    position: 'relative', overflow: 'hidden',
  },
  deco1: { position: 'absolute', top: '8%', left: '5%', fontSize: '80px', opacity: 0.07, color: 'white', userSelect: 'none' },
  deco2: { position: 'absolute', bottom: '10%', right: '4%', fontSize: '100px', opacity: 0.07, color: 'white', userSelect: 'none' },
  deco3: {
    position: 'absolute', top: '50%', left: '50%', fontSize: '200px', opacity: 0.03, color: 'white',
    transform: 'translate(-50%,-50%)', userSelect: 'none'
  },
  card: {
    display: 'flex', width: '750px', minHeight: '480px', backgroundColor: 'white',
    borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', zIndex: 1,
  },
  leftSection: {
    flex: 1.2, padding: '44px 50px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
  },
  logo: {
    fontSize: '12px', fontWeight: '800', letterSpacing: '3px', color: '#132849',
    textTransform: 'uppercase', marginBottom: '22px', borderLeft: '3px solid #FACC15', paddingLeft: '10px',
  },
  title: { fontSize: '26px', fontWeight: '700', color: '#1a1a2e', marginBottom: '4px' },
  subtitle: { color: '#888', marginBottom: '20px', fontSize: '13px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px', display: 'block' },
  inputGroup: {
    display: 'flex', alignItems: 'center', border: '1px solid #e0e0e0',
    borderRadius: '8px', marginBottom: '14px', padding: '0 12px', backgroundColor: '#fcfcfc',
  },
  icon: { marginRight: '8px', fontSize: '16px' },
  eyeBtn: { cursor: 'pointer', fontSize: '16px', padding: '4px', userSelect: 'none' },
  input: {
    flex: 1, border: 'none', outline: 'none', padding: '12px 4px',
    width: '100%', backgroundColor: 'transparent', fontSize: '14px',
    color: '#1a1a2e',                          // ✅ ajoute ça
    WebkitTextFillColor: '#1a1a2e',
  },
  footerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' },
  button: {
    backgroundColor: '#FACC15', color: '#000', border: 'none', padding: '12px 24px',
    borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', transition: '0.2s',
  },
  forgotPass: { fontSize: '13px', color: '#5d5fef', cursor: 'pointer', fontWeight: '500' },

  divider: { display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0 14px' },
  divLine: { flex: 1, height: '1px', backgroundColor: '#e5e7eb' },
  divText: { fontSize: '12px', color: '#aaa', fontWeight: '600' },

  faceIdBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    width: '100%', padding: '12px 16px', borderRadius: '10px',
    border: '2px solid #132849', backgroundColor: 'white', color: '#132849',
    cursor: 'pointer', fontWeight: '700', fontSize: '14px',
    transition: 'all 0.2s', position: 'relative',
  },
  aiBadge: {
    position: 'absolute', right: '14px', backgroundColor: '#FACC15', color: '#000',
    fontSize: '10px', fontWeight: '800', padding: '2px 7px', borderRadius: '20px', letterSpacing: '0.5px',
  },
  faceSpinner: {
    width: '18px', height: '18px', border: '2px solid rgba(19,40,73,0.2)',
    borderTopColor: '#132849', borderRadius: '50%', animation: 'faceIdSpin 0.8s linear infinite',
  },
  faceHint: { fontSize: '12px', color: '#aaa', textAlign: 'center', marginTop: '10px', fontStyle: 'italic' },

  signupHint: {
    margin: '18px 0 8px', fontSize: '13px', color: '#888', textAlign: 'center',
  },
  signupButton: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '2px solid #132849',
    backgroundColor: '#fff',
    color: '#132849',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px',
    transition: '0.2s',
  },

  rightSection: {
    flex: 1, backgroundImage: 'url("/login.png")',
    backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative',
  },
  overlay: {
    position: 'absolute', inset: 0, backgroundColor: 'rgba(19, 40, 73, 0.82)',
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
    alignItems: 'center', padding: '40px', color: 'white', textAlign: 'center',
  },
  rightTitle: { fontSize: '28px', fontWeight: '700', marginBottom: '18px' },
  rightText: { fontSize: '18px', marginBottom: '28px', lineHeight: '1.7', opacity: 0.88 },
  registerButton: {
    backgroundColor: 'transparent', color: 'white', border: '2px solid white',
    padding: '10px 30px', borderRadius: '25px', cursor: 'pointer', fontSize: '15px', fontWeight: '600',
  },

  successBox: {
    backgroundColor: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a',
    borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '14px'
  },
  errorBox: {
    backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626',
    borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '14px'
  },
  errorText: { color: '#ef4444', fontSize: '13px', marginTop: '8px' },
  successText: { color: '#10b981', fontSize: '13px', marginTop: '8px' },

  buttonContainer: { display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '20px' },
  primaryButton: {
    backgroundColor: '#f28c28', color: '#000', border: 'none', padding: '12px 20px',
    borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', flex: 1,
  },
  secondaryButton: {
    backgroundColor: '#f4f4f5', color: '#71717a', border: '1px solid #e4e4e7',
    padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', flex: 1,
  },
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            fontFamily: 'system-ui, sans-serif',
            color: '#64748b',
          }}
        >
          Chargement…
        </div>
      }
    >
      <Login />
    </Suspense>
  );
}