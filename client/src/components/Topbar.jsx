import React from 'react';
import { 
  Menu, 
  RefreshCw, 
  Moon, 
  Sun, 
  Bell, 
  ChevronDown, 
  ShieldCheck, 
  UserCheck
} from 'lucide-react';

export default function Topbar({ 
  onToggleSidebar, 
  theme, 
  onToggleTheme, 
  userRole, 
  onRoleChange,
  onRefresh 
}) {
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

        {/* User Profile Widget from Image 2 */}
        <div className="topbar-profile-widget">
          <div className="avatar-circle">
            DF
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="topbar-profile-name">
              Dhany Faizal Rac...
            </span>
            <select 
              value={userRole}
              onChange={(e) => onRoleChange(e.target.value)}
              style={{ 
                border: 'none', 
                background: 'transparent', 
                fontSize: '0.68rem', 
                color: 'var(--primary-purple-text)', 
                fontWeight: 700, 
                outline: 'none', 
                cursor: 'pointer' 
              }}
              title="Ganti Simulasi Peran Pengguna"
            >
              <option value="dosen">Dosen / Tendik</option>
              <option value="asesor">Asesor / Auditor</option>
              <option value="admin_mutu">Admin Mutu (LPM)</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}
