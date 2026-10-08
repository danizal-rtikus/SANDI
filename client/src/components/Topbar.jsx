import React from 'react';
import { 
  Menu, 
  RefreshCw, 
  Moon, 
  Sun, 
  Bell, 
  ShieldCheck, 
  User,
  LogIn,
  LogOut
} from 'lucide-react';

export default function Topbar({ 
  onToggleSidebar, 
  theme, 
  onToggleTheme, 
  userRole, 
  currentUser,
  onOpenLoginModal,
  onLogout,
  onRefresh 
}) {
  const isAdmin = userRole === 'admin';

  return (
    <header className="sirena-topbar">
      <div className="topbar-left">
        <button 
          className="topbar-toggle-btn"
          onClick={onToggleSidebar}
          title="Tutup / Buka Sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="topbar-breadcrumb">
          <span>SANDI</span>
          <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>/</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Navigasi Dokumen Mutu Internal
          </span>
        </div>
      </div>

      <div className="topbar-right">
        {/* Refresh Action */}
        <button 
          className="topbar-icon-action"
          onClick={onRefresh}
          title="Segarkan Halaman"
        >
          <RefreshCw size={17} />
        </button>

        {/* Theme Toggle */}
        <button 
          className="topbar-icon-action"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Notification Bell */}
        <button 
          className="topbar-icon-action"
          title="Notifikasi Sistem"
        >
          <Bell size={17} />
        </button>

        {/* User Auth Profile Widget */}
        {isAdmin ? (
          <div className="topbar-profile-widget" style={{ padding: '0.35rem 0.65rem', gap: '0.65rem' }}>
            <div 
              className="avatar-circle" 
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', color: '#ffffff' }}
              title="Administrator Terautentikasi"
            >
              <ShieldCheck size={16} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="topbar-profile-name" style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={currentUser?.email || 'Admin SPMI'}>
                {currentUser?.email ? currentUser.email.split('@')[0] : 'Administrator'}
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--primary-purple)', fontWeight: 700 }}>
                Role: Admin
              </span>
            </div>
            <button
              onClick={onLogout}
              className="btn-feedback"
              style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem', gap: '0.3rem', marginLeft: '0.25rem', color: '#dc2626' }}
              title="Keluar dari sesi Admin"
            >
              <LogOut size={13} />
              Keluar
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div className="topbar-profile-widget" style={{ padding: '0.35rem 0.65rem', gap: '0.5rem' }}>
              <div className="avatar-circle" style={{ background: '#f1f5f9', color: '#64748b' }}>
                <User size={15} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="topbar-profile-name">
                  User Biasa
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-light)', fontWeight: 600 }}>
                  Akses Baca & Cari
                </span>
              </div>
            </div>

            <button
              onClick={onOpenLoginModal}
              className="btn-purple-primary"
              style={{ padding: '0.42rem 0.85rem', fontSize: '0.8rem', gap: '0.4rem', borderRadius: '8px' }}
              title="Masuk sebagai Administrator untuk mengelola dokumen"
            >
              <LogIn size={14} />
              Masuk Admin
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
