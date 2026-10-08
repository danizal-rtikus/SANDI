import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  X, 
  AlertCircle, 
  Loader2, 
  Eye, 
  EyeOff,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function AdminLoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Mohon lengkapi email dan password.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (error) {
        throw error;
      }

      if (data?.user) {
        onLoginSuccess(data.user);
        onClose();
      } else {
        throw new Error('Gagal mendapatkan sesi pengguna.');
      }
    } catch (err) {
      console.error('Login error:', err);
      let userFriendlyMsg = err.message;
      if (err.message.includes('Invalid login credentials')) {
        userFriendlyMsg = 'Email atau kata sandi tidak cocok. Silakan periksa kembali.';
      } else if (err.message.includes('Email not confirmed')) {
        userFriendlyMsg = 'Email belum dikonfirmasi di Supabase.';
      }
      setErrorMessage(userFriendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pdf-modal-overlay" style={{ zIndex: 1200 }}>
      <div 
        className="sirena-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '2rem',
          position: 'relative',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          borderRadius: '16px',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--text-light)',
            padding: '4px',
            borderRadius: '6px'
          }}
          title="Tutup Modal"
        >
          <X size={20} />
        </button>

        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div 
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              color: '#ffffff',
              boxShadow: '0 8px 16px rgba(124, 58, 237, 0.25)'
            }}
          >
            <ShieldCheck size={28} />
          </div>
          <h2 style={{ fontSize: '1.28rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.4rem 0' }}>
            Masuk Administrator
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-subtle)', margin: 0, lineHeight: 1.45 }}>
            Autentikasi akun Supabase untuk mengaktifkan akses kelola dokumen (unggah, edit, dan hapus).
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div 
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              fontSize: '0.83rem',
              marginBottom: '1.25rem',
              lineHeight: 1.4
            }}
          >
            <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.15rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
              Email Admin
            </label>
            <div style={{ position: 'relative' }}>
              <Mail 
                size={16} 
                color="var(--text-light)" 
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
              />
              <input
                type="email"
                required
                autoFocus
                placeholder="nama@stikom-yos.ac.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="catalog-search-input"
                style={{
                  width: '100%',
                  paddingLeft: '2.4rem',
                  fontSize: '0.88rem',
                  borderRadius: '8px'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
              Kata Sandi
            </label>
            <div style={{ position: 'relative' }}>
              <Lock 
                size={16} 
                color="var(--text-light)" 
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
              />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Masukkan kata sandi..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="catalog-search-input"
                style={{
                  width: '100%',
                  paddingLeft: '2.4rem',
                  paddingRight: '2.4rem',
                  fontSize: '0.88rem',
                  borderRadius: '8px'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-light)',
                  padding: 2
                }}
                title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-feedback"
              style={{ flex: 1, justifyContent: 'center', padding: '0.65rem' }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-purple-primary"
              style={{ 
                flex: 1.5, 
                justifyContent: 'center', 
                padding: '0.65rem',
                opacity: loading ? 0.8 : 1
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Memvalidasi...
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  Masuk sebagai Admin
                </>
              )}
            </button>
          </div>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <span style={{ fontSize: '0.73rem', color: 'var(--text-light)' }}>
            SANDI • Sistem Penjaminan Mutu Internal STIKOM Yos Sudarso
          </span>
        </div>
      </div>
    </div>
  );
}
