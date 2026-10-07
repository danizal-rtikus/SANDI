import React from 'react';
import { 
  Search, 
  FolderArchive, 
  UploadCloud, 
  BarChart3, 
  Database, 
  Moon, 
  Sun, 
  UserCheck, 
  BookOpenCheck 
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  userRole, 
  setUserRole, 
  theme, 
  toggleTheme,
  supabaseLive 
}) {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <div className="brand-wrapper" onClick={() => setActiveTab('search')}>
          <div className="brand-logo-icon">
            <BookOpenCheck size={24} />
          </div>
          <div className="brand-info">
            <div className="brand-title">
              SANDI
              <span className="brand-badge">RAG 1.0</span>
            </div>
            <div className="brand-subtitle">
              Sistem Arsip & Navigasi Dokumen • STIKOM Yos Sudarso
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-tabs">
          <button 
            className={`nav-tab-btn ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <Search size={16} />
            Pencarian Semantik
          </button>

          <button 
            className={`nav-tab-btn ${activeTab === 'archive' ? 'active' : ''}`}
            onClick={() => setActiveTab('archive')}
          >
            <FolderArchive size={16} />
            Arsip Dokumen
          </button>

          {(userRole === 'admin_mutu' || userRole === 'super_admin') && (
            <button 
              className={`nav-tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <UploadCloud size={16} />
              Unggah & Indeks
            </button>
          )}

          <button 
            className={`nav-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 size={16} />
            Analitik & Audit
          </button>

          <button 
            className={`nav-tab-btn ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            <Database size={16} />
            Supabase
          </button>
        </nav>

        {/* Controls & Role */}
        <div className="nav-controls">
          <div className="role-selector-wrap" title="Simulasi Peran Pengguna">
            <UserCheck size={14} color="var(--brand-primary)" />
            <select 
              className="role-select" 
              value={userRole} 
              onChange={(e) => setUserRole(e.target.value)}
            >
              <option value="dosen">Dosen / Tendik</option>
              <option value="asesor">Asesor / Auditor</option>
              <option value="admin_mutu">Admin Mutu (LPM)</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <button 
            className="btn-icon-control" 
            onClick={toggleTheme} 
            title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </div>
    </header>
  );
}
